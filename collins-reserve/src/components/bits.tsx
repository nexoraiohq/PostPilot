import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { ContentItem } from '@/lib/api'

export function StateChip({ state }: { state: ContentItem['state'] }) {
  const map: Record<ContentItem['state'], string> = {
    draft: 'bg-slate-100 text-slate-600',
    scheduled: 'bg-amber-100 text-amber-700',
    posting: 'bg-indigo-100 text-indigo-700',
    posted: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
  }
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize', map[state])}>
      {state === 'posting' && (
        <span className="size-1.5 animate-pulse rounded-full bg-indigo-500" aria-hidden />
      )}
      {state}
    </span>
  )
}

export function PlatformTags({ item }: { item: ContentItem }) {
  return (
    <span className="flex gap-1.5">
      {item.platforms.tiktok && (
        <span className="rounded bg-ink px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
          TIKTOK
        </span>
      )}
      {item.platforms.whatsapp && (
        <span className="rounded bg-wa px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
          STATUS
        </span>
      )}
    </span>
  )
}

export function Btn({
  children,
  onClick,
  variant = 'primary',
  type = 'button',
  disabled,
  className,
  href,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'dark' | 'danger' | 'wa'
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
  href?: string
}) {
  const styles = {
    primary: 'bg-accent text-white hover:bg-accent-dark',
    dark: 'bg-ink text-white hover:bg-ink-soft',
    ghost: 'border border-slate-300 bg-white text-ink hover:border-slate-400',
    danger: 'border border-red-200 bg-white text-red-600 hover:bg-red-50',
    wa: 'bg-wa text-white hover:brightness-95',
  }[variant]
  const cls = cn(
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50',
    styles,
    className,
  )
  if (href) {
    return (
      <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className={cls}>
        {children}
      </a>
    )
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)}>{children}</div>
  )
}

export function Spinner() {
  return <span className="inline-block size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink/80">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink/50">{hint}</span>}
    </label>
  )
}

export const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20'
