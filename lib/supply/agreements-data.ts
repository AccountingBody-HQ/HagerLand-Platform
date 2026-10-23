import 'server-only'
// Supply Phase 4 (admin): a partner's agreements, newest first. Owner only: call only after isOwnerSession().
import { getAdminSupabase } from '@/lib/supabase/admin'
import { privateFileLink } from './private-files'
import type { AgreementView } from '@/components/admin/SupplyAgreements'

export async function partnerAgreements(orgId: string): Promise<AgreementView[]> {
  const { data } = await getAdminSupabase().from('supply_agreements').select('*').eq('org_id', orgId).order('created_at', { ascending: false })
  return Promise.all(
    (data ?? []).map(async (a) => ({
      id: a.id,
      moneyModel: a.money_model,
      commissionBps: a.commission_rate_bps,
      paymentTerms: a.payment_terms,
      creditDays: a.credit_days,
      startDate: a.start_date,
      endDate: a.end_date,
      status: a.status,
      terminatedReason: a.terminated_reason,
      notes: a.notes,
      documentUrl: a.document_path ? await privateFileLink(a.document_path) : null,
      createdAt: a.created_at,
    })),
  )
}
