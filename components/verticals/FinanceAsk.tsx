import Link from 'next/link'
import { Landmark } from 'lucide-react'
import { getVertical } from '@/lib/data/verticals'
import { getRequestableCategory } from '@/lib/data/service-requests'

/** Where "Ask about financing" goes: a finance request when Finance is live, its interest form when coming soon. */
export async function financeAskHref(categorySlug: string): Promise<{ href: string; soon: boolean } | null> {
  const v = await getVertical('finance')
  if (!v) return null
  if (v.status === 'coming_soon') return { href: '/finance#register', soon: true }
  const c = await getRequestableCategory(categorySlug)
  return { href: c ? `/request-service/${c.slug}` : '/finance', soon: false }
}

/** "Ask about financing" for development and construction pages (PLATFORM_VISION §8, spec 24.7). */
export async function FinanceAsk({ categorySlug, text }: { categorySlug: string; text: string }) {
  const target = await financeAskHref(categorySlug)
  if (!target) return null
  return (
    <Link href={target.href} className="flex items-center gap-3 rounded-lg border border-border bg-white p-4 hover:border-green">
      <Landmark className="size-6 shrink-0 text-green" aria-hidden />
      <span>
        <span className="block font-semibold text-ink">Ask about financing{target.soon ? ' (coming soon)' : ''}</span>
        <span className="text-small text-muted">{text}</span>
      </span>
    </Link>
  )
}
