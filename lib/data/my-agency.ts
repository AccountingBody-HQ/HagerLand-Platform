import 'server-only'
import type { User } from '@supabase/supabase-js'
import { getAdminSupabase } from '@/lib/supabase/admin'

/** A confirmed email that is safe to place in a PostgREST filter (no separators or quotes). */
function filterSafeEmail(user: User): string | null {
  const email = user.email?.toLowerCase() ?? ''
  return email && user.email_confirmed_at && /^[a-z0-9._+@-]+$/.test(email) ? email : null
}

/**
 * A signed-in customer's own agency records (spec 26.5): rows linked to their account, or sent as a guest from the
 * same confirmed email address. Read with the service role and filtered here on the server, so customers never see
 * staff-only columns (notes, referencing, feedback, fees).
 */
export async function getMyAgencyRecords(user: User) {
  const db = getAdminSupabase()
  const email = filterSafeEmail(user)
  const mine = email ? `user_id.eq.${user.id},email.eq.${email}` : `user_id.eq.${user.id}`
  const { data: contacts } = await db.from('agency_contacts').select('id').or(email ? `user_id.eq.${user.id},email.eq.${email}` : `user_id.eq.${user.id}`)
  const contactIds = (contacts ?? []).map((c) => c.id)
  const byContact = (userColumn: string, contactColumn: string) => (contactIds.length ? `${userColumn}.eq.${user.id},${contactColumn}.in.(${contactIds.join(',')})` : `${userColumn}.eq.${user.id}`)
  const [valuations, viewings, offers, applications, tenancies] = await Promise.all([
    db.from('agency_valuations').select('id, reference, purpose, status, appointment_at, value_low_etb, value_high_etb, created_at').or(byContact('user_id', 'contact_id')).order('created_at', { ascending: false }).limit(50),
    db.from('agency_viewings').select('id, reference, mode, status, scheduled_at, video_link, preferred_times, created_at, property:properties(title, slug)').or(mine).order('created_at', { ascending: false }).limit(50),
    db.from('agency_offers').select('id, reference, amount_etb, status, counter_amount_etb, created_at, property:properties(title, slug)').or(mine).order('created_at', { ascending: false }).limit(50),
    db.from('rental_applications').select('id, reference, status, move_in_date, created_at, property:properties(title, slug)').or(mine).order('created_at', { ascending: false }).limit(50),
    db.from('tenancies').select('id, reference, title, start_date, end_date, rent_minor, currency, rent_period, renewal_date, status, managed_property_id').or(byContact('tenant_user_id', 'tenant_contact_id')).order('start_date', { ascending: false }).limit(50),
  ])
  return { valuations: valuations.data ?? [], viewings: viewings.data ?? [], offers: offers.data ?? [], applications: applications.data ?? [], tenancies: tenancies.data ?? [] }
}
