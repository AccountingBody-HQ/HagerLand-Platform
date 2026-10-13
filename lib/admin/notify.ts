import 'server-only'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { orgManagerEmails, userEmail } from '@/lib/enquiries'

/** Email addresses of whoever owns a listing: the organisation's managers, or the private lister. */
export async function ownerEmails(orgId: string | null, userId: string | null): Promise<string[]> {
  if (orgId) {
    const emails = await orgManagerEmails(orgId)
    if (emails.length) return emails
  }
  if (userId) {
    const e = await userEmail(userId)
    return e ? [e] : []
  }
  return []
}

export async function firstName(userId: string | null): Promise<string> {
  if (!userId) return 'there'
  const { data } = await getAdminSupabase().from('profiles').select('full_name').eq('id', userId).maybeSingle()
  return data?.full_name?.split(' ')[0] || 'there'
}
