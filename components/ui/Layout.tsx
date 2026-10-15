import type { ElementType, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Container({ children, className, as: Tag = 'div' }: { children: ReactNode; className?: string; as?: ElementType }) {
  return <Tag className={cn('mx-auto w-full max-w-content px-4 sm:px-6 lg:px-8', className)}>{children}</Tag>
}

type Tone = 'white' | 'stone' | 'ink' | 'tint'
const tones: Record<Tone, string> = {
  white: 'bg-white',
  stone: 'bg-stone-50',
  ink: 'bg-ink text-white',
  tint: 'bg-green-tint',
}

export function Section({
  children,
  tone = 'white',
  className,
  containerClassName,
  id,
  labelledBy,
  compact,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
  containerClassName?: string
  id?: string
  labelledBy?: string
  compact?: boolean
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn(tones[tone], compact ? 'py-10 sm:py-14' : 'py-14 sm:py-20', className)}>
      <Container className={containerClassName}>{children}</Container>
    </section>
  )
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  id,
  inverse,
  className,
  as: Tag = 'h2',
}: {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  id?: string
  inverse?: boolean
  className?: string
  as?: 'h1' | 'h2' | 'h3'
}) {
  return (
    <div className={cn('mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className={cn('hl-eyebrow mb-2', inverse ? 'text-gold' : 'text-green')}>{eyebrow}</p>}
        <Tag id={id} className={cn(Tag === 'h1' ? 'hl-h1' : 'hl-h2', inverse && 'text-white')}>
          {title}
        </Tag>
        {description && <p className={cn('mt-3 text-body', inverse ? 'text-white/75' : 'text-muted')}>{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function Card({ children, className, as: Tag = 'div' }: { children: ReactNode; className?: string; as?: ElementType }) {
  return <Tag className={cn('rounded-lg border border-border bg-white shadow-sm', className)}>{children}</Tag>
}

export function Stat({ label, value, hint, className }: { label: ReactNode; value: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-lg border border-border bg-white p-4', className)}>
      <p className="text-small text-muted">{label}</p>
      <p className="mt-1 font-display text-h2 font-bold tabular-nums text-ink">{value}</p>
      {hint && <p className="mt-1 text-caption text-muted">{hint}</p>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-stone-200', className)} aria-hidden />
}

export function EmptyState({
  icon,
  title,
  description,
  actions,
  className,
}: {
  icon?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center rounded-lg border border-dashed border-border-strong bg-stone-50 px-6 py-12 text-center', className)}>
      {icon && <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-white text-green shadow-xs [&_svg]:size-6">{icon}</div>}
      <h3 className="hl-h3">{title}</h3>
      {description && <p className="mt-2 max-w-md text-muted">{description}</p>}
      {actions && <div className="mt-6 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:justify-center [&>*]:flex-1">{actions}</div>}
    </div>
  )
}
