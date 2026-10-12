/**
 * Live Firestore Security Rules smoke test.
 *
 * Exercises the DEPLOYED rules exactly as a customer browser would: writes are
 * authenticated with an ordinary (non-staff) Firebase Auth identity obtained
 * from Identity Toolkit, so Firestore evaluates every rule in firestore.rules.
 * The service account is used only to read menu/settings data and to clean up
 * afterwards (Admin-level, bypasses rules).
 *
 * Usage:  node scripts/verify-rules.mjs
 *
 * Requires:
 *  - .env with VITE_FIREBASE_API_KEY / VITE_FIREBASE_PROJECT_ID
 *  - service account key at ~/.collins-reserve/service-account.json
 *  - seeded data (node scripts/seed.mjs) and deployed rules (firebase deploy
 *    --only firestore:rules)
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
try {
  process.loadEnvFile('.env')
} catch {
  /* older Node: fall through to manual parse below */
}
function env(name) {
  if (process.env[name]) return process.env[name]
  try {
    const raw = fs.readFileSync('.env', 'utf8')
    const m = raw.match(new RegExp(`^${name}=(.*)$`, 'm'))
    if (m) return m[1].trim()
  } catch { /* ignore */ }
  return undefined
}

const PROJECT_ID = env('VITE_FIREBASE_PROJECT_ID')
const API_KEY = env('VITE_FIREBASE_API_KEY')
const RESTAURANT_ID = env('VITE_RESTAURANT_ID') || 'maison-noir'
const SA_PATH = path.join(os.homedir(), '.collins-reserve', 'service-account.json')
const TEST_EMAIL = `rules-smoke+${Date.now()}@example.com`
const TEST_PASSWORD = 'RulesSmoke2026!'
const ADMIN_EMAIL = 'admin@maisonnoir.demo'
const ADMIN_PASSWORD = 'MaisonNoir2026!'

if (!PROJECT_ID || !API_KEY) {
  console.error('Missing VITE_FIREBASE_PROJECT_ID / VITE_FIREBASE_API_KEY in .env')
  process.exit(1)
}
if (!fs.existsSync(SA_PATH)) {
  console.error(`Missing service account key at ${SA_PATH}`)
  process.exit(1)
}

