import 'server-only'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { newRequestToken } from './token'
import { sendEmail } from '@/lib/email/send'
import { serviceQuoteReceivedEmail } from '@/lib/email/templates'
import { canonicalUrl } from '@/lib/site'
import { formatMoney } from '@/lib/format'
import { isStaffingRequest } from '@/lib/jobs-desk-data'

/**
 * After a quote is saved on a match: the request becomes "quoted" and the customer is emailed, the same way whoever
 * quoted (a provider, or HagerLand's own team, spec 26.8). Returns whether the customer is a guest.
 */
export async function notifyCustomerOfQuote(match: { request_id: string; org_id: string }, amount: number, currency: string): Promise<{ guest: boolean }> {
  // Staffing requests are never quoted (Jobs Phase 3): no status change and no "quote" email, whoever calls this.
  if (await isStaffingRequest(match.request_id)) return { guest: false }
  const db = getAdminSupabase()
  const { data: r } = await db.from('service_requests').update({ status: 'quoted' }).eq('id', match.request_id).in('status', ['submitted', 'triaged', 'matched', 'quoted']).select('id, reference, name, email, requester_user_id').maybeSingle()
  const { data: org } = await db.from('organisations').select('name').eq('id', match.org_id).maybeSingle()
  if (r?.email) {
    let link = canonicalUrl(`/account/service-requests/${r.id}`)
    if (!r.requester_user_id) {
      // Only a hash of guest links is stored, so each quote email carries a fresh link (older links stop working).
      const t = newRequestToken()
      await db.from('service_requests').update({ access_token_hash: t.hash, access_token_expires_at: t.expiresAt }).eq('id', r.id)
      link = canonicalUrl(`/requests/${t.token}`)
    }
    await sendEmail({ to: r.email, ...serviceQuoteReceivedEmail({ name: r.name.split(' ')[0] || r.name, reference: r.reference, providerName: org?.name ?? 'A provider', amount: formatMoney(amount, currency, { decimals: Number.isInteger(amount) ? 0 : 2 }), link }) })
  }
  return { guest: !r?.requester_user_id }
}
