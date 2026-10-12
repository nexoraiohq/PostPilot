import { ChevronDown, Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/utils/cn'
import type { OrderStatus } from '@/types'

/* ------------------------------------------------------------------ */
/* Page scaffolding                                                    */
/* ------------------------------------------------------------------ */

export function PageHead({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-3xl leading-none font-light tracking-[-0.01em] text-ink sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 text-support text-stone">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-2xl border border-line bg-paper p-5 sm:p-6', className)}>{children}</div>
}

export function KpiCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: ReactNode
  hint?: string
  tone?: 'success' | 'error' | 'champagne'
}) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-5">
      <p className="label-caps text-stone">{label}</p>
      <p
        className={cn(
          'mt-3 text-kpi tabular-nums',
          tone === 'success' && 'text-success',
          tone === 'error' && 'text-error',
          tone === 'champagne' && 'text-[#8a6f42]',
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-2 text-support text-stone">{hint}</p>}
    </div>
  )
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="mb-6 flex flex-wrap items-center gap-3">{children}</div>
}

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

export interface TabOption<T extends string = string> {
  value: T
  label: string
}

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: TabOption<T>[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div role="tablist" aria-label="View" className="inline-flex flex-wrap items-center gap-1 rounded-full border border-line bg-paper p-1">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'min-h-10 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors duration-150',
              active ? 'bg-ink text-ivory' : 'text-stone hover:bg-ink/[0.05] hover:text-ink',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function SearchInput({
  value,
  onChange,
  label,
  placeholder,
  className,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        placeholder={placeholder}
        className="h-10 w-full min-w-0 rounded-xl border border-line bg-paper py-0 pr-3 pl-9 text-sm text-ink placeholder:text-stone/70 transition-colors hover:border-stone/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:min-w-56"
      />
    </div>
  )
}

export function FilterSelect<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: TabOption<T>[]
  label: string
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        aria-label={label}
        className="h-10 min-w-0 appearance-none rounded-xl border border-line bg-paper py-0 pr-9 pl-3 text-sm text-ink transition-colors hover:border-stone/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-stone" aria-hidden />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Confirmation                                                        */
/* ------------------------------------------------------------------ */

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  destructive,
  loading,
  onConfirm,
  onClose,
  children,
  error,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
  children?: ReactNode
  error?: string
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-support text-stone">{message}</p>
      {children}
      {error && (
        <p role="alert" className="mt-3 text-support text-error">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */

export const tableClasses = {
  wrap: 'overflow-x-auto',
  table: 'w-full text-sm',
  th: 'label-caps border-b border-line py-3 pr-4 text-left text-stone whitespace-nowrap',
  td: 'border-b border-line/70 py-3 pr-4 align-top',
}

/* ------------------------------------------------------------------ */
/* Order actions                                                       */
/* ------------------------------------------------------------------ */

export interface OrderAction {
  to: OrderStatus
  label: string
  variant: 'primary' | 'secondary' | 'danger'
  /** Opens a reason prompt before running. */
  reason?: boolean
  reasonRequired?: boolean
}

export const ORDER_ACTIONS: Record<OrderStatus, OrderAction[]> = {
  received: [
    { to: 'accepted', label: 'Accept', variant: 'primary' },
    { to: 'rejected', label: 'Reject', variant: 'danger', reason: true, reasonRequired: true },
  ],
  accepted: [
    { to: 'preparing', label: 'Start preparing', variant: 'primary' },
    { to: 'cancelled', label: 'Cancel order', variant: 'danger', reason: true },
  ],
  preparing: [
    { to: 'ready', label: 'Mark ready', variant: 'primary' },
    { to: 'cancelled', label: 'Cancel order', variant: 'danger', reason: true },
  ],
  ready: [{ to: 'completed', label: 'Complete', variant: 'primary' }],
  completed: [],
  rejected: [],
  cancelled: [],
}

export function isOrderClosed(status: OrderStatus): boolean {
  return status === 'completed' || status === 'rejected' || status === 'cancelled'
}

/** Compact action set for queue rows: accept/reject on new orders, one forward step otherwise. */
export function quickOrderActions(status: OrderStatus): OrderAction[] {
  if (isOrderClosed(status)) return []
  const actions = ORDER_ACTIONS[status]
  return status === 'received' ? actions : actions.slice(0, 1)
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim()
  return fallback
}
