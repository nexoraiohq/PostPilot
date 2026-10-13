import admin from 'firebase-admin'
import express from 'express'
import type { Request, Response } from 'express'
import { randomBytes } from 'node:crypto'

const logger = {
  error: (...args: unknown[]) => console.error(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  info: (...args: unknown[]) => console.info(...args),
}

if (admin.apps.length === 0) {
  const rt = process.env.FIREBASE_REFRESH_TOKEN
  if (rt) {
    admin.initializeApp({
      credential: admin.credential.refreshToken({
        type: 'authorized_user',
        client_id: process.env.FIREBASE_CLIENT_ID ?? '',
        client_secret: process.env.FIREBASE_CLIENT_SECRET ?? '',
        refresh_token: rt,
      }),
      ...(process.env.FIREBASE_STORAGE_BUCKET
        ? { storageBucket: process.env.FIREBASE_STORAGE_BUCKET }
        : {}),
    })
  } else {
    admin.initializeApp()
  }
}
const db = admin.firestore()

const API_KEY = process.env.API_KEY ?? ''
const REDIRECT_URI =
  process.env.REDIRECT_URI ?? 'https://postpilot-x7k9m2q4.vercel.app/api/tiktok/callback'
const DASHBOARD_URL = process.env.DASHBOARD_URL ?? 'https://postpilot-x7k9m2q4.vercel.app'

const TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/'
const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/'
const TIKTOK_VIDEO_INIT = 'https://open.tiktokapis.com/v2/post/publish/video/init/'
const TIKTOK_PHOTO_INIT = 'https://open.tiktokapis.com/v2/post/publish/photo/init/'
const TIKTOK_STATUS = 'https://open.tiktokapis.com/v2/post/publish/status/fetch/'
const TIKTOK_USER_INFO = 'https://open.tiktokapis.com/v2/user/info/'
const TIKTOK_SCOPES = 'user.info.basic video.upload video.publish'
const PRIVACY_LEVELS = [
  'SELF_ONLY',
  'MUTUAL_FOLLOW_FRIENDS',
  'FOLLOWER_OF_CREATOR',
  'PUBLIC_TO_EVERYONE',
] as const

type TikTokSettings = {
  clientKey: string
  clientSecret: string
  privacyLevel: string
  accessToken: string
  accessTokenExpiresAt: string
  refreshToken: string
  openId: string
  displayName: string
  grantedScope: string
  connected: boolean
  oauthState: string
  oauthStateExpiresAt: string
}

type ContentDoc = {
  title: string
  caption: string
  hashtags: string[]
  mediaUrl: string
  mediaType: 'video' | 'image'
  platforms: { tiktok: boolean; whatsapp: boolean }
  state: 'draft' | 'scheduled' | 'posting' | 'posted' | 'failed'
  scheduleAt: string | null
  results: {
    tiktok?: { status: string; publishId?: string; error?: string; updatedAt: string }
    whatsapp?: { status: string; updatedAt: string }
  }
  log: { t: string; msg: string }[]
  createdAt: string
  updatedAt: string
}

/* ---------------- helpers ---------------- */

const nowIso = () => new Date().toISOString()

function fail(res: Response, status: number, error: string, message?: string) {
  return res.status(status).json({ error, message: message ?? error })
}

function h(fn: (req: Request, res: Response) => Promise<unknown> | unknown) {
  return async (req: Request, res: Response) => {
    try {
      await fn(req, res)
    } catch (err) {
      logger.error('handler error', err)
      if (!res.headersSent) fail(res, 500, 'internal', err instanceof Error ? err.message : 'unknown')
    }
  }
}

function fullCaption(c: ContentDoc) {
  const tags = c.hashtags
    .map((t) => (t.startsWith('#') ? t : `#${t}`))
    .join(' ')
  return [c.caption, tags].filter(Boolean).join('\n').slice(0, 2200)
}

async function getSettings(): Promise<TikTokSettings> {
  const snap = await db.doc('settings/tiktok').get()
  const d = (snap.data() ?? {}) as Partial<TikTokSettings>
  return {
    clientKey: d.clientKey ?? '',
    clientSecret: d.clientSecret ?? '',
    privacyLevel: d.privacyLevel ?? 'SELF_ONLY',
    accessToken: d.accessToken ?? '',
    accessTokenExpiresAt: d.accessTokenExpiresAt ?? '',
    refreshToken: d.refreshToken ?? '',
    openId: d.openId ?? '',
    displayName: d.displayName ?? '',
    grantedScope: d.grantedScope ?? '',
    connected: d.connected ?? false,
    oauthState: d.oauthState ?? '',
    oauthStateExpiresAt: d.oauthStateExpiresAt ?? '',
  }
}

async function saveSettings(patch: Partial<TikTokSettings>) {
  await db.doc('settings/tiktok').set(patch, { merge: true })
}

async function refreshAccessToken(settings: TikTokSettings): Promise<string> {
  const expiresAt = settings.accessTokenExpiresAt
    ? Date.parse(settings.accessTokenExpiresAt)
    : 0
  if (expiresAt - Date.now() > 5 * 60_000 && settings.accessToken) return settings.accessToken
  if (!settings.refreshToken) throw new Error('tiktok_not_connected')

  const body = new URLSearchParams({
    client_id: settings.clientKey,
    client_secret: settings.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: settings.refreshToken,
  })
  const res = await fetch(TIKTOK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = (await res.json()) as Record<string, unknown>
  if (json.error_code !== undefined && json.error_code !== 0) {
    await saveSettings({ connected: false })
    throw new Error(`tiktok_refresh_failed: ${json.error_code} ${json.error_description ?? ''}`)
  }
  const token = String(json.access_token ?? '')
  const refreshToken = String(json.refresh_token ?? settings.refreshToken)
  const expiresIn = Number(json.expires_in ?? 86400)
  await saveSettings({
    accessToken: token,
    refreshToken,
    accessTokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    connected: true,
  })
  return token
}

async function appendLog(id: string, msg: string) {
  await db.doc(`content/${id}`).update({
    log: admin.firestore.FieldValue.arrayUnion({ t: nowIso(), msg }),
    updatedAt: nowIso(),
  })
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/* ---------------- TikTok publish ---------------- */

async function tiktokStatusFetch(token: string, publishId: string): Promise<Record<string, unknown>> {
  const res = await fetch(TIKTOK_STATUS, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ publish_id: publishId }),
  })
  return (await res.json()) as Record<string, unknown>
}

