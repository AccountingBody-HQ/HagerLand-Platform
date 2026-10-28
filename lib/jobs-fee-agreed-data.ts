import 'server-only'
// Jobs Phase 6: "Fee agreed in writing: Yes/No" for the Jobs insights (Operations and the owner). It reads only the
// placement and the fee status from the fee record (as the desk page does for Operations): never an amount, a currency,
// a date, a note or a document. Amounts are read only by lib/jobs-fee-report-data.ts, after the owner check.
import { getAdminSupabase } from '@/lib/supabase/admin'
import { must } from '@/lib/admin/must'

const AGREED = ['agreed', 'invoiced', 'paid']

/** The placements whose fee is agreed in writing (agreed, invoiced or paid). */
export async function placementsWithFeeAgreed(placementIds: string[]): Promise<Set<string>> {
  if (!placementIds.length) return new Set()
  const { data } = must(await getAdminSupabase().from('recruitment_fee_terms').select('placement_id, status').in('placement_id', placementIds).limit(20000))
  return new Set((data ?? []).filter((t) => AGREED.includes(t.status)).map((t) => t.placement_id))
}
