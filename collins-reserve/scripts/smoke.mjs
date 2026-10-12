/**
 * End-to-end smoke test against the Vite dev server + live Firebase.
 *
 * Covers: public route rendering, menu → cart → checkout, order placement with
 * live tracking, staff sign-in + queue status change (verified live on the
 * customer's tracking page), and the reservation request flow. Cleans up all
 * test documents via the service account afterwards.
 *
 * Usage:  node scripts/smoke.mjs
 * Requires: .env, seeded data, service account key, local Chrome/Edge.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import { chromium } from 'playwright-core'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
try {
  process.loadEnvFile('.env')
} catch { /* ignore */ }
function env(name) {
  if (process.env[name]) return process.env[name]
  try {
    const m = fs.readFileSync('.env', 'utf8').match(new RegExp(`^${name}=(.*)$`, 'm'))
    if (m) return m[1].trim()
  } catch { /* ignore */ }
  return undefined
}

const PROJECT_ID = env('VITE_FIREBASE_PROJECT_ID')
const SA_PATH = path.join(os.homedir(), '.collins-reserve', 'service-account.json')
const PORT = 5299
const BASE = `http://localhost:${PORT}`

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
]
const executablePath = CHROME_PATHS.find((p) => fs.existsSync(p))
if (!executablePath) throw new Error('No Chrome/Edge found for the smoke test')

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------
let passed = 0
let failed = 0
async function test(name, fn) {
  try {
    await fn()
    passed += 1
    console.log(`  PASS  ${name}`)
  } catch (e) {
    failed += 1
    console.log(`  FAIL  ${name}`)
    console.log(`        ${e.message}`)
  }
}
function expect(cond, msg) {
  if (!cond) throw new Error(msg)
}

// ---------------------------------------------------------------------------
// Dev server
// ---------------------------------------------------------------------------
function startDevServer() {
  const child = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(PORT), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  child.stdout.on('data', () => {})
  child.stderr.on('data', (d) => process.stderr.write(`[vite] ${d}`))
  return child
}

async function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`Dev server did not start at ${url}`)
}