async function publishContent(id: string): Promise<void> {
  const ref = db.doc(`content/${id}`)
  const snap = await ref.get()
  if (!snap.exists) throw new Error('content_not_found')
  const c = snap.data() as ContentDoc

  if (!c.platforms?.tiktok) throw new Error('tiktok_disabled_for_content')
  if (!c.mediaUrl) throw new Error('no_media_url')

  const settings = await getSettings()
  if (!settings.clientKey || !settings.clientSecret) throw new Error('tiktok_keys_missing')
  if (!settings.connected || !settings.refreshToken) throw new Error('tiktok_not_connected')

  await ref.update({ state: 'posting', updatedAt: nowIso(), 'results.tiktok': { status: 'posting', updatedAt: nowIso() } })
  await appendLog(id, 'TikTok publish started')

  try {
    const token = await refreshAccessToken(settings)
    const title = fullCaption(c)
    const privacy = PRIVACY_LEVELS.includes(settings.privacyLevel as never)
      ? settings.privacyLevel
      : 'SELF_ONLY'

    let publishId: string

    if (c.mediaType === 'image') {
      const initRes = await fetch(TIKTOK_PHOTO_INIT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_info: {
            title,
            privacy_level: privacy,
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
          },
          source_info: { source: 'PULL_FROM_URL', image_urls: [c.mediaUrl] },
        }),
      })
      const initJson = (await initRes.json()) as Record<string, any>
      const code = initJson?.error?.code ?? initJson?.error_code
      if (code && code !== 'ok' && code !== 0) {
        throw new Error(`photo_init_failed: ${code} ${initJson?.error?.message ?? ''}`)
      }
      publishId = initJson?.data?.publish_id
      if (!publishId) throw new Error('photo_init_no_publish_id')
      await appendLog(id, `Photo post accepted (${publishId})`)
    } else {
      const mediaRes = await fetch(c.mediaUrl, { redirect: 'follow' })
      if (!mediaRes.ok) throw new Error(`media_fetch_failed: ${mediaRes.status}`)
      const contentType = mediaRes.headers.get('content-type') ?? 'video/mp4'
      const buffer = Buffer.from(await mediaRes.arrayBuffer())
      const size = buffer.length
      if (size > 200 * 1024 * 1024) throw new Error('video_too_large_max_200mb')

      const maxChunks = 30
      const chunkSize = Math.max(Math.ceil(size / maxChunks), 1)
      const totalChunks = Math.max(Math.ceil(size / chunkSize), 1)

      const initRes = await fetch(TIKTOK_VIDEO_INIT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_info: {
            title,
            privacy_level: privacy,
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
            video_cover_timestamp_ms: 1000,
          },
          source_info: {
            source: 'FILE_UPLOAD',
            video_size: size,
            chunk_size: chunkSize,
            total_chunk_count: totalChunks,
          },
        }),
      })
      const initJson = (await initRes.json()) as Record<string, any>
      const code = initJson?.error?.code ?? initJson?.error_code
      if (code && code !== 'ok' && code !== 0) {
        throw new Error(`video_init_failed: ${code} ${initJson?.error?.message ?? ''}`)
      }
      publishId = initJson?.data?.publish_id
      const uploadUrl = initJson?.data?.upload_url
      if (!publishId || !uploadUrl) throw new Error('video_init_failed: missing publish_id/upload_url')
      await appendLog(id, `Upload session opened (${publishId}), sending ${totalChunks} chunk(s)`)

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize
        const end = Math.min(start + chunkSize, size) - 1
        const chunk = buffer.subarray(start, end + 1)
        const putRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': contentType,
            'Content-Range': `bytes ${start}-${end}/${size}`,
          },
          body: chunk,
        })
        if (!putRes.ok && putRes.status !== 206) {
          const detail = await putRes.text().catch(() => '')
          throw new Error(`chunk_upload_failed: ${putRes.status} ${detail.slice(0, 200)}`)
        }
      }
      await appendLog(id, 'Video bytes uploaded, processing')
    }

    // Poll processing status a few times
    let finalStatus = 'PROCESSING_UPLOAD'
    for (let attempt = 0; attempt < 8; attempt++) {
      const statusJson = (await tiktokStatusFetch(token, publishId)) as Record<string, any>
      const status = statusJson?.data?.status ?? statusJson?.error?.code
      finalStatus = String(status ?? 'UNKNOWN')
      if (finalStatus === 'PUBLISH_COMPLETE') break
      if (finalStatus === 'SEND_TO_USER_FAILED') {
        const reason = statusJson?.data?.fail_reason ?? 'send failed'
        throw new Error(`tiktok_send_failed: ${reason}`)
      }
      await sleep(2500)
    }

    const success = finalStatus === 'PUBLISH_COMPLETE'
    await ref.update({
      state: success ? 'posted' : 'posting',
      updatedAt: nowIso(),
      'results.tiktok': {
        status: success ? 'posted' : finalStatus,
        publishId,
        ...(success ? {} : { error: 'still processing — refresh status later' }),
        updatedAt: nowIso(),
      },
    })
    await appendLog(id, success ? `Posted to TikTok (${finalStatus})` : `TikTok status: ${finalStatus}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('publish failed', message)
    await ref.update({
      state: 'failed',
      updatedAt: nowIso(),
      'results.tiktok': { status: 'failed', error: message, updatedAt: nowIso() },
    })
    await appendLog(id, `Failed: ${message}`)
    throw err
  }
}

async function pollPublishing(id: string): Promise<string> {
  const ref = db.doc(`content/${id}`)
  const c = (await ref.get()).data() as ContentDoc
  const publishId = c.results?.tiktok?.publishId
  if (!publishId) return 'no_publish_id'
  const settings = await getSettings()
  const token = await refreshAccessToken(settings)
  const statusJson = (await tiktokStatusFetch(token, publishId)) as Record<string, any>
  const status = String(statusJson?.data?.status ?? 'UNKNOWN')
  const success = status === 'PUBLISH_COMPLETE'
  await ref.update({
    ...(success ? { state: 'posted' } : {}),
    updatedAt: nowIso(),
    'results.tiktok': {
      status: success ? 'posted' : status,
      publishId,
      ...(success ? {} : { error: 'still processing' }),
      updatedAt: nowIso(),
    },
  })
  await appendLog(id, `Status poll: ${status}`)
  return status
}

/* ---------------- scheduler ---------------- */

async function runDue(): Promise<{ published: number; polled: number; errors: number }> {
  let published = 0
  let polled = 0
  let errors = 0

  const scheduled = await db
    .collection('content')
    .where('state', '==', 'scheduled')
    .limit(25)
    .get()
  const now = nowIso()
  for (const doc of scheduled.docs) {
    const c = doc.data() as ContentDoc
    if (c.scheduleAt && c.scheduleAt <= now) {
      try {
        await publishContent(doc.id)
        published++
      } catch {
        errors++
      }
    }
  }

  const posting = await db.collection('content').where('state', '==', 'posting').limit(25).get()
  for (const doc of posting.docs) {
    try {
      await pollPublishing(doc.id)
      polled++
    } catch {
      errors++
    }
  }

  return { published, polled, errors }
}

/* ---------------- express app ---------------- */

const router = express.Router()

router.get(
  '/health',
  h((_req, res) => res.json({ ok: true, service: 'postpilot', time: nowIso() })),
)

/* -- content -- */
router.get(
  '/content',
  h(async (req, res) => {
    // Lazy scheduler: publish due items and poll in-flight ones on every queue fetch
    await runDue().catch(() => {})
    const state = typeof req.query.state === 'string' ? req.query.state : null
    let q = db.collection('content').orderBy('createdAt', 'desc').limit(200) as any
    if (state) q = db.collection('content').where('state', '==', state).orderBy('createdAt', 'desc').limit(200)
    const snap = await q.get()
    res.json({ items: snap.docs.map((d: any) => ({ id: d.id, ...(d.data() as ContentDoc) })) })
  }),
)

router.post(
  '/content',
  h(async (req, res) => {
    const b = req.body ?? {}
    const caption = String(b.caption ?? '').trim()
    if (!caption) return fail(res, 400, 'caption_required')
    const hashtags = Array.isArray(b.hashtags)
      ? b.hashtags.map((t: unknown) => String(t).trim()).filter(Boolean).slice(0, 30)
      : []
    const mediaUrl = String(b.mediaUrl ?? '').trim()
    const mediaType: 'video' | 'image' =
      b.mediaType === 'video' || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(mediaUrl)
        ? 'video'
        : 'image'
    const scheduleAtRaw = b.scheduleAt ? String(b.scheduleAt) : null
    const scheduleAt = scheduleAtRaw ? new Date(scheduleAtRaw) : null
    if (scheduleAt && Number.isNaN(scheduleAt.getTime())) return fail(res, 400, 'bad_schedule_at')
    const scheduled = Boolean(scheduleAt && scheduleAt.getTime() > Date.now())

    const doc: ContentDoc = {
      title: String(b.title ?? '').trim().slice(0, 120),
      caption,
      hashtags,
      mediaUrl,
      mediaType: mediaUrl ? mediaType : 'image',
      platforms: {
        tiktok: b.platforms?.tiktok !== false,
        whatsapp: b.platforms?.whatsapp !== false,
      },
      state: scheduled ? 'scheduled' : 'draft',
      scheduleAt: scheduled && scheduleAt ? scheduleAt.toISOString() : null,
      results: {},
      log: [{ t: nowIso(), msg: 'Created' }],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
    const ref = await db.collection('content').add(doc)
    res.status(201).json({ id: ref.id, ...doc })
  }),
)

router.get(
  '/content/:id',
  h(async (req, res) => {
    const snap = await db.doc(`content/${req.params.id}`).get()
    if (!snap.exists) return fail(res, 404, 'not_found')
    res.json({ id: snap.id, ...(snap.data() as ContentDoc) })
  }),
)

router.put(
  '/content/:id',
  h(async (req, res) => {
    const ref = db.doc(`content/${req.params.id}`)
    const snap = await ref.get()
    if (!snap.exists) return fail(res, 404, 'not_found')
    const b = req.body ?? {}
    const patch: Record<string, unknown> = { updatedAt: nowIso() }
    if (typeof b.title === 'string') patch.title = b.title.slice(0, 120)
    if (typeof b.caption === 'string') patch.caption = b.caption
    if (Array.isArray(b.hashtags)) patch.hashtags = b.hashtags.map(String).slice(0, 30)
    if (typeof b.mediaUrl === 'string') patch.mediaUrl = b.mediaUrl
    if (b.mediaType === 'video' || b.mediaType === 'image') patch.mediaType = b.mediaType
    if (b.platforms && typeof b.platforms === 'object') patch.platforms = b.platforms
    if (b.state && ['draft', 'scheduled'].includes(b.state)) patch.state = b.state
    if (b.scheduleAt !== undefined) {
      const when = b.scheduleAt ? new Date(String(b.scheduleAt)) : null
      if (when && Number.isNaN(when.getTime())) return fail(res, 400, 'bad_schedule_at')
      const scheduled = Boolean(when && when.getTime() > Date.now() && b.state === 'scheduled')
      patch.scheduleAt = scheduled && when ? when.toISOString() : null
      if (b.state === 'scheduled' && !scheduled) patch.state = 'draft'
    }
    await ref.update(patch)
    const after = await ref.get()
    res.json({ id: after.id, ...(after.data() as ContentDoc) })
  }),
)

router.delete(
  '/content/:id',
  h(async (req, res) => {
    await db.doc(`content/${req.params.id}`).delete()
    res.json({ ok: true })
  }),
)

/* -- publish -- */
router.post(
  '/content/:id/publish',
  h(async (req, res) => {
    const snap = await db.doc(`content/${req.params.id}`).get()
    if (!snap.exists) return fail(res, 404, 'not_found')
    const c = snap.data() as ContentDoc
    if (!c.platforms?.tiktok) return fail(res, 400, 'tiktok_disabled_for_content')
    // Serverless: the publish must finish inside the request (no fire-and-forget)
    try {
      await publishContent(req.params.id)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return fail(res, 500, 'publish_failed', message)
    }
    const after = await db.doc(`content/${req.params.id}`).get()
    const state = (after.data() as ContentDoc | undefined)?.state ?? 'posted'
    res.json({ ok: true, state })
  }),
)

router.post(
  '/content/:id/tiktok-status',
  h(async (req, res) => {
    const status = await pollPublishing(req.params.id)
    res.json({ ok: true, status })
  }),
)

router.post(
  '/content/:id/whatsapp-posted',
  h(async (req, res) => {
    const ref = db.doc(`content/${req.params.id}`)
    const snap = await ref.get()
    if (!snap.exists) return fail(res, 404, 'not_found')
    await ref.update({
      'results.whatsapp': { status: 'posted', updatedAt: nowIso() },
      updatedAt: nowIso(),
    })
    await appendLog(req.params.id, 'Marked as posted to WhatsApp Status')
    res.json({ ok: true })
  }),
)

/* -- public share endpoints (no API key: random ids) -- */
router.get(
  '/share/:id',
  h(async (req, res) => {
    const snap = await db.doc(`content/${req.params.id}`).get()
    if (!snap.exists) return fail(res, 404, 'not_found')
    const c = snap.data() as ContentDoc
    res.set('Cache-Control', 'no-store')
    res.json({
      id: snap.id,
      title: c.title,
      caption: fullCaption(c),
      mediaUrl: c.mediaUrl,
      mediaType: c.mediaType,
      whatsappStatus: c.results?.whatsapp?.status ?? 'idle',
    })
  }),
)

router.post(
  '/share/:id/posted',
  h(async (req, res) => {
    const ref = db.doc(`content/${req.params.id}`)
    const snap = await ref.get()
    if (!snap.exists) return fail(res, 404, 'not_found')
    await ref.update({
      'results.whatsapp': { status: 'posted', updatedAt: nowIso() },
      updatedAt: nowIso(),
    })
    res.json({ ok: true })
  }),
)

/* -- settings -- */
router.get(
  '/settings/tiktok',
  h(async (_req, res) => {
    const s = await getSettings()
    res.json({
      clientKey: s.clientKey,
      clientSecret: s.clientSecret,
      privacyLevel: s.privacyLevel,
      connected: s.connected,
      openId: s.openId,
      displayName: s.displayName,
      grantedScope: s.grantedScope,
      hasToken: Boolean(s.accessToken),
      hasKeys: Boolean(s.clientKey && s.clientSecret),
      redirectUri: REDIRECT_URI,
    })
  }),
)

router.put(
  '/settings/tiktok',
  h(async (req, res) => {
    const b = req.body ?? {}
    const patch: Partial<TikTokSettings> = {}
    if (typeof b.clientKey === 'string') patch.clientKey = b.clientKey.trim()
    if (typeof b.clientSecret === 'string') patch.clientSecret = b.clientSecret.trim()
    if (typeof b.privacyLevel === 'string' && PRIVACY_LEVELS.includes(b.privacyLevel as never)) {
      patch.privacyLevel = b.privacyLevel
    }
    await saveSettings(patch)
    res.json({ ok: true })
  }),
)

/* -- tiktok oauth -- */
router.get(
  '/tiktok/auth-url',
  h(async (_req, res) => {
    const s = await getSettings()
    if (!s.clientKey) return fail(res, 400, 'tiktok_keys_missing', 'Add your client key first')
    const state = randomBytes(16).toString('hex')
    await saveSettings({ oauthState: state, oauthStateExpiresAt: new Date(Date.now() + 10 * 60_000).toISOString() })
    const url = new URL(TIKTOK_AUTH_URL)
    url.searchParams.set('client_id', s.clientKey)
    url.searchParams.set('scope', TIKTOK_SCOPES)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('redirect_uri', REDIRECT_URI)
    url.searchParams.set('state', state)
    res.json({ url: url.toString() })
  }),
)

router.get(
  '/tiktok/callback',
  h(async (req, res) => {
    const code = typeof req.query.code === 'string' ? req.query.code : ''
    const state = typeof req.query.state === 'string' ? req.query.state : ''
    const s = await getSettings()
    if (!code) return res.redirect(`${DASHBOARD_URL}/?tiktok=error&reason=missing_code`)
    if (!state || state !== s.oauthState || Date.parse(s.oauthStateExpiresAt) < Date.now()) {
      return res.redirect(`${DASHBOARD_URL}/?tiktok=error&reason=bad_state`)
    }
    const body = new URLSearchParams({
      client_id: s.clientKey,
      client_secret: s.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
    })
    const tokenRes = await fetch(TIKTOK_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const json = (await tokenRes.json()) as Record<string, any>
    if (json.error || (json.error_code !== undefined && json.error_code !== 0)) {
      logger.error('oauth exchange failed', json)
      return res.redirect(`${DASHBOARD_URL}/?tiktok=error&reason=exchange_failed`)
    }
    const expiresIn = Number(json.expires_in ?? 86400)
    const access = String(json.access_token ?? '')

    // best-effort profile lookup to confirm the granted permissions
    let displayName = ''
    let openId = String(json.open_id ?? '')
    try {
      const uiUrl = new URL(TIKTOK_USER_INFO)
      uiUrl.searchParams.set('fields', 'open_id,display_name,avatar_url')
      const uiRes = await fetch(uiUrl, { headers: { Authorization: `Bearer ${access}` } })
      const uiJson = (await uiRes.json()) as Record<string, any>
      displayName = String(uiJson?.data?.user?.display_name ?? '')
      openId = String(uiJson?.data?.user?.open_id ?? openId)
    } catch (err) {
      logger.warn('user info lookup failed (non-fatal)', err)
    }

    await saveSettings({
      accessToken: access,
      refreshToken: String(json.refresh_token ?? ''),
      accessTokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      openId,
      displayName,
      grantedScope: String(json.scope ?? TIKTOK_SCOPES),
      connected: true,
      oauthState: '',
    })
    return res.redirect(`${DASHBOARD_URL}/?tiktok=connected`)
  }),
)

router.get(
  '/tiktok/status',
  h(async (_req, res) => {
    const s = await getSettings()
    res.json({ connected: s.connected, openId: s.openId, hasKeys: Boolean(s.clientKey && s.clientSecret) })
  }),
)

router.post(
  '/tiktok/disconnect',
  h(async (_req, res) => {
    await saveSettings({ connected: false, accessToken: '', refreshToken: '', openId: '' })
    res.json({ ok: true })
  }),
)

/* -- scheduler manual trigger -- */
router.post(
  '/scheduler/run',
  h(async (_req, res) => {
    const result = await runDue()
    res.json({ ok: true, ...result })
  }),
)

/* -- upload -- */
router.post(
  '/upload',
  h(async (req, res) => {
    const b = req.body ?? {}
    const name = String(b.name ?? 'file.bin').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
    const contentType = String(b.contentType ?? 'application/octet-stream')
    const data = b.dataBase64
    if (typeof data !== 'string' || data.length < 8) return fail(res, 400, 'data_required')
    const buffer = Buffer.from(data, 'base64')
    if (buffer.length > 40 * 1024 * 1024) return fail(res, 413, 'max_40mb')

    try {
      const bucket = admin.storage().bucket()
      const path = `uploads/${Date.now()}-${name}`
      const file = bucket.file(path)
      await file.save(buffer, { contentType, resumable: false, public: true })
      await file.makePublic()
      const url = `https://storage.googleapis.com/${bucket.name}/${path}`
      return res.json({ url })
    } catch (err) {
      logger.error('upload failed', err)
      return fail(
        res,
        503,
        'storage_unavailable',
        'Storage bucket unavailable — paste a public media URL instead',
      )
    }
  }),
)

