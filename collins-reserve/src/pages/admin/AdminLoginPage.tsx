import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail, RefreshCw, ShieldCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '@/context/auth'
import { useToast } from '@/context/toast'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'

const DEMO_EMAIL = 'admin@maisonnoir.demo'
const DEMO_PASSWORD = 'MaisonNoir2026!'

const schema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
})

type FormValues = z.infer<typeof schema>

function authErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : ''
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Email or password is incorrect.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a minute or two, then try again.'
    case 'auth/invalid-email':
      return 'Enter a valid email address.'
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact the restaurant.'
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.'
    default:
      return error instanceof Error && error.message ? error.message : 'Could not sign in. Please try again.'
  }
}

export default function AdminLoginPage() {
  const { isAdmin, loading, sendPasswordReset, signIn, user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/admin'

  const {
    handleSubmit,
    register,
    setError,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  useEffect(() => {
    if (!loading && user && isAdmin) navigate(from, { replace: true })
  }, [loading, user, isAdmin, from, navigate])

  if (!loading && user && isAdmin) return <Navigate to={from} replace />

  const onSubmit = async (values: FormValues) => {
    setFormError(null)
    try {
      await signIn(values.email, values.password)
      toast('Signed in to operations', 'success')
      navigate(from, { replace: true })
    } catch (error) {
      setFormError(authErrorMessage(error))
    }
  }

  const onForgotPassword = async () => {
    const email = getValues('email').trim()
    if (!email) {
      setError('email', { message: 'Enter your email address first.' })
      return
    }
    setResetting(true)
    try {
      await sendPasswordReset(email)
      toast(`Password reset link sent to ${email}`, 'success')
    } catch (error) {
      toast(authErrorMessage(error), 'error')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Brand panel */}
      <section className="flex flex-col justify-between gap-10 bg-ink px-6 py-12 text-ivory sm:px-10 lg:px-14 lg:py-16">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-[12px] tracking-[0.18em] text-ivory/55 uppercase hover:text-ivory">
            <ArrowLeft className="size-3.5" aria-hidden />
            Restaurant site
          </Link>
          <p className="mt-12 font-display text-[clamp(2rem,1rem+4vw,3.5rem)] leading-[1.05] font-semibold tracking-[0.06em] uppercase">
            Maison
            <br />
            Noir<span className="text-champagne">.</span>
          </p>
          <p className="mt-6 label-caps text-champagne">Collins Reserve · Operations</p>
        </div>

        <div className="max-w-sm space-y-4 text-support text-ivory/60">
          <p className="rounded-2xl border border-white/12 bg-white/[0.04] p-4 leading-relaxed">
            MAISON NOIR is a fictional restaurant used for this demo. Every order, reservation and figure shown here is
            sample data — nothing is charged, and nothing is sent to a real kitchen.
          </p>
          <p className="flex items-center gap-2 text-ivory/45">
            <ShieldCheck className="size-4 shrink-0" aria-hidden />
            Staff and managers only · Kilimani, Nairobi
          </p>
        </div>
      </section>

      {/* Form panel */}
      <section className="flex items-center justify-center bg-ivory px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <p className="label-caps text-stone">Sign in</p>
          <h1 className="mt-3 font-display text-4xl leading-none font-semibold text-ink sm:text-5xl">Operations console</h1>
          <p className="mt-3 text-support text-stone">Live orders, reservations and service controls for today.</p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-8 space-y-4">
            <Field label="Email" required error={errors.email?.message}>
              {(id) => (
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-stone" aria-hidden />
                  <Input
                    id={id}
                    type="email"
                    autoComplete="username"
                    placeholder="you@maisonnoir.demo"
                    invalid={Boolean(errors.email)}
                    className="pl-10"
                    {...register('email')}
                  />
                </div>
              )}
            </Field>

            <Field label="Password" required error={errors.password?.message}>
              {(id) => (
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-stone" aria-hidden />
                  <Input
                    id={id}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Your password"
                    invalid={Boolean(errors.password)}
                    className="pr-12 pl-10"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg p-2 text-stone transition-colors hover:bg-ivory hover:text-ink"
                  >
                    {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                  </button>
                </div>
              )}
            </Field>

            <div className="flex items-center justify-between gap-3 pt-1">
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-stone">
                <input type="checkbox" className="size-4 rounded border-line accent-ink" defaultChecked />
                Keep me signed in
              </label>
              <button
                type="button"
                onClick={() => void onForgotPassword()}
                disabled={resetting}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink underline-offset-4 hover:underline disabled:opacity-50"
              >
                {resetting && <RefreshCw className="size-3.5 animate-spin" aria-hidden />}
                Forgot password?
              </button>
            </div>

            {formError && (
              <p role="alert" className="rounded-xl border border-error/25 bg-error-soft px-4 py-3 text-support text-error">
                {formError}
              </p>
            )}

            <Button type="submit" loading={isSubmitting} className="mt-2 w-full">
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6 rounded-2xl border border-line bg-paper p-4">
            <p className="label-caps text-stone">Demo access</p>
            <p className="mt-2 text-support text-ink tabular-nums">
              {DEMO_EMAIL} <span className="text-stone">/</span> {DEMO_PASSWORD}
            </p>
            <button
              type="button"
              onClick={() => {
                setFormError(null)
                setValue('email', DEMO_EMAIL, { shouldDirty: true })
                setValue('password', DEMO_PASSWORD, { shouldDirty: true })
              }}
              className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink underline-offset-4 hover:underline"
            >
              Use demo credentials <ArrowRight className="size-3.5" aria-hidden />
            </button>
          </div>

          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 text-[13px] font-medium text-stone underline-offset-4 hover:text-ink hover:underline"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            Back to restaurant site
          </Link>

          <p className="mt-8 text-[12px] leading-relaxed text-stone/80">
            MAISON NOIR · 12 Riverside Lane, Kilimani, Nairobi · Fictional restaurant for demonstration purposes.
          </p>
        </div>
      </section>
    </div>
  )
}
