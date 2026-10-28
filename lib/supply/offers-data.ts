import 'server-only'
// Supplier offers (admin): reads for the Offers page, partner counts and the expiring list. Service role only: the
// table has no grants, so nothing here is reachable by visitors, customers or suppliers.
import { getAdminSupabase } from '@/lib/supabase/admin'
import { inChunks } from '@/lib/admin/in-chunks'
import { must } from '@/lib/admin/must'
import type { Database } from '@/lib/database.types'
import { addDays } from './offers'

export type OfferRow = Database['public']['Tables']['supplier_offers']['Row']

export interface OfferCounts {
  current: number
  expiringSoon: number
  expired: number
}

export const EXPIRING_DAYS = 7

export function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Current prices per partner: total, expiring within 7 days (not yet expired) and already expired. */
export async function offerCounts(orgIds?: string[]): Promise<Map<string, OfferCounts>> {
  const base = () => getAdminSupabase().from('supplier_offers').select('org_id, valid_until').eq('status', 'current').limit(50_000)
  // Tidy T-2 (T2-15): a long list of partners is read in parts of 50, with the failure rule.
  const data = orgIds ? await inChunks(orgIds, (part) => base().in('org_id', part)) : must(await base()).data
  const now = today()
  const soon = addDays(now, EXPIRING_DAYS)
  const out = new Map<string, OfferCounts>()
  for (const r of data ?? []) {
    const c = out.get(r.org_id) ?? { current: 0, expiringSoon: 0, expired: 0 }
    c.current++
    if (r.valid_until < now) c.expired++
    else if (r.valid_until <= soon) c.expiringSoon++
    out.set(r.org_id, c)
  }
  return out
}

/** Every offer of a partner (current first), with category and product names, for the Offers page and history. */
export async function partnerOffers(orgId: string): Promise<(OfferRow & { category_name: string | null; product_name: string | null })[]> {
  const { data } = await getAdminSupabase()
    .from('supplier_offers')
    .select('*, category:product_categories(name), product:products(name)')
    .eq('org_id', orgId)
    .order('price_date', { ascending: false })
    .order('captured_at', { ascending: false })
    .limit(2000)
  return (data ?? []).map(({ category, product, ...r }) => ({
    ...r,
    category_name: (category as { name: string } | null)?.name ?? null,
    product_name: (product as { name: string } | null)?.name ?? null,
  }))
}

export interface ExpiringRow {
  id: string
  orgId: string
  orgName: string
  item: string
  unit: string
  priceCents: number
  validUntil: string
  contact: { name: string; channel: string | null; phone: string | null } | 'do_not_contact' | null
}

/** Current prices that expire within 7 days or have already expired, with whom to call (never a do-not-contact person). */
export async function expiringOffers(): Promise<ExpiringRow[]> {
  const db = getAdminSupabase()
  const { data } = await db
    .from('supplier_offers')
    .select('id, org_id, item_name, unit, price_etb_cents, valid_until, product:products(name), org:organisations(name)')
    .eq('status', 'current')
    .lte('valid_until', addDays(today(), EXPIRING_DAYS))
    .order('valid_until')
    .limit(2000)
  const orgIds = Array.from(new Set((data ?? []).map((r) => r.org_id)))
  // Tidy T-2 (T2-15): in parts of 50 (one partner's contacts stay together, in date order), with the failure rule.
  const [contacts, partners] = await Promise.all([
    inChunks(orgIds, (part) => db.from('supply_contacts').select('org_id, name, preferred_channel, phone, phone_normalised, whatsapp, do_not_contact, created_at').in('org_id', part).order('created_at')),
    inChunks(orgIds, (part) => db.from('supply_partners').select('org_id, relationship_status').in('org_id', part)),
  ])
  const blocked = new Set(partners.filter((p) => p.relationship_status === 'do_not_contact').map((p) => p.org_id))
  return (data ?? []).map((r) => {
    const people = contacts.filter((c) => c.org_id === r.org_id)
    const reachable = people.filter((c) => !c.do_not_contact)
    const best = reachable.find((c) => c.preferred_channel) ?? reachable[0]
    const contact: ExpiringRow['contact'] = blocked.has(r.org_id) || (people.length > 0 && !best) ? 'do_not_contact' : best ? { name: best.name, channel: best.preferred_channel, phone: best.preferred_channel === 'whatsapp' && best.whatsapp ? best.whatsapp : best.phone_normalised ?? best.phone } : null
    return {
      id: r.id,
      orgId: r.org_id,
      orgName: (r.org as { name: string } | null)?.name ?? '',
      item: r.item_name ?? (r.product as { name: string } | null)?.name ?? '',
      unit: r.unit,
      priceCents: r.price_etb_cents,
      validUntil: r.valid_until,
      contact,
    }
  })
}
