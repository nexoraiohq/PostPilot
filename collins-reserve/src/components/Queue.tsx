import { useCallback, useEffect, useState } from 'react'
import { Plus, RefreshCw, Inbox } from 'lucide-react'
import { api, fmtDate, excerpt, type ContentItem } from '@/lib/api'
import { Btn, Card, PlatformTags, StateChip } from '@/components/bits'
import { cn } from '@/lib/cn'

const FILTERS = ['all', 'draft', 'scheduled', 'posting', 'posted', 'failed'] as const
type Filter = (typeof FILTERS)[number]

export function Queue({ onOpen, onCompose }: { onOpen: (id: string) => void; onCompose: () => void }) {
  const [items, setItems] = useState<ContentItem[] | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setBusy(true)
    try {
      const res = await api<{ items: ContentItem[] }>('/content')
      setItems(res.items)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => void load())
  }, [load])

  // auto-refresh while anything is publishing or scheduled
  useEffect(() => {
    if (!items?.some((i) => i.state === 'posting' || i.state === 'scheduled')) return
    const id = window.setInterval(() => void load(), 8000)
    return () => window.clearInterval(id)
  }, [items, load])

  const visible = (items ?? []).filter((i) => filter === 'all' || i.state === filter)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Queue</h1>
          <p className="mt-1 text-sm text-ink/55">
            Content pushed by the API or composed here — TikTok direct post + WhatsApp Status.
          </p>
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={() => void load()} disabled={busy}>
            <RefreshCw className={cn('size-4', busy && 'animate-spin')} aria-hidden />
            Refresh
          </Btn>
          <Btn onClick={onCompose}>
            <Plus className="size-4" aria-hidden />
            New post
          </Btn>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count = items?.filter((i) => f === 'all' || i.state === f).length ?? 0
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition',
                filter === f ? 'bg-ink text-white' : 'bg-white text-ink/60 ring-1 ring-slate-200 hover:ring-slate-300',
              )}
            >
              {f}
              <span className={cn('ml-1.5 text-xs', filter === f ? 'text-white/60' : 'text-ink/40')}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {error && (
        <Card className="mb-5 border-red-200 p-4 text-sm font-medium text-red-600">{error}</Card>
      )}

      {items === null ? (
        <Card className="p-10 text-center text-sm text-ink/50">Loading…</Card>
      ) : visible.length === 0 ? (
        <Card className="grid place-items-center gap-3 p-12 text-center">
          <Inbox className="size-8 text-ink/30" aria-hidden />
          <p className="font-medium">Nothing here yet</p>
          <p className="max-w-sm text-sm text-ink/50">
            Push content through the API, or use New post to compose one.
          </p>
          <Btn onClick={onCompose}>
            <Plus className="size-4" aria-hidden />
            New post
          </Btn>
        </Card>
      ) : (
        <ul className="space-y-3">
          {visible.map((item) => (
            <li key={item.id}>
              <Card className="flex cursor-pointer items-center gap-4 p-4 transition hover:border-accent/50 hover:shadow">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-4 text-left"
                  onClick={() => onOpen(item.id)}
                >
                  <MediaThumb item={item} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-semibold">
                        {item.title || 'Untitled'}
                      </span>
                      <StateChip state={item.state} />
                      <PlatformTags item={item} />
                    </div>
                    <p className="mt-1 truncate text-sm text-ink/55">{excerpt(item)}</p>
                    <p className="mt-1 text-xs text-ink/40">
                      {item.state === 'scheduled' && item.scheduleAt
                        ? `Scheduled for ${fmtDate(item.scheduleAt)}`
                        : `Created ${fmtDate(item.createdAt)}`}
                    </p>
                  </div>
                </button>
                <div className="hidden shrink-0 text-right text-xs text-ink/45 sm:block">
                  {item.results?.tiktok && (
                    <p className="font-medium">TikTok: {item.results.tiktok.status}</p>
                  )}
                  {item.results?.whatsapp && (
                    <p className="font-medium">Status: {item.results.whatsapp.status}</p>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function MediaThumb({ item }: { item: ContentItem }) {
  if (!item.mediaUrl) {
    return (
      <div className="grid size-14 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-ink/40">
        TXT
      </div>
    )
  }
  if (item.mediaType === 'video') {
    return (
      <video
        src={item.mediaUrl}
        className="size-14 shrink-0 rounded-lg bg-ink object-cover"
        muted
        playsInline
        preload="metadata"
      />
    )
  }
  return (
    <img
      src={item.mediaUrl}
      alt=""
      className="size-14 shrink-0 rounded-lg bg-slate-100 object-cover"
      loading="lazy"
    />
  )
}
