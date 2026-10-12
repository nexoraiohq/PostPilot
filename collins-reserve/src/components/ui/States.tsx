import type { HTMLAttributes } from 'react'
import { Inbox } from 'lucide-react'
import { cn } from '@/utils/cn'

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-lg bg-line/50', className)} {...props} />
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('inline-block size-5 animate-spin rounded-full border-2 border-line border-t-ink', className)}
    />
  )
}

export interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
  icon?: React.ReactNode
  className?: string
}

export function EmptyState({ title, description, action, icon, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-paper/50 px-8 py-16 text-center', className)}>
      <div className="mb-4 rounded-lg bg-ivory p-3 text-stone">{icon ?? <Inbox className="size-5" aria-hidden />}</div>
      <h3 className="text-card text-ink">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-support text-stone">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

export function PageLoading({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-3" role="status">
      <Spinner />
      <p className="text-support text-stone">{label}…</p>
    </div>
  )
}
