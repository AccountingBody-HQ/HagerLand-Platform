import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

export function SafetyTips({ variant = 'property' }: { variant?: 'property' | 'offplan' }) {
  return (
    <aside className="flex gap-4 rounded-lg border border-gold/30 bg-gold-soft/60 p-5" aria-label="Safety tips">
      <ShieldCheck className="size-6 shrink-0 text-gold-dark" aria-hidden />
      <div className="text-small text-ink">
        <p className="font-semibold">Stay safe</p>
        <p className="mt-1">
          {variant === 'offplan'
            ? "Check the developer's licence and the project's permits, and never pay without a signed contract."
            : 'Never pay a deposit before viewing and verifying ownership documents. Ask to see the title deed (carta) and lease documents.'}{' '}
          <Link href="/help#safety" className="font-semibold text-ink underline">
            More safety advice
          </Link>
        </p>
      </div>
    </aside>
  )
}
