'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { pillarForPath } from '@/lib/pillars'
import { stripLocale } from '@/lib/i18n/config'
import { useI18n } from '@/lib/i18n/client'

/** On every deeper page, a link back to the pillar hub it belongs to (spec 26.2). Hidden on the hubs themselves. */
export function PillarTrail({ pillars }: { pillars: { key: string; name: string; slug: string }[] }) {
  const raw = usePathname() ?? '/'
  const { t, href } = useI18n()
  const path = stripLocale(raw)
  const key = pillarForPath(path)
  const p = key ? pillars.find((x) => x.key === key) : null
  if (!p || path === `/${p.slug}`) return null
  return (
    <nav aria-label={t('Part of')} className="border-b border-border bg-stone-50">
      <div className="mx-auto flex max-w-content items-center px-4 sm:px-6 lg:px-8">
        <Link href={href(`/${p.slug}`)} className="inline-flex min-h-11 items-center gap-2 text-small font-semibold text-green-darker hover:underline">
          <ArrowLeft className="size-4" aria-hidden />
          {t('Part of')} {t(p.name)}
        </Link>
      </div>
    </nav>
  )
}
