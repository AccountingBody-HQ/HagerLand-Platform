import 'server-only'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { hagerlandInbox } from '@/lib/enquiries'
import { sendEmail } from '@/lib/email/send'
import { adminNoticeEmail } from '@/lib/email/templates'
import { canonicalUrl } from '@/lib/site'
import { log } from '@/lib/log'

/**
 * A repair request for a property HagerLand manages, raised by its tenant or its owner (spec 26.6, 26.7). It goes into
 * the Repair & Maintain service request engine (Pillar 4), where admin can assign HagerLand's own team or a provider,
 * and is recorded in the property's maintenance log.
 */
export async function createManagedRepairRequest(r: {
  managedPropertyId: string
  propertyTitle: string
  locationId: string | null
  by: 'tenant' | 'owner'
  userId: string
  name: string
  phone: string
  email: string | null
  title: string
  details: string
  emergency: boolean
}): Promise<{ reference: string } | null> {
  const db = getAdminSupabase()
  const { data: cat } = await db.from('service_categories').select('id').eq('slug', r.emergency ? 'emergency-repairs' : 'general-handyman').maybeSingle()
  const { data: req, error } = await db
    .from('service_requests')
    .insert({
      vertical_key: 'repairs-maintenance',
      service_category_id: cat?.id ?? null,
      title: `${r.title} (${r.propertyTitle})`.slice(0, 160),
      details: r.details,
      answers: { managed_property: r.managedPropertyId, raised_by: r.by },
      urgency: r.emergency ? 'emergency' : 'within_week',
      location_id: r.locationId,
      requester_user_id: r.userId,
      name: r.name,
      phone: r.phone,
      email: r.email,
      source: r.by === 'owner' ? 'owner_portal' : 'tenancy',
    })
    .select('id, reference')
    .single()
  if (error || !req) {
    log.error('maintenance', 'request insert failed', error)
    return null
  }
  await db.from('maintenance_log').insert({ managed_property_id: r.managedPropertyId, logged_on: new Date().toISOString().slice(0, 10), title: r.title.slice(0, 160), description: `Raised by the ${r.by} (${req.reference}). ${r.details}`.slice(0, 2000), status: 'planned', service_request_id: req.id })
  const to = Array.from(new Set([await hagerlandInbox('general'), process.env.ADMIN_DIGEST_EMAIL].filter((x): x is string => Boolean(x))))
  if (to.length)
    await sendEmail({
      to,
      ...adminNoticeEmail({
        subject: `${r.emergency ? 'EMERGENCY repair' : 'Repair request'} ${req.reference}: ${r.propertyTitle}`,
        heading: `Repair request from the ${r.by} of a managed property`,
        lines: [['Reference', req.reference], ['Property', r.propertyTitle], ['Problem', r.title], ['Raised by', `${r.name} (${r.by})`]],
        adminUrl: canonicalUrl(`/roodber8/service-requests/${req.id}`),
      }),
    })
  return { reference: req.reference }
}
