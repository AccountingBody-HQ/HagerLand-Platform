import 'server-only'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { hagerlandInbox } from '@/lib/enquiries'
import { sendEmail } from '@/lib/email/send'
import { partnerRegistrationInternalEmail } from '@/lib/email/templates'
import { canonicalUrl } from '@/lib/site'

/** The places and categories on a registration exist (ids from the form are never trusted). */
export async function checkPartnerPlaces(d: { city_id?: string; subcity_id?: string; woreda_id?: string; category_ids: string[] }): Promise<
  { ok: true; categoryIds: string[] } | { ok: false; fieldErrors: Record<string, string> }
> {
  const db = getAdminSupabase()
  const places = [d.city_id, d.subcity_id, d.woreda_id].filter((v): v is string => Boolean(v))
  const [{ data: found }, { data: cats }] = await Promise.all([
    places.length ? db.from('locations').select('id').in('id', places) : Promise.resolve({ data: [] as { id: string }[] }),
    d.category_ids.length ? db.from('product_categories').select('id').in('id', d.category_ids) : Promise.resolve({ data: [] as { id: string }[] }),
  ])
  const known = new Set((found ?? []).map((l) => l.id))
  const fieldErrors: Record<string, string> = {}
  if (d.city_id && !known.has(d.city_id)) fieldErrors.city_id = 'Choose the location'
  if (d.subcity_id && !known.has(d.subcity_id)) fieldErrors.subcity_id = 'Choose the location'
  if (d.woreda_id && !known.has(d.woreda_id)) fieldErrors.woreda_id = 'Choose the location'
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors }
  const allowed = new Set((cats ?? []).map((c) => c.id))
  return { ok: true, categoryIds: d.category_ids.filter((id) => allowed.has(id)) }
}

/** Tells the HagerLand Supply inbox (never the partner or anyone else). A failed email is queued, never thrown. */
export async function notifyNewRegistration(p: { id: string; reference: string; business: string; roles: string }): Promise<void> {
  const inbox = await hagerlandInbox('supply')
  if (!inbox) return
  await sendEmail({ to: inbox, from: 'supply', ...partnerRegistrationInternalEmail({ reference: p.reference, business: p.business, roles: p.roles, adminUrl: canonicalUrl(`/roodber8/supply/registrations/${p.id}`) }) })
}
