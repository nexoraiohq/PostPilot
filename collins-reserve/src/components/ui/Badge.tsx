import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

type Tone = 'neutral' | 'success' | 'error' | 'champagne' | 'ink' | 'info'

const tones: Record<Tone, string> = {
  neutral: 'bg-line/60 text-stone',
  success: 'bg-success-soft text-success',
  error: 'bg-error-soft text-error',
  champagne: 'bg-champagne-soft/70 text-champagne-text',
  ink: 'bg-ink text-ivory',
  info: 'bg-[#e9eef5] text-[#33506e]',
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-medium tracking-[0.08em] uppercase',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}