// ---------------------------------------------------------------------------
// Service account helpers (cleanup only)
// ---------------------------------------------------------------------------
function mintSaToken() {
  const sa = JSON.parse(fs.readFileSync(SA_PATH, 'utf8'))
  const now = Math.floor(Date.now() / 1000)
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(unsigned)
  const jwt = `${unsigned}.${sign.sign(sa.private_key).toString('base64url')}`
  return fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(jwt)}`,
  })
    .then((r) => r.json())
    .then((j) => {
      if (!j.access_token) throw new Error(`Token mint failed: ${JSON.stringify(j)}`)
      return j.access_token
    })
}

const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`
const fsAdmin = (token, method, sub, body) =>
  fetch(`${FS_BASE}/${sub}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  }).then((r) => r.status)

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`Smoke test — ${BASE}\n`)
  const vite = startDevServer()
  const cleanup = [] // () => Promise<void>

  let browser
  try {
    await waitForServer(BASE)
    browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] })

    const errors = { customer: [], admin: [] }
    const watch = (page, bucket) => {
      page.on('pageerror', (e) => errors[bucket].push(`pageerror: ${e.message}`))
      page.on('console', (m) => {
        const text = m.text()
        if (m.type() !== 'error') return
        // Benign: IndexedDB lease handoff between tabs of the same context
        // while a persistent Firestore snapshot is in flight.
        if (/Failed to load resource|Failed to obtain primary lease/.test(text)) return
        errors[bucket].push(`console: ${text}`)
      })
    }

    const customerCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })

    // ---------------- Public routes ----------------
    await test('public routes render with headings', async () => {
      const page = await customerCtx.newPage()
      watch(page, 'customer')
      const routes = [
        '/', '/menu', '/story', '/experiences', '/reserve', '/order',
        '/contact', '/privacy', '/terms', '/cancellation-policy', '/admin/login',
      ]
      for (const route of routes) {
        await page.goto(`${BASE}${route}`, { waitUntil: 'domcontentloaded' })
        await page.locator('h1').first().waitFor({ timeout: 15000 })
      }
      await page.close()
    })

    await test('unknown route renders the 404 page', async () => {
      const page = await customerCtx.newPage()
      watch(page, 'customer')
      await page.goto(`${BASE}/definitely-not-a-page`, { waitUntil: 'domcontentloaded' })
      await page.getByText("This table doesn't exist.").waitFor({ timeout: 10000 })
      await page.close()
    })

    await test('home shows the hero and live menu highlights', async () => {
      const page = await customerCtx.newPage()
      watch(page, 'customer')
      await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
      await page.getByRole('heading', { name: /A slower kind/i }).waitFor({ timeout: 15000 })
      await page.close()
    })

    // ---------------- Menu → cart → checkout ----------------
    await test('menu: quick-add from a card updates the cart', async () => {
      const page = await customerCtx.newPage()
      watch(page, 'customer')
      await page.goto(`${BASE}/menu`, { waitUntil: 'domcontentloaded' })
      await page.locator('main li h3').first().waitFor({ timeout: 15000 })
      await page.locator('main li button[aria-label^="Add "]:not([disabled])').first().click()
      await page.getByRole('button', { name: /Open cart, [1-9]/ }).waitFor({ timeout: 10000 })
      await page.close()
    })

    await test('cart drawer leads to checkout', async () => {
      const page = await customerCtx.newPage()
      watch(page, 'customer')
      await page.goto(`${BASE}/menu`, { waitUntil: 'domcontentloaded' })
      await page.getByRole('button', { name: /Open cart, [1-9]/ }).click()
      await page.getByRole('link', { name: 'Continue to checkout' }).click()
      await page.waitForURL('**/order', { timeout: 10000 })
      await page.locator('input[name="name"]').waitFor({ timeout: 15000 })
      await page.close()
    })

    // ---------------- Order placement ----------------
    let orderRef = null
    let trackingPage = null
    await test('order is placed and lands on live tracking as Received', async () => {
      const page = await customerCtx.newPage()
      watch(page, 'customer')
      await page.goto(`${BASE}/order`, { waitUntil: 'domcontentloaded' })
      await page.locator('input[name="name"]').waitFor({ timeout: 15000 })
      await page.locator('input[name="name"]').fill('Smoke Tester')
      await page.locator('input[name="phone"]').fill('0712345678')
      await page.locator('input[name="email"]').fill('smoke@example.com')
      await page.getByRole('button', { name: /^Place order/ }).click()
      await page.getByText('The kitchen has your order.').waitFor({ timeout: 20000 })
      await page.waitForURL(/\/order\/MN-\d{6}/, { timeout: 20000 })
      orderRef = page.url().match(/MN-\d{6}/)[0]
      await page.getByText(`Order status: Received`).waitFor({ timeout: 15000 })
      trackingPage = page // keep open for the live-update assertion
    })

    // ---------------- Staff console ----------------
    await test('staff signs in with the demo credentials', async () => {
      const page = await adminCtx.newPage()
      watch(page, 'admin')
      await page.goto(`${BASE}/admin/login`, { waitUntil: 'domcontentloaded' })
      await page.getByRole('button', { name: /Use demo credentials/ }).click()
      await page.getByRole('button', { name: 'Sign in', exact: true }).click()
      await page.waitForURL('**/admin', { timeout: 20000 })
      await page.getByRole('heading', { name: 'Overview' }).waitFor({ timeout: 20000 })
      await page.close()
    })

    await test('queue: staff accepts the order', async () => {
      expect(orderRef, 'order was not placed')
      const page = await adminCtx.newPage()
      watch(page, 'admin')
      await page.goto(`${BASE}/admin/orders`, { waitUntil: 'domcontentloaded' })
      await page.locator('input[placeholder*="Reference"]').fill(orderRef)
      const row = page.locator('li').filter({ hasText: orderRef }).first()
      await row.waitFor({ timeout: 15000 })
      // Non-destructive actions apply immediately (the confirm dialog is only
      // used for reject/cancel, which require a reason).
      await row.getByRole('button', { name: 'Accept', exact: true }).click()
      await row.getByText('Accepted').waitFor({ timeout: 15000 })
      await page.close()
    })

    await test('customer tracking page updates live to Accepted', async () => {
      expect(trackingPage, 'tracking page not open')
      await trackingPage.getByText('Order status: Accepted').waitFor({ timeout: 20000 })
      await trackingPage.close()
    })

    // ---------------- Reservations ----------------
    await test('reservation: full booking request reaches pending confirmation', async () => {
      const page = await customerCtx.newPage()
      watch(page, 'customer')
      await page.goto(`${BASE}/reserve`, { waitUntil: 'domcontentloaded' })

      // Pick the next bookable day that is not a Monday (restaurant closes Mondays).
      const d = new Date()
      do {
        d.setDate(d.getDate() + 1)
      } while (d.getDay() === 1)
      const dateStr = d.toISOString().slice(0, 10)

      await page.locator('input[type="date"]').waitFor({ timeout: 15000 })
      await page.locator('input[type="date"]').fill(dateStr)
      await page.getByRole('button', { name: /Check available times/ }).click()

      // Availability is a network read; retry once if a transient connection
      // error surfaces the step-1 alert instead of advancing.
      try {
        await page.locator('[aria-current="step"]').filter({ hasText: 'Time' }).waitFor({ timeout: 15000 })
      } catch {
        const retry = page.getByRole('button', { name: /Check available times/ })
        if (await retry.count()) await retry.click({ timeout: 5000 }).catch(() => {})
        await page.locator('[aria-current="step"]').filter({ hasText: 'Time' }).waitFor({ timeout: 30000 })
      }
      const slot = page.locator('button[aria-pressed]:not([disabled])').first()
      await slot.waitFor({ timeout: 20000 })
      await slot.click()
      await page.getByRole('button', { name: /Continue/ }).first().click({ timeout: 15000 })

      await page.locator('input[name="name"]').waitFor({ timeout: 10000 })
      await page.locator('input[name="name"]').fill('Smoke Tester')
      await page.locator('input[name="phone"]').fill('0712345678')
      await page.locator('input[name="email"]').fill('smoke@example.com')
      await page.locator('input[name="terms"]').check()
      await page.getByRole('button', { name: /Request this table/ }).click()

      await page.getByText('Request received').waitFor({ timeout: 20000 })
      await page.close()
    })

    // ---------------- Console health ----------------
    await test('no uncaught page errors on customer flows', async () => {
      expect(errors.customer.length === 0, errors.customer.slice(0, 5).join(' | '))
    })
    await test('no uncaught page errors on admin flows', async () => {
      expect(errors.admin.length === 0, errors.admin.slice(0, 5).join(' | '))
    })

    // ---------------- Cleanup ----------------
    console.log('\nCleanup:')
    const saTok = await mintSaToken()
    if (orderRef) {
      const s = await fsAdmin(saTok, 'DELETE', `orders/${orderRef}`)
      console.log(`  ${s === 200 ? 'removed' : `leave (${s})`} orders/${orderRef}`)
    }

    // Reservations made by this run (matched by the smoke guest email).
    const resList = await fetch(`${FS_BASE}:runQuery`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${saTok}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'reservations' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'guestEmail' },
              op: 'EQUAL',
              value: { stringValue: 'smoke@example.com' },
            },
          },
          limit: 20,
        },
      }),
    }).then((r) => (r.ok ? r.json() : []))
    for (const row of resList) {
      if (!row.document) continue
      const doc = row.document
      const id = doc.name.split('/').pop()
      const sid = doc.fields?.slotId?.stringValue
      const partySize = Number(doc.fields?.partySize?.integerValue ?? '1')
      const s = await fsAdmin(saTok, 'DELETE', `reservations/${id}`)
      console.log(`  ${s === 200 ? 'removed' : `leave (${s})`} reservations/${id}`)
      if (sid) {
        const slotRes = await fetch(`${FS_BASE}/reservationSlots/${sid}`, {
          headers: { Authorization: `Bearer ${saTok}` },
        })
        if (slotRes.ok) {
          const slotDoc = await slotRes.json()
          const taken = Number(slotDoc.fields?.taken?.integerValue ?? '0')
          const next = Math.max(0, taken - partySize)
          const st = await fetch(
            `${FS_BASE}/reservationSlots/${sid}?updateMask.fieldPaths=taken&updateMask.fieldPaths=updatedAt`,
            {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${saTok}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fields: {
                  taken: { integerValue: String(next) },
                  updatedAt: { integerValue: String(Date.now()) },
                },
              }),
            },
          ).then((r) => r.status)
          console.log(`  ${st === 200 ? 'restored' : `leave (${st})`} slots/${sid} taken ${taken} -> ${next}`)
        }
      }
    }
    for (const fn of cleanup) await fn()

    console.log(`\n${passed} passed, ${failed} failed`)
    process.exitCode = failed > 0 ? 1 : 0
  } finally {
    if (browser) await browser.close().catch(() => {})
    vite.kill()
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((e) => {
    console.error('FATAL:', e)
    process.exit(1)
  })