/* -- media proxy for share-page CORS (restricted content types, no private hosts) -- */
router.get(
  '/proxy-media',
  h(async (req, res) => {
    const raw = typeof req.query.url === 'string' ? req.query.url : ''
    let parsed: URL
    try {
      parsed = new URL(raw)
    } catch {
      return fail(res, 400, 'bad_url')
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return fail(res, 400, 'bad_protocol')
    const host = parsed.hostname.toLowerCase()
    const blocked =
      host === 'localhost' ||
      host.endsWith('.internal') ||
      /^127\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^10\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    if (blocked) return fail(res, 400, 'host_not_allowed')

    const upstream = await fetch(parsed, { redirect: 'follow' })
    if (!upstream.ok) return fail(res, 502, `upstream_${upstream.status}`)
    const ctype = upstream.headers.get('content-type') ?? ''
    if (!/^(image|video)\//.test(ctype)) return fail(res, 415, 'not_media')
    const buf = Buffer.from(await upstream.arrayBuffer())
    res.set({
      'Content-Type': ctype,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    })
    return res.send(buf)
  }),
)

/* -- exports -- */

const app = express()
app.set('trust proxy', true)
app.use(express.json({ limit: '60mb' }))

function apiKeyGate(req: Request, res: Response, next: express.NextFunction) {
  const publicPaths = ['/health', '/tiktok/callback']
  if (publicPaths.some((p) => req.path === p || req.path === `/api${p}`)) return next()
  if (/^\/share\/[^/]+(\/posted)?$/.test(req.path) || /^\/api\/share\/[^/]+(\/posted)?$/.test(req.path)) {
    return next()
  }
  const key = req.header('x-api-key') ?? ''
  if (!API_KEY || key !== API_KEY) return fail(res, 401, 'unauthorized', 'Missing or wrong x-api-key')
  return next()
}

app.use(apiKeyGate)
// Dual mount: direct function URL strips the function name; hosting rewrite keeps /api
app.use(router)
app.use('/api', router)

export { app, runDue }
