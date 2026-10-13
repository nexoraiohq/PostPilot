import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, Copy, Share2 } from 'lucide-react'
import { api, type SharePayload } from '@/lib/api'
import { Btn, Card } from '@/components/bits'

export function SharePage({ id }: { id: string }) {
  const [payload, setPayload] = useState<SharePayload | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [marked, setMarked] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sharing' | 'done'>('idle')
  const fileUrl = useRef('')

  useEffect(() => {
    api<SharePayload>(`/share/${id}`)
      .then(setPayload)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : 'Could not load this post'),
      )
  }, [id])

  const fullText = payload ? `${payload.caption}\n${window.location.origin}/share/${payload.id}` : ''

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(payload?.caption ?? '')
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      /* clipboard unavailable */
    }
  }

  const shareToWhatsApp = async () => {
    if (!payload) return
    setStatus('sharing')
    // grab the media file so WhatsApp Status gets the image/video, not a link
    if (payload.mediaUrl && !fileUrl.current) {
      try {
        const res = await fetch(payload.mediaUrl)
        if (res.ok) fileUrl.current = URL.createObjectURL(await res.blob())
      } catch {
        try {
          const res = await fetch(
            `/api/proxy-media?url=${encodeURIComponent(payload.mediaUrl)}`,
          )
          if (res.ok) fileUrl.current = URL.createObjectURL(await res.blob())
        } catch {
          /* link-only fallback below */
        }
      }
    }
    try {
      const canShareFile =
        fileUrl.current &&
        navigator.canShare?.({
          files: [
            new File(
              [await (await fetch(fileUrl.current)).blob()],
              payload.mediaType === 'video' ? 'status.mp4' : 'status.jpg',
              { type: payload.mediaType === 'video' ? 'video/mp4' : 'image/jpeg' },
            ),
          ],
        })
      if (canShareFile) {
        const blob = await (await fetch(fileUrl.current)).blob()
        const file = new File([blob], payload.mediaType === 'video' ? 'status.mp4' : 'status.jpg', {
          type: blob.type,
        })
        await navigator.share({ files: [file], text: payload.caption })
      } else if (navigator.share) {
        await navigator.share({ text: fullText })
      } else {
        await navigator.clipboard.writeText(fullText)
        setCopied(true)
        window.open('https://wa.me/?text=' + encodeURIComponent(payload.caption), '_blank')
        return
      }
      setStatus('done')
      await markPosted(true)
    } catch {
      setStatus('idle')
    }
  }

  const markPosted = async (quiet = false) => {
    try {
      await api(`/share/${id}/posted`, { method: 'POST' })
      setMarked(true)
      if (!quiet) setStatus('done')
    } catch {
      /* already marked or offline */
    }
  }

  if (error) {
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <Card className="max-w-md p-8 text-center">
          <p className="font-semibold text-red-600">Post unavailable</p>
          <p className="mt-2 text-sm text-ink/55">{error}</p>
        </Card>
      </div>
    )
  }

  if (!payload) {
    return (
      <div className="grid min-h-dvh place-items-center text-sm text-ink/50">Loading…</div>
    )
  }

  return (
    <div className="min-h-dvh bg-ink">
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-8">
        <header className="mb-6 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="" className="size-9 rounded-lg" />
            <div>
              <p className="text-sm font-bold tracking-widest">POSTPILOT</p>
              <p className="text-xs text-white/50">Ready for your WhatsApp Status</p>
            </div>
          </div>
          <span className="rounded-full bg-wa/15 px-3 py-1 text-xs font-bold text-wa">
            Status ready
          </span>
        </header>

        <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
          {payload.mediaUrl &&
            (payload.mediaType === 'video' ? (
              <video src={payload.mediaUrl} controls playsInline className="max-h-[60vh] w-full bg-black" />
            ) : (
              <img src={payload.mediaUrl} alt="" className="max-h-[60vh] w-full bg-slate-100 object-cover" />
            ))}
          <div className="p-5">
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink/85">
              {payload.caption}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <Btn variant="wa" onClick={() => void shareToWhatsApp()} disabled={status === 'sharing'} className="w-full py-3.5 text-base">
            <Share2 className="size-5" aria-hidden />
            {status === 'sharing' ? 'Opening share sheet…' : 'Share to WhatsApp Status'}
          </Btn>
          <Btn variant="ghost" onClick={() => void copyCaption()} className="w-full py-3.5">
            {copied ? <CheckCircle2 className="size-4 text-emerald-600" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {copied ? 'Caption copied' : 'Copy caption only'}
          </Btn>
          {!marked && (
            <button
              type="button"
              onClick={() => void markPosted()}
              className="w-full text-center text-sm font-medium text-white/60 hover:text-white"
            >
              I’ve posted it — mark as posted
            </button>
          )}
        </div>

        {marked && (
          <p className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-white/10 p-4 text-sm font-medium text-wa">
            <CheckCircle2 className="size-4" aria-hidden />
            Marked as posted on your Status
          </p>
        )}

        <p className="mt-auto pt-8 text-center text-xs leading-relaxed text-white/40">
          In the share sheet, pick <strong className="text-white/70">WhatsApp</strong> →{' '}
          <strong className="text-white/70">Status</strong>, then send.
        </p>
      </div>
    </div>
  )
}
