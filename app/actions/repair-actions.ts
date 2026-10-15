'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getProfile, requireUser } from '@/lib/auth'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { rateLimit } from '@/lib/rate-limit'
import { checkbox, textSchema } from '@/lib/validation/common'
import { createManagedRepairRequest } from '@/lib/maintenance'
import { serviceOn } from '@/lib/pillars'
import { getPillars } from '@/lib/data/pillars'

export type RepairState = ActionResult<{ reference: string }> | null

const schema = z.object({
  title: textSchema(160, { min: 3, label: 'What is the problem' }),
  details: textSchema(2000, { min: 10, label: 'Details' }),
  emergency: checkbox,
})

/**
 * A tenant of a tenancy HagerLand manages, or the owner of a managed property, reports a repair (spec 26.6, 26.7).
 * Ownership is checked on the server: the tenancy's tenant account, or the managed property's linked owner account.
 */
export async function reportRepairAction(source: 'tenancy' | 'owner', recordId: string, _prev: RepairState, formData: FormData): Promise<RepairState> {
  const user = await requireUser('/account')
  if (!z.uuid().safeParse(recordId).success) return fail('Not found.')
  const p = schema.safeParse(Object.fromEntries(formData))
  if (!p.success) return invalid(p.error)
  if (!(await rateLimit(`repair:${user.id}`, 10, 86_400)).allowed) return fail('You have reported several repairs today. Please call us if it is urgent.')
  const db = getAdminSupabase()
  let managed: { id: string; title: string; location_id: string | null } | null = null
  if (source === 'tenancy') {
    const { data: t } = await db.from('tenancies').select('tenant_user_id, status, managed:managed_properties(id, title, location_id, status), tenant:agency_contacts!tenancies_tenant_contact_id_fkey(email, user_id)').eq('id', recordId).maybeSingle()
    const m = Array.isArray(t?.managed) ? t?.managed[0] : t?.managed
    const tenant = Array.isArray(t?.tenant) ? t?.tenant[0] : t?.tenant
    // The tenant's own account, or the tenant contact's confirmed email (tenancies created from guest applications).
    const isTenant = t && (t.tenant_user_id === user.id || tenant?.user_id === user.id || (Boolean(user.email_confirmed_at) && Boolean(tenant?.email) && tenant?.email?.toLowerCase() === user.email?.toLowerCase()))
    if (!t || !isTenant || !m || t.status !== 'active') return fail('Repairs for this tenancy are not handled by HagerLand. Please contact your landlord.')
    managed = m
  } else {
    if (!serviceOn(await getPillars(), 'manage', 'owner-portal')) return fail('The owner portal is not available at the moment.')
    const { data: m } = await db.from('managed_properties').select('id, title, location_id, owner_user_id, status').eq('id', recordId).maybeSingle()
    if (!m || m.owner_user_id !== user.id || m.status === 'ended') return fail('Not found.')
    managed = m
  }
  if (!managed) return fail('Not found.')
  const profile = await getProfile()
  const phone = profile?.phone ?? null
  if (!phone) return fail('Add your phone number in Settings first, so we can reach you about the repair.')
  const res = await createManagedRepairRequest({ managedPropertyId: managed.id, propertyTitle: managed.title, locationId: managed.location_id, by: source === 'tenancy' ? 'tenant' : 'owner', userId: user.id, name: profile?.full_name ?? user.email ?? 'Customer', phone, email: user.email ?? null, title: p.data.title, details: p.data.details, emergency: p.data.emergency })
  if (!res) return fail('We could not send your request. Please try again or call us.')
  revalidatePath('/account/agency')
  revalidatePath('/owner', 'layout')
  return ok({ reference: res.reference })
}
