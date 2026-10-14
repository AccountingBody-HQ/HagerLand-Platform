'use client'

import Link from 'next/link'
import { Columns3, Landmark, Scale } from 'lucide-react'
import { SaveButton } from '@/components/saved/SaveButton'
import { useCompare } from '@/components/compare/useCompare'
import { useToast } from '@/components/ui/Toast'
import { COMPARE_MAX } from '@/lib/compare'
import { cn } from '@/lib/cn'

const btn = 'inline-flex min-h-11 items-center gap-2 rounded-md border border-border-strong bg-white px-4 font-semibold text-ink hover:bg-stone-100'

/** Save, compare, request a valuation and ask about financing (spec 24.7). */
export function PropertyActions({ id, slug, title, valuationHref, financeHref, financeSoon }: { id: string; slug: string; title: string; valuationHref: string | null; financeHref: string | null; financeSoon: boolean }) {
  const { list, toggle } = useCompare()
  const toast = useToast()
  const inCompare = list.some((x) => x.id === id)
  return (
    <div className="flex flex-wrap gap-2">
      <SaveButton entityType="property" entityId={id} />
      <button
        type="button"
        aria-pressed={inCompare}
        className={cn(btn, inCompare && 'border-ink bg-ink text-white hover:bg-ink')}
        onClick={() => {
          if (toggle({ id, slug, title })) toast(`You can compare up to ${COMPARE_MAX} properties. Remove one first.`, 'error')
        }}
      >
        <Columns3 className="size-5" aria-hidden /> {inCompare ? 'In compare list' : 'Compare'}
      </button>
      {valuationHref && (
        <Link href={valuationHref} className={btn}>
          <Scale className="size-5" aria-hidden /> Request a valuation
        </Link>
      )}
      {financeHref && (
        <Link href={financeHref} className={btn}>
          <Landmark className="size-5" aria-hidden /> Ask about financing{financeSoon ? ' (coming soon)' : ''}
        </Link>
      )}
    </div>
  )
}
