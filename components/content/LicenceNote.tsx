import type { Licence } from '@/lib/data/business'
import { formatDate } from '@/lib/format'
import { LICENCE_LABELS, type LicenceKind } from '@/lib/validation/settings'
import { cn } from '@/lib/cn'

/** "Estate agency licence 123, issued by … to … on …" — one line from the settings fields that are filled in. */
export function licenceText(kind: LicenceKind, l: Licence): string {
  const name = kind === 'estate_agency' ? 'Estate agency licence' : `${LICENCE_LABELS[kind].replace(/ \(.*\)$/, '')} licence`
  return [`${name} ${l.number}`, l.authority && `issued by ${l.authority}`, l.holder && `to ${l.holder}`, l.date && `on ${formatDate(l.date)}`].filter(Boolean).join(', ')
}

/** Shows a licence or approval reference once AB has entered its number in admin → Settings (spec 26.1). */
export function LicenceNote({ kind, licence, className }: { kind: LicenceKind; licence: Licence | undefined; className?: string }) {
  if (!licence?.number) return null
  return <p className={cn('text-small text-muted', className)} data-testid={`licence-${kind}`}>{licenceText(kind, licence)}.</p>
}
