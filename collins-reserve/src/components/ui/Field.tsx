import { forwardRef, useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

const fieldBase =
  'w-full rounded-xl border border-line bg-paper px-4 py-3 text-[15px] text-ink placeholder:text-stone/70 transition-colors duration-150 hover:border-stone/40 focus:border-ink/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50'

export interface FieldProps {
  label: string
  error?: string
  hint?: string
  required?: boolean
  className?: string
  children: (id: string) => React.ReactNode
}

export function Field({ label, error, hint, required, className, children }: FieldProps) {
  const id = useId()
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-[13px] font-medium text-ink">
        {label}
        {required && <span className="text-error"> *</span>}
      </label>
      {children(id)}
      {hint && !error && <p className="text-support text-stone">{hint}</p>}
      {error && (
        <p role="alert" className="text-support text-error">
          {error}
        </p>
      )}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...props }, ref) {
    return <input ref={ref} className={cn(fieldBase, invalid && 'border-error', className)} {...props} />
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className, invalid, ...props }, ref) {
    return <textarea ref={ref} className={cn(fieldBase, 'min-h-28 resize-y', invalid && 'border-error', className)} {...props} />
  },
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(
  function Select({ className, invalid, children, ...props }, ref) {
    return (
      <select ref={ref} className={cn(fieldBase, 'appearance-none pr-10', invalid && 'border-error', className)} {...props}>
        {children}
      </select>
    )
  },
)

export function Checkbox({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-3 text-[14px] text-ink', className)}>
      <input
        type="checkbox"
        className="mt-1 size-4 shrink-0 rounded border-line accent-ink"
        {...props}
      />
      <span className="leading-relaxed">{label}</span>
    </label>
  )
}
