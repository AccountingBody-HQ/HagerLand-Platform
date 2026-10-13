import { formatETB } from '@/lib/format'
import { cn } from '@/lib/cn'

export function PriceLine({ price, period, onRequest, negotiable, className, size = 'md' }: { price: number | null; period: string | null; onRequest: boolean | null; negotiable: boolean | null; className?: string; size?: 'md' | 'lg' }) {
  return (
    <p className={cn('flex flex-wrap items-baseline gap-x-2 font-display font-bold tabular-nums text-ink', size === 'lg' ? 'text-h2 lg:text-h2-lg' : 'text-h3', className)}>
      {onRequest || price === null ? <span>Price on request</span> : <span>{formatETB(price)}</span>}
      {!onRequest && price !== null && period === 'month' && <span className="text-small font-semibold text-muted">/month</span>}
      {negotiable && !onRequest && <span className="rounded-full border border-border-strong px-2 py-0.5 font-sans text-caption font-semibold text-muted">Negotiable</span>}
    </p>
  )
}
