import 'server-only'
import { cache } from 'react'
import { getUser } from '@/lib/auth'
import { getAdminSupabase } from '@/lib/supabase/admin'

/**
 * S6-1: who may use the private partner area. A signed-in person with a partner_members row for a partner whose
 * registration is approved (a suspended partner is shut out). Partner members are separate from organisation members:
 * this never gives a business page, a team, claims or self-listing.
 */
export interface PartnerMembership {
  userId: string
  orgId: string
  businessName: string
}

export const getPartnerMembership = cache(async (): Promise<PartnerMembership | null> => {
  const user = await getUser()
  if (!user) return null
  const db = getAdminSupabase()
  const { data: members, error } = await db.from('partner_members').select('org_id').eq('user_id', user.id).order('created_at').limit(20)
  if (error || !members?.length) return null
  const { data: regs } = await db
    .from('partner_registrations')
    .select('org_id, business_name')
    .in('org_id', members.map((m) => m.org_id))
    .eq('status', 'approved')
    .limit(20)
  const reg = regs?.[0]
  return reg ? { userId: user.id, orgId: reg.org_id, businessName: reg.business_name } : null
})

/** A draft the signed-in partner member may change: their own partner's, in a state they may edit. */
export async function ownDraft(draftId: string): Promise<{ membership: PartnerMembership; draft: { id: string; org_id: string; status: string; photo_paths: string[] } | null } | null> {
  const membership = await getPartnerMembership()
  if (!membership) return null
  const { data } = await getAdminSupabase().from('partner_product_drafts').select('id, org_id, status, photo_paths').eq('id', draftId).maybeSingle()
  if (data && data.org_id !== membership.orgId) return null
  return { membership, draft: data }
}
