import { useState, type FormEvent } from 'react'
import { ShieldCheck } from 'lucide-react'
import { api, setKey, ApiError } from '@/lib/api'
import { Btn, Card, inputCls } from '@/components/bits'

export function Login({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const candidate = value.trim()
    setKey(candidate)
    try {
      await api('/content')
      onUnlock()
    } catch (err) {
      setKey('')
      setError(
        err instanceof ApiError && err.status === 401
          ? 'That API key was not accepted.'
          : 'Could not reach the API. Is the backend deployed?',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="size-11 rounded-xl shadow-sm" />
          <div>
            <h1 className="text-xl font-bold">PostPilot</h1>
            <p className="text-sm text-ink/55">Content posting system</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="key" className="mb-1.5 block text-sm font-semibold">
              API key
            </label>
            <input
              id="key"
              type="password"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="paste your x-api-key"
              className={inputCls}
              autoFocus
              required
            />
          </div>
          {error && <p className="text-sm font-medium text-red-600">{error}</p>}
          <Btn type="submit" disabled={busy || !value.trim()} className="w-full">
            {busy ? 'Checking…' : 'Unlock dashboard'}
          </Btn>
        </form>
        <p className="mt-6 flex items-start gap-2 text-xs leading-relaxed text-ink/50">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          The key is stored only in this browser (localStorage) and sent as the x-api-key header
          to the backend.
        </p>
      </Card>
    </div>
  )
}
