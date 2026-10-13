import Link from 'next/link'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'gold' | 'danger' | 'inverse' | 'outline-inverse'
export type ButtonSize = 'sm' | 'md' | 'lg'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-green text-white hover:bg-green-dark active:bg-green-darker',
  secondary: 'border border-ink/80 bg-white text-ink hover:bg-stone-100',
  ghost: 'text-ink hover:bg-stone-100',
  gold: 'bg-gold text-white hover:bg-gold-dark',
  danger: 'bg-error text-white hover:bg-error/90',
  inverse: 'bg-white text-ink hover:bg-stone-100',
  'outline-inverse': 'border border-white/40 text-white hover:bg-white/10',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-small',
  md: 'h-11 px-5 text-[0.9375rem]',
  lg: 'h-12 px-6 text-body',
}

export function buttonClasses(opts: { variant?: ButtonVariant; size?: ButtonSize; fullWidth?: boolean; className?: string } = {}) {
  const { variant = 'primary', size = 'md', fullWidth, className } = opts
  return cn(
    'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold transition-colors disabled:pointer-events-none disabled:opacity-60 [&_svg]:size-[18px] [&_svg]:shrink-0',
    variants[variant],
    sizes[size],
    fullWidth && 'w-full',
    className,
  )
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, fullWidth, loading, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...rest}
    >
      {loading && <LoaderCircle className="animate-spin" aria-hidden />}
      {children}
    </button>
  )
})

export interface ButtonLinkProps {
  href: string
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  className?: string
  external?: boolean
  prefetch?: boolean
  'aria-label'?: string
}

export function ButtonLink({ href, children, variant, size, fullWidth, className, external, prefetch, ...rest }: ButtonLinkProps) {
  const classes = buttonClasses({ variant, size, fullWidth, className })
  if (external) {
    return (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={classes} prefetch={prefetch} {...rest}>
      {children}
    </Link>
  )
}

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { label: string; tone?: 'default' | 'inverse' }>(
  function IconButton({ label, tone = 'default', className, children, type = 'button', ...rest }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex size-11 shrink-0 items-center justify-center rounded-md transition-colors [&_svg]:size-5',
          tone === 'inverse' ? 'text-white hover:bg-white/10' : 'text-ink hover:bg-stone-100',
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    )
  },
)
