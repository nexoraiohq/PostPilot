import { Minus, Plus } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface QtyStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  className?: string
  size?: 'sm' | 'md'
  /** Item name for the screen-reader labels (e.g. "Dry-Aged Sirloin"). */
  label?: string
}

export function QtyStepper({ value, onChange, min = 0, max = 20, className, size = 'md', label }: QtyStepperProps) {
  const name = label ? ` of ${label}` : ''
  const btn =
    'flex items-center justify-center rounded-full text-ink transition-colors hover:bg-ink/5 disabled:opacity-30 disabled:hover:bg-transparent'
  return (
    <div className={cn('inline-flex items-center gap-1 rounded-full border border-line bg-paper', size === 'sm' ? 'p-0.5' : 'p-1', className)}>
      <button
        type="button"
        aria-label={`Decrease quantity${name}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={cn(btn, size === 'sm' ? 'size-7' : 'size-9')}
      >
        <Minus className={size === 'sm' ? 'size-3.5' : 'size-4'} aria-hidden />
      </button>
      <span className={cn('min-w-6 text-center font-medium tabular-nums', size === 'sm' ? 'text-[13px]' : 'text-sm')} aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        aria-label={`Increase quantity${name}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={cn(btn, size === 'sm' ? 'size-7' : 'size-9')}
      >
        <Plus className={size === 'sm' ? 'size-3.5' : 'size-4'} aria-hidden />
      </button>
    </div>
  )
}
