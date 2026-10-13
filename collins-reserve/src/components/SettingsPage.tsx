import { useEffect, useState, type FormEvent } from 'react'
import { Link2, Plug, Unplug, Wifi, WifiOff } from 'lucide-react'
import { api, getKey, clearKey, type TikTokSettings } from '@/lib/api'
import { Btn, Card, Field, inputCls, Spinner } from '@/components/bits'

const PRIVACY = [
  { value: 'SELF_ONLY', label: 'Only me (works while your app is in testing)' },
  { value: 'MUTUAL_FOLLOW_FRIENDS', label: 'Friends' },
  { value: 'FOLLOWER_OF_CREATOR', label: 'Followers' },
  { value: 'PUBLIC_TO_EVERYONE', label: 'Everyone (requires TikTok app review)' },
]

export function SettingsPage({ notice }: { notice: string }) {
  const [settings, setSettings] = useState<TikTokSettings | null>(null)
  const [clientKey, setClientKey] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [privacy, setPrivacy] = useState('SELF_ONLY')
  const [msg, setMsg] = useState(notice)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const s = await api<TikTokSettings>('/settings/tiktok')
      setSettings(s)
      setClientKey(s.clientKey)
      setClientSecret(s.clientSecret)
      setPrivacy(s.privacyLevel)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    setError('')
    try {
      await api('/settings/tiktok', {
        method: 'PUT',
        body: JSON.stringify({ clientKey, clientSecret, privacyLevel: privacy }),
      })
      setMsg('TikTok app settings saved.')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  const connect = async () => {
    setMsg('')
    setError('')
    try {
      const res = await api<{ url: string }>('/tiktok/auth-url')
      window.location.href = res.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not build the connect URL')
    }
  }

  const disconnect = async () => {
    await api('/tiktok/disconnect', { method: 'POST' })
    setMsg('Disconnected from TikTok.')
    await load()
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-ink/55">TikTok app credentials, account link and access.</p>

      {msg && (
        <Card className="mt-5 flex items-center gap-2 border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          <Wifi className="size-4 shrink-0" aria-hidden />
          {msg}
        </Card>
      )}
      {error && (
        <Card className="mt-5 border-red-200 p-4 text-sm font-medium text-red-600">{error}</Card>
      )}

      <Card className="mt-6 p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {settings?.connected ? (
              <span className="grid size-10 place-items-center rounded-lg bg-emerald-100">
                <Wifi className="size-5 text-emerald-600" aria-hidden />
              </span>
            ) : (
              <span className="grid size-10 place-items-center rounded-lg bg-slate-100">
                <WifiOff className="size-5 text-ink/40" aria-hidden />
              </span>
            )}
            <div>
              <p className="font-semibold">
                {settings?.connected
                  ? `Connected${settings.displayName ? ` — ${settings.displayName}` : ''}`
                  : 'TikTok not connected'}
              </p>
              <p className="text-xs text-ink/50">
                {settings?.connected
                  ? `Open ID: ${settings.openId || 'linked'}`
                  : 'Add your app keys below, then connect your account.'}
              </p>
            </div>
          </div>
          {settings?.connected ? (
            <Btn variant="ghost" onClick={() => void disconnect()}>
              <Unplug className="size-4" aria-hidden />
              Disconnect
            </Btn>
          ) : (
            <Btn onClick={() => void connect()} disabled={!settings?.hasKeys}>
              <Plug className="size-4" aria-hidden />
              Connect TikTok
            </Btn>
          )}
        </div>

        {settings?.connected && settings.grantedScope && (
          <div className="mb-5 rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-ink/45">
              Granted permissions
            </p>
            <code className="mt-2 block break-all rounded bg-white px-3 py-2 text-xs ring-1 ring-slate-200">
              {settings.grantedScope}
            </code>
            {!settings.grantedScope.includes('video.publish') && (
              <p className="mt-2 text-xs font-medium text-amber-600">
                Your TikTok app has not been approved for direct posting yet — posts will only go to
                your own account as private until TikTok’s app review approves the{' '}
                <strong>video.publish</strong> scope.
              </p>
            )}
          </div>
        )}

        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client key">
              <input
                value={clientKey}
                onChange={(e) => setClientKey(e.target.value)}
                placeholder="awv…"
                className={inputCls}
                autoComplete="off"
              />
            </Field>
            <Field label="Client secret">
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="••••••••"
                className={inputCls}
                autoComplete="off"
              />
            </Field>
          </div>

          <Field label="Post visibility">
            <select value={privacy} onChange={(e) => setPrivacy(e.target.value)} className={inputCls}>
              {PRIVACY.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="rounded-lg bg-slate-50 p-4">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-ink/45">
              <Link2 className="size-3.5" aria-hidden />
              Register this exact redirect URI in your TikTok developer app
            </p>
            <code className="mt-2 block break-all rounded bg-white px-3 py-2 text-xs ring-1 ring-slate-200">
              {settings?.redirectUri ?? '…'}
            </code>
            <p className="mt-2 text-xs text-ink/50">
              At developers.tiktok.com → your app → Redirect URIs. Also enable the{' '}
              <strong>video.publish</strong> scope.
            </p>
          </div>

          <div className="flex justify-end">
            <Btn type="submit" disabled={busy}>
              {busy ? <Spinner /> : null}
              Save app settings
            </Btn>
          </div>
        </form>
      </Card>

      <Card className="mt-6 p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-ink/40">This session</p>
        <p className="mt-2 text-sm text-ink/65">
          API key in this browser:{' '}
          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
            {getKey().slice(0, 6)}…{getKey().slice(-4)}
          </code>
        </p>
        <div className="mt-4">
          <Btn
            variant="ghost"
            onClick={() => {
              clearKey()
              window.location.href = '/'
            }}
          >
            Lock dashboard
          </Btn>
        </div>
      </Card>
    </div>
  )
}
