import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

function pageList(current: number, total: number): (number | 'gap')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set([1, total, current - 1, current, current + 1])
  const sorted = Array.from(pages).filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
  const out: (number | 'gap')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('gap')
    out.push(p)
  })
  return out
}

/** Numbered pagination. hrefFor(page) builds each link so filters stay in the URL. */
export function Pagination({ page, totalPages, hrefFor, className }: { page: number; totalPages: number; hrefFor: (page: number) => string; className?: string }) {
  if (totalPages <= 1) return null
  const item = 'inline-flex size-11 items-center justify-center rounded-md text-small font-semibold tabular-nums'
  return (
    <nav aria-label="Pagination" className={cn('flex items-center justify-center gap-1', className)}>
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={cn(item, 'hover:bg-stone-100')} aria-label="Previous page">
          <ChevronLeft className="size-5" />
        </Link>
      ) : (
        <span className={cn(item, 'text-subtle')} aria-hidden>
          <ChevronLeft className="size-5" />
        </span>
      )}
      {pageList(page, totalPages).map((p, i) =>
        p === 'gap' ? (
          <span key={`gap-${i}`} className="px-1 text-muted" aria-hidden>
            …
          </span>
        ) : p === page ? (
          <span key={p} aria-current="page" className={cn(item, 'bg-ink text-white')}>
            {p}
          </span>
        ) : (
          <Link key={p} href={hrefFor(p)} className={cn(item, 'hidden hover:bg-stone-100 sm:inline-flex')}>
            {p}
          </Link>
        ),
      )}
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={cn(item, 'hover:bg-stone-100')} aria-label="Next page">
          <ChevronRight className="size-5" />
        </Link>
      ) : (
        <span className={cn(item, 'text-subtle')} aria-hidden>
          <ChevronRight className="size-5" />
        </span>
      )}
    </nav>
  )
}
