import { formatETBCents } from '@/lib/format'
import { unitLabel } from '@/lib/units'

export function productPrice(p: { price_type: string | null; price_etb_cents: number | null; unit: string | null }): string {
  if (p.price_type === 'on_request' || p.price_etb_cents === null) return 'Price on request'
  return `${p.price_type === 'from' ? 'From ' : ''}${formatETBCents(p.price_etb_cents)} / ${unitLabel(p.unit)}`
}
