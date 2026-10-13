import { useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, Upload } from 'lucide-react'
import { api, type ContentItem } from '@/lib/api'
import { Btn, Card, Field, inputCls, Spinner } from '@/components/bits'

export function Composer({
  onBack,
  onSaved,
}: {
  onBack: () => void
  onSaved: (item: ContentItem) => void
}) {
  const [title, setTitle] = useState('')
  const [caption, setCaption] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image')
  const [tiktok, setTiktok] = useState(true)
  const [whatsapp, setWhatsapp] = useState(true)
  const [scheduleAt, setScheduleAt] = useState('')
  const [scheduleOn, setScheduleOn] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('read failed'))
        reader.readAsDataURL(file)
      })
      const base64 = dataUrl.split(',')[1] ?? ''
      const res = await api<{ url: string }>('/upload', {
        method: 'POST',
        body: JSON.stringify({ name: file.name, contentType: file.type, dataBase64: base64 }),
      })
      setMediaUrl(res.url)
      setMediaType(file.type.startsWith('video') ? 'video' : 'image')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed — paste a URL instead')
    } finally {
      setUploading(false)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const created = await api<{ id: string }>('/content', {
        method: 'POST',
        body: JSON.stringify({
          title,
          caption,
          hashtags: hashtags.split(/[\s,]+/).filter(Boolean),
          mediaUrl,
          mediaType,
          platforms: { tiktok, whatsapp },
          scheduleAt: scheduleOn && scheduleAt ? new Date(scheduleAt).toISOString() : null,
          state: scheduleOn && scheduleAt ? 'scheduled' : 'draft',
        }),
      })
      const item = await api<ContentItem>(`/content/${created.id}`)
      onSaved(item)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-ink/60 hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Queue
      </button>
      <h1 className="text-2xl font-bold">New post</h1>
      <p className="mt-1 text-sm text-ink/55">
        Save as draft, or schedule it — the scheduler posts to TikTok when the time comes.
      </p>

      <Card className="mt-6 p-6">
        <form onSubmit={submit} className="space-y-5">
          <Field label="Internal title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Spring drop teaser"
              className={inputCls}
            />
          </Field>

          <Field label="Caption" hint="Goes to TikTok as the post text.">
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={5}
              required
              placeholder="Write what should appear on the post…"
              className={`${inputCls} resize-y`}
            />
          </Field>

          <Field label="Hashtags" hint="Space or comma separated — # signs optional.">
            <input
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="skincare glow routine"
              className={inputCls}
            />
          </Field>

          <Field
            label="Media URL"
            hint="Public link to a video (mp4) or image. TikTok direct post needs a URL it can fetch."
          >
            <input
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="https://…/video.mp4"
              className={inputCls}
              required
            />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <Btn variant="ghost" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Spinner /> : <Upload className="size-4" aria-hidden />}
              {uploading ? 'Uploading…' : 'Upload file instead'}
            </Btn>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
            <select
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value as 'image' | 'video')}
              className={`${inputCls} w-auto`}
              aria-label="Media type"
            >
              <option value="image">Image post</option>
              <option value="video">Video post</option>
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3.5">
              <input
                type="checkbox"
                checked={tiktok}
                onChange={(e) => setTiktok(e.target.checked)}
                className="size-4 accent-accent"
              />
              <span className="text-sm font-semibold">Post to TikTok</span>
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3.5">
              <input
                type="checkbox"
                checked={whatsapp}
                onChange={(e) => setWhatsapp(e.target.checked)}
                className="size-4 accent-accent"
              />
              <span className="text-sm font-semibold">Prepare WhatsApp Status</span>
            </label>
          </div>

          <div className="space-y-3 rounded-lg border border-slate-200 p-3.5">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={scheduleOn}
                onChange={(e) => setScheduleOn(e.target.checked)}
                className="size-4 accent-accent"
              />
              <span className="text-sm font-semibold">Schedule</span>
            </label>
            {scheduleOn && (
              <input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                className={inputCls}
                required
              />
            )}
          </div>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <div className="flex justify-end gap-3">
            <Btn variant="ghost" onClick={onBack}>
              Cancel
            </Btn>
            <Btn type="submit" disabled={busy}>
              {busy ? 'Saving…' : scheduleOn && scheduleAt ? 'Save scheduled' : 'Save draft'}
            </Btn>
          </div>
        </form>
      </Card>
    </div>
  )
}
