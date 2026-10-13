import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

export const controlClasses =
  'block w-full rounded-sm border border-border-strong bg-white px-3.5 text-body text-ink shadow-xs placeholder:text-subtle transition-colors focus:border-green focus:outline-none focus:ring-2 focus:ring-green/25 disabled:bg-stone-100 disabled:text-muted aria-[invalid=true]:border-error aria-[invalid=true]:focus:ring-error/20'

export interface FieldProps {
  label: ReactNode
  htmlFor: string
  hint?: ReactNode
  error?: string
  required?: boolean
  optional?: boolean
  className?: string
  children: ReactNode
}

/** Label + control + hint/error, wired together for screen readers. */
export function Field({ label, htmlFor, hint, error, required, optional, className, children }: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-small font-semibold text-ink">
        {label}
        {required && <span className="text-error" aria-hidden> *</span>}
        {optional && <span className="font-normal text-muted"> (optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-small text-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-small text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function describedBy(id: string, error?: string, hint?: ReactNode): string | undefined {
  if (error) return `${id}-error`
  if (hint) return `${id}-hint`
  return undefined
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input(
  { className, invalid, ...rest },
  ref,
) {
  return <input ref={ref} aria-invalid={invalid || undefined} className={cn(controlClasses, 'h-11', className)} {...rest} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className, invalid, rows = 5, ...rest }, ref) {
    return <textarea ref={ref} rows={rows} aria-invalid={invalid || undefined} className={cn(controlClasses, 'py-2.5', className)} {...rest} />
  },
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(function Select(
  { className, invalid, children, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(controlClasses, 'h-11 appearance-none pr-10', className)}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
    </div>
  )
})

export function Checkbox({ id, label, description, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { id: string; label: ReactNode; description?: ReactNode }) {
  return (
    <div className={cn('flex min-h-11 items-start gap-3 py-1', className)}>
      <input id={id} type="checkbox" className="mt-0.5 size-5 shrink-0 rounded border-border-strong accent-green" {...rest} />
      <label htmlFor={id} className="text-body leading-snug text-ink">
        {label}
        {description && <span className="mt-0.5 block text-small text-muted">{description}</span>}
      </label>
    </div>
  )
}

export function Radio({ id, label, description, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { id: string; label: ReactNode; description?: ReactNode }) {
  return (
    <div className={cn('flex min-h-11 items-start gap-3 py-1', className)}>
      <input id={id} type="radio" className="mt-0.5 size-5 shrink-0 accent-green" {...rest} />
      <label htmlFor={id} className="text-body leading-snug text-ink">
        {label}
        {description && <span className="mt-0.5 block text-small text-muted">{description}</span>}
      </label>
    </div>
  )
}

/** Min/max pair, e.g. price or area ranges. */
export function RangeInputs({
  name,
  label,
  minValue,
  maxValue,
  unit,
  minPlaceholder = 'No min',
  maxPlaceholder = 'No max',
}: {
  name: string
  label: string
  minValue?: string
  maxValue?: string
  unit?: string
  minPlaceholder?: string
  maxPlaceholder?: string
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-small font-semibold text-ink">
        {label}
        {unit && <span className="font-normal text-muted"> ({unit})</span>}
      </legend>
      <div className="flex items-center gap-2">
        <Input name={`${name}_min`} defaultValue={minValue} inputMode="numeric" placeholder={minPlaceholder} aria-label={`Minimum ${label.toLowerCase()}`} />
        <span className="text-muted" aria-hidden>–</span>
        <Input name={`${name}_max`} defaultValue={maxValue} inputMode="numeric" placeholder={maxPlaceholder} aria-label={`Maximum ${label.toLowerCase()}`} />
      </div>
    </fieldset>
  )
}
