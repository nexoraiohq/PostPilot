const KEY_STORAGE = 'postpilot_api_key'

export interface ContentItem {
  id: string
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

export interface TikTokSettings {
  clientKey: string
  clientSecret: string
  privacyLevel: string
  connected: boolean
  openId: string
  displayName: string
  grantedScope: string
  hasToken: boolean
  hasKeys: boolean
  redirectUri: string
}

export interface SharePayload {
  id: string
  title: string
  caption: string
  mediaUrl: string
  mediaType: 'video' | 'image'
  whatsappStatus: string
}

export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message?: string) {
    super(message ?? code)
    this.status = status
    this.code = code
  }
}

export function getKey() {
  return localStorage.getItem(KEY_STORAGE) ?? ''
}

export function setKey(key: string) {
  localStorage.setItem(KEY_STORAGE, key)
}

export function clearKey() {
  localStorage.removeItem(KEY_STORAGE)
}

export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'x-api-key': getKey(),
      ...(init?.headers ?? {}),
    },
  })
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown> & T
  if (!res.ok) {
    throw new ApiError(res.status, String(json.error ?? res.status), String(json.message ?? ''))
  }
  return json
}

export function shareUrl(id: string) {
  return `${window.location.origin}/share/${id}`
}

export function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function excerpt(item: ContentItem, len = 90) {
  const text = item.caption.replace(/\s+/g, ' ').trim()
  return text.length > len ? `${text.slice(0, len)}…` : text
}