const FS_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`
const IDP = 'https://identitytoolkit.googleapis.com/v1'

// ---------------------------------------------------------------------------
// Field encoding (JS <-> Firestore REST values)
// ---------------------------------------------------------------------------
function enc(v) {
  if (v === null) return { nullValue: null }
  if (Array.isArray(v)) return { arrayValue: { values: v.map(enc) } }
  if (v instanceof Date) return { timestampValue: v.toISOString() }
  if (typeof v === 'object') {
    if ('$ts' in v) return { timestampValue: v.$ts }
    const fields = {}
    for (const [k, val] of Object.entries(v)) {
      if (val !== undefined) fields[k] = enc(val)
    }
    return { mapValue: { fields } }
  }
  if (typeof v === 'boolean') return { booleanValue: v }
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
  }
  return { stringValue: String(v) }
}

function dec(f) {
  if (!f) return null
  if ('stringValue' in f) return f.stringValue
  if ('integerValue' in f) return Number(f.integerValue)
  if ('doubleValue' in f) return f.doubleValue
  if ('booleanValue' in f) return f.booleanValue
  if ('nullValue' in f) return null
  if ('timestampValue' in f) return { $ts: f.timestampValue }
  if ('arrayValue' in f) return (f.arrayValue.values ?? []).map(dec)
  if ('mapValue' in f) {
    const out = {}
    for (const [k, v] of Object.entries(f.mapValue.fields ?? {})) out[k] = dec(v)
    return out
  }
  return f
}

function decodeDoc(json) {
  const out = {}
  for (const [k, v] of Object.entries(json.fields ?? {})) out[k] = dec(v)
  return out
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------
async function req(url, { method = 'GET', token, body } = {}) {
  const res = await fetch(url, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  let json = null
  try {
    json = await res.json()
  } catch { /* empty body */ }
  return { status: res.status, json }
}

// ---------------------------------------------------------------------------
// Service account token (Admin-level: reads + cleanup only)
// ---------------------------------------------------------------------------
function mintServiceAccountToken(scopes) {
  const sa = JSON.parse(fs.readFileSync(SA_PATH, 'utf8'))
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const claims = {
    iss: sa.client_email,
    scope: scopes.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const unsigned = `${b64(header)}.${b64(claims)}`
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(unsigned)
  const signature = sign.sign(sa.private_key).toString('base64url')
  const jwt = `${unsigned}.${signature}`
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

// ---------------------------------------------------------------------------
// Identity Toolkit (ordinary customer identity + staff sign-in)
// ---------------------------------------------------------------------------
async function idp(method, body) {
  const res = await req(`${IDP}/${method}?key=${API_KEY}`, { method: 'POST', body })
  if (res.status !== 200) {
    throw new Error(`${method} failed (${res.status}): ${res.json?.error?.message ?? 'unknown'}`)
  }
  return res.json
}

const signUp = (email, password) =>
  idp('accounts:signUp', { email, password, returnSecureToken: true })
const signIn = (email, password) =>
  idp('accounts:signInWithPassword', { email, password, returnSecureToken: true })
const deleteSelf = (idToken) => idp('accounts:delete', { idToken })

// ---------------------------------------------------------------------------
// Firestore REST (rules applied for customer/staff ID tokens)
// ---------------------------------------------------------------------------
const fsGet = (token, coll, id) => req(`${FS_BASE}/${coll}/${id}`, { token })
const fsList = (token, coll, query = '') =>
  req(`${FS_BASE}/${coll}${query}`, { token })
const fsCreate = (token, coll, id, data) =>
  req(`${FS_BASE}/${coll}?documentId=${id}`, {
    method: 'POST',
    token,
    body: { fields: mapEnc(data) },
  })
const fsPatch = (token, coll, id, data) =>
  req(`${FS_BASE}/${coll}/${id}`, { method: 'PATCH', token, body: { fields: mapEnc(data) } })
const fsDelete = (token, coll, id) => req(`${FS_BASE}/${coll}/${id}`, { method: 'DELETE', token })

function mapEnc(obj) {
  const fields = {}
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) fields[k] = enc(v)
  }
  return fields
}

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

function isPermissionDenied(res) {
  return res.status === 403 && res.json?.error?.status === 'PERMISSION_DENIED'
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`Rules smoke test — project ${PROJECT_ID}\n`)

  const [adminTok, saTok] = await Promise.all([
    signIn(ADMIN_EMAIL, ADMIN_PASSWORD).then((r) => r.idToken),
    mintServiceAccountToken(['https://www.googleapis.com/auth/datastore']),
  ])
  const customer = await signUp(TEST_EMAIL, TEST_PASSWORD)
  const custTok = customer.idToken
  console.log('Signed in: admin (staff), new customer (non-staff), service account\n')

  // Live data needed to build a rules-valid order
  const settingsRes = await fsGet(saTok, 'settings', RESTAURANT_ID)
  expect(settingsRes.status === 200, `Cannot read settings (${settingsRes.status})`)
  const settings = decodeDoc(settingsRes.json)
  const itemsRes = await fsList(saTok, 'menuItems', '?pageSize=200')
  expect(itemsRes.status === 200, `Cannot list menuItems (${itemsRes.status})`)
  const items = (itemsRes.json.documents ?? [])
    .map(decodeDoc)
    .filter((i) => i.restaurantId === RESTAURANT_ID && i.available === true)
  expect(items.length > 0, 'No available menu items')

  const useDelivery = settings.acceptPickup !== true
  const type = useDelivery ? 'delivery' : 'pickup'
  console.log(
    `Settings: pickup=${settings.acceptPickup} delivery=${settings.acceptDelivery} ` +
      `serviceCharge=${settings.serviceChargePercent}% deliveryFee=${settings.deliveryFeeKes} ` +
      `freeOver=${settings.freeDeliveryOverKes} — order type under test: ${type}\n`,
  )

  // Build lines the same way createOrder does
  const lines = items.slice(0, 2).map((item) => {
    const variant = (item.variants ?? []).length > 0 ? item.variants[0] : null
    const addon = (item.addons ?? []).length > 0 ? item.addons[0] : null
    const unit = item.priceKes + (variant ? variant.priceDeltaKes : 0)
    const addons = addon ? [{ id: addon.id, name: addon.name, priceKes: addon.priceKes }] : []
    const addonsTotal = addons.reduce((s, a) => s + a.priceKes, 0)
    return {
      itemId: item.id,
      name: item.name,
      unitPriceKes: unit,
      quantity: 1,
      variantId: variant ? variant.id : null,
      variantName: variant ? variant.name : null,
      addons,
      lineTotalKes: (unit + addonsTotal) * 1,
    }
  })

  const subtotal = lines.reduce((s, l) => s + l.lineTotalKes, 0)
  const itemCount = lines.reduce((s, l) => s + l.quantity, 0)
  const fee = useDelivery
    ? settings.freeDeliveryOverKes != null && subtotal >= settings.freeDeliveryOverKes
      ? 0
      : settings.deliveryFeeKes
    : 0
  const svc = Math.round((subtotal * settings.serviceChargePercent) / 100)
  const total = subtotal + fee + svc

  const now = Date.now()
  const orderRef = `MN-${Math.floor(100000 + Math.random() * 900000)}`
  const order = {
    id: orderRef,
    reference: orderRef,
    restaurantId: RESTAURANT_ID,
    type,
    items: lines,
    itemCount,
    subtotalKes: subtotal,
    deliveryFeeKes: fee,
    serviceChargeKes: svc,
    totalKes: total,
    customer: { name: 'Rules Smoke', phone: '0712345678', email: TEST_EMAIL },
    delivery: useDelivery ? { address: '5 test lane', area: 'Kilimani', notes: '' } : null,
    paymentMethod: 'pay_on_collection',
    status: 'received',
    cancelReason: null,
    timeline: [{ status: 'received', at: now }],
    statusUpdatedAt: now,
    createdAt: now,
    updatedAt: now,
    createdAtTs: { $ts: new Date(now).toISOString() },
  }

  // ---------------- Order creation ----------------
  await test('order: tampered subtotal is rejected (rules recompute totals)', async () => {
    const bad = structuredClone(order)
    bad.subtotalKes = subtotal + 1000
    bad.totalKes = total + 1000
    const res = await fsCreate(custTok, 'orders', orderRef, bad)
    expect(isPermissionDenied(res), `Expected PERMISSION_DENIED, got ${res.status}: ${JSON.stringify(res.json)}`)
  })

  await test('order: valid unauthenticated-style creation passes (svc division parity)', async () => {
    const res = await fsCreate(custTok, 'orders', orderRef, order)
    expect(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.json)}`)
  })

  await test('order: full reference is publicly readable (accountless tracking)', async () => {
    const res = await fsGet(custTok, 'orders', orderRef)
    expect(res.status === 200, `Expected 200, got ${res.status}`)
    expect(res.json.name?.endsWith(`/orders/${orderRef}`), 'Wrong document returned')
  })

  await test('order: customers cannot list the orders collection', async () => {
    const res = await fsList(custTok, 'orders', '?pageSize=5')
    expect(isPermissionDenied(res), `Expected PERMISSION_DENIED, got ${res.status}`)
  })

  await test('order: customers cannot change status', async () => {
    const res = await fsPatch(custTok, 'orders', orderRef, { ...order, status: 'accepted' })
    expect(isPermissionDenied(res), `Expected PERMISSION_DENIED, got ${res.status}`)
  })

  // ---------------- Staff status transitions ----------------
  await test('order: staff may move received -> accepted (field-restricted update)', async () => {
    const current = await fsGet(adminTok, 'orders', orderRef)
    expect(current.status === 200, `Read failed: ${current.status}`)
    const doc = decodeDoc(current.json)
    const at = Date.now() + 1000
    const updated = {
      ...doc,
      status: 'accepted',
      statusUpdatedAt: at,
      updatedAt: at,
      timeline: [...doc.timeline, { status: 'accepted', at }],
    }
    const res = await fsPatch(adminTok, 'orders', orderRef, updated)
    expect(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.json)}`)
  })

  await test('order: staff cannot jump accepted -> completed (transition table)', async () => {
    const current = await fsGet(adminTok, 'orders', orderRef)
    const doc = decodeDoc(current.json)
    const at = Date.now() + 2000
    const updated = {
      ...doc,
      status: 'completed',
      statusUpdatedAt: at,
      updatedAt: at,
      timeline: [...doc.timeline, { status: 'completed', at }],
    }
    const res = await fsPatch(adminTok, 'orders', orderRef, updated)
    expect(isPermissionDenied(res), `Expected PERMISSION_DENIED, got ${res.status}: ${JSON.stringify(res.json)}`)
  })

  // ---------------- Reservations ----------------
  const resRef = `MN-R${Math.floor(100000 + Math.random() * 900000)}`
  const date = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const time = '19:30'
  const slotId = `${date}--${time}`
  const reservation = {
    id: resRef,
    restaurantId: RESTAURANT_ID,
    status: 'pending',
    termsAccepted: true,
    guestName: 'Rules Smoke',
    guestPhone: '0712345678',
    guestEmail: TEST_EMAIL,
    partySize: 2,
    date,
    time,
    slotId,
    seatingPreference: 'any',
    notes: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  await test('reservation: oversized party is rejected', async () => {
    const bad = structuredClone(reservation)
    bad.partySize = 99
    const res = await fsCreate(custTok, 'reservations', resRef, bad)
    expect(isPermissionDenied(res), `Expected PERMISSION_DENIED, got ${res.status}: ${JSON.stringify(res.json)}`)
  })

  await test('reservation: valid booking request passes', async () => {
    const res = await fsCreate(custTok, 'reservations', resRef, reservation)
    expect(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.json)}`)
  })

  // ---------------- Slot capacity lock ----------------
  const slot = {
    restaurantId: RESTAURANT_ID,
    date,
    time,
    capacity: 12,
    taken: 3,
    updatedAt: Date.now(),
  }

  await test('slot: public may create a slot doc', async () => {
    const res = await fsCreate(custTok, 'reservationSlots', slotId, slot)
    expect(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(res.json)}`)
  })

  await test('slot: public booking may only increase taken', async () => {
    const up = await fsPatch(custTok, 'reservationSlots', slotId, {
      ...slot,
      taken: 4,
      updatedAt: Date.now() + 1,
    })
    expect(up.status === 200, `Increase failed: ${up.status}: ${JSON.stringify(up.json)}`)
    const down = await fsPatch(custTok, 'reservationSlots', slotId, {
      ...slot,
      taken: 2,
      updatedAt: Date.now() + 2,
    })
    expect(isPermissionDenied(down), `Expected PERMISSION_DENIED, got ${down.status}: ${JSON.stringify(down.json)}`)
  })

  // ---------------- Cleanup ----------------
  console.log('\nCleanup:')
  for (const [coll, id] of [
    ['orders', orderRef],
    ['reservations', resRef],
    ['reservationSlots', slotId],
  ]) {
    const res = await fsDelete(saTok, coll, id)
    console.log(`  ${res.status === 200 ? 'removed' : `leave (status ${res.status})`} ${coll}/${id}`)
  }
  await deleteSelf(custTok)
  console.log('  removed test customer account')

  console.log(`\n${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
