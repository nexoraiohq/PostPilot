import { useCallback, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  RefreshCw,
  Send,
  Trash2,
} from 'lucide-react'
import { api, fmtDate, shareUrl, type ContentItem } from '@/lib/api'
import { Btn, Card, PlatformTags, Spinner, StateChip, inputCls } from '@/components/bits'

export function Detail({
  id,
  onBack,
  onDeleted,
}: {
  id: string
  onBack: () => void
  onDeleted: () => void
}) {
  const [item, setItem] = useState<ContentItem | null>(null)
  const [error, setError] = useState('')
  const [action, setAction] = useState('')
  const [qr, setQr] = useState('')
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await api<ContentItem>(`/content/${id}`)
      setItem(data)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    }
  }, [id])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      const data = await api<ContentItem>(`/content/${id}`)
      if (!cancelled) setItem(data)
    }
    queueMicrotask(() =>
      void run().catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      }),
    )
    return () => {
      cancelled = true
    }
  }, [id])

  const url = shareUrl(id)

  useEffect(() => {
    QRCode.toDataURL(url, { width: 240, margin: 1, color: { dark: '#12121a', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(''))
  }, [url])

  const publish = async () => {
    setAction('publish')
    try {
      await api(`/content/${id}/publish`, { method: 'POST' })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Publish failed')
    } finally {
      setAction('')
    }
  }

  const pollStatus = async () => {
    setAction('poll')
    try {
      await api(`/content/${id}/tiktok-status`, { method: 'POST' })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status check failed')
    } finally {
      setAction('')
    }
  }

  const markPosted = async () => {
    setAction('wa')
    try {
      await api(`/content/${id}/whatsapp-posted`, { method: 'POST' })
      await load()
    } finally {
      setAction('')
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard unavailable */
    }
  }

  const remove = async () => {
    if (!window.confirm('Delete this content permanently?')) return
    await api(`/content/${id}`, { method: 'DELETE' })
    onDeleted()
  }

  if (error && !item) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card className="border-red-200 p-6 text-sm font-medium text-red-600">{error}</Card>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-ink/60 hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Queue
        </button>
      </div>
    )
  }

  if (!item) {
    return <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-ink/50">Loading…</div>
  }

  const tt = item.results?.tiktok
  const wa = item.results?.whatsapp

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-ink/60 hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Queue
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold">{item.title || 'Untitled'}</h1>
            <StateChip state={item.state} />
            <PlatformTags item={item} />
          </div>
          <p className="mt-1 text-sm text-ink/50">
            Created {fmtDate(item.createdAt)}
            {item.scheduleAt && ` · scheduled ${fmtDate(item.scheduleAt)}`}
          </p>
        </div>
        <Btn variant="danger" onClick={() => void remove()}>
          <Trash2 className="size-4" aria-hidden />
          Delete
        </Btn>
      </div>

      {error && <Card className="mt-4 border-red-200 p-4 text-sm font-medium text-red-600">{error}</Card>}

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        {/* Media + caption */}
        <Card className="overflow-hidden lg:col-span-3">
          {item.mediaUrl &&
            (item.mediaType === 'video' ? (
              <video src={item.mediaUrl} controls playsInline className="max-h-96 w-full bg-ink" />
            ) : (
              <img src={item.mediaUrl} alt="" className="max-h-96 w-full bg-slate-100 object-contain" />
            ))}
          <div className="space-y-3 p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-ink/40">Caption</p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{item.caption}</p>
            </div>
            {item.hashtags.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-ink/40">Hashtags</p>
                <p className="mt-1.5 text-sm font-medium text-accent">
                  {item.hashtags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ')}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Actions */}
        <div className="space-y-6 lg:col-span-2">
          {item.platforms.tiktok && (
            <Card className="p-5">
              <p className="text-xs font-bold uppercase tracking-wide text-ink/40">TikTok</p>
              <p className="mt-2 text-sm text-ink/65">
                {tt?.publishId ? (
                  <>
                    Publish ID <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">{tt.publishId}</code>
                    <br />
                    Status: <strong>{tt.status}</strong>
                    {tt.error && <span className="text-red-600"> — {tt.error}</span>}
                  </>
                ) : (
                  'Not sent to TikTok yet.'
                )}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Btn onClick={() => void publish()} disabled={action === 'publish' || item.state === 'posting'}>
                  {action === 'publish' ? <Spinner /> : <Send className="size-4" aria-hidden />}
                  {item.state === 'posting' ? 'Publishing…' : 'Publish to TikTok now'}
                </Btn>
                {tt?.publishId && item.state !== 'posted' && (
                  <Btn variant="ghost" onClick={() => void pollStatus()} disabled={action === 'poll'}>
                    {action === 'poll' ? <Spinner /> : <RefreshCw className="size-4" aria-hidden />}
                    Check status
                  </Btn>
                )}
              </div>
            </Card>
          )}

          {item.platforms.whatsapp && (
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-ink/40">WhatsApp Status</p>
                {wa?.status === 'posted' && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-wa/10 px-2 py-0.5 text-xs font-bold text-wa">
                    <CheckCircle2 className="size-3" aria-hidden /> posted
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-start gap-4">
                {qr && (
                  <img
                    src={qr}
                    alt="QR code to the share page"
                    className="size-28 shrink-0 rounded-lg border border-slate-200"
                  />
                )}
                <div className="min-w-0 space-y-2">
                  <p className="text-xs text-ink/50">Scan with your phone, or copy the link:</p>
                  <div className="flex gap-2">
                    <input readOnly value={url} className={`${inputCls} min-w-0 flex-1 text-xs`} />
                    <Btn variant="ghost" onClick={() => void copyLink()}>
                      {copied ? (
                        <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
                      ) : (
                        <Copy className="size-4" aria-hidden />
                      )}
                    </Btn>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Btn variant="wa" href={url}>
                  <ExternalLink className="size-4" aria-hidden />
                  Open share page
                </Btn>
                {wa?.status !== 'posted' && (
                  <Btn variant="ghost" onClick={() => void markPosted()} disabled={action === 'wa'}>
                    Mark as posted
                  </Btn>
                )}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-ink/40">Activity log</p>
            <ul className="mt-3 space-y-2">
              {[...item.log]
                .reverse()
                .slice(0, 8)
                .map((entry, i) => (
                  <li key={`${entry.t}-${i}`} className="flex gap-3 text-xs">
                    <span className="shrink-0 tabular-nums text-ink/40">{fmtDate(entry.t)}</span>
                    <span className="text-ink/70">{entry.msg}</span>
                  </li>
                ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
