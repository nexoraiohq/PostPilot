import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet'
type Size = 'sm' | 'md' | 'lg'

const base =
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-normal tracking-[-0.01em] transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] select-none'

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-ivory hover:bg-ink-soft shadow-[0_1px_0_rgba(23,23,21,0.06)]',
  secondary: 'border border-ink/15 bg-transparent text-ink hover:border-ink/40 hover:bg-ink/[0.03]',
  ghost: 'bg-transparent text-ink hover:bg-ink/[0.05]',
  danger: 'bg-error text-white hover:bg-error/90',
  quiet: 'bg-ivory text-ink border border-line hover:bg-paper',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-[14px]',
  md: 'h-11 px-6 text-[17px]',
  lg: 'h-13 px-8 text-[17px]',
}

export function buttonStyles(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className)
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading = false, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={buttonStyles(variant, size, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
})

export interface LinkButtonProps extends LinkProps {
  variant?: Variant
  size?: Size
}

export function LinkButton({ className, variant = 'primary', size = 'md', ...props }: LinkButtonProps) {
  return <Link className={buttonStyles(variant, size, className)} {...props} />
}
