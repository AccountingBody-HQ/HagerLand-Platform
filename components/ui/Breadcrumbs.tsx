import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'
import { JsonLd } from '@/components/seo/JsonLd'
import { breadcrumbJsonLd } from '@/lib/seo'

export interface Crumb {
  label: string
  href?: string
}

export function Breadcrumbs({ items, className, inverse }: { items: Crumb[]; className?: string; inverse?: boolean }) {
  const all: Crumb[] = [{ label: 'Home', href: '/' }, ...items]
  return (
    <nav aria-label="Breadcrumb" className={cn('text-small', className)}>
      <ol className="flex flex-wrap items-center gap-x-1">
        {all.map((c, i) => {
          const last = i === all.length - 1
          return (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1">
              {c.href && !last ? (
                <Link href={c.href} className={cn('inline-flex min-h-11 items-center hover:underline', inverse ? 'text-white/75 hover:text-white' : 'text-muted hover:text-ink')}>
                  {c.label}
                </Link>
              ) : (
                <span aria-current={last ? 'page' : undefined} className={cn('line-clamp-1', inverse ? 'text-white' : 'text-ink')}>
                  {c.label}
                </span>
              )}
              {!last && <ChevronRight className={cn('size-4', inverse ? 'text-white/50' : 'text-subtle')} aria-hidden />}
            </li>
          )
        })}
      </ol>
      <JsonLd data={breadcrumbJsonLd(all)} />
    </nav>
  )
}
