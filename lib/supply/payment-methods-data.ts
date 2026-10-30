import 'server-only'
// QC-2: reads of the owner's payment methods (service role only: the table has no grants).
import { getAdminSupabase } from '@/lib/supabase/admin'
import { readAll, REPORT_MAX_ROWS } from '@/lib/admin/read-all'
import { activeInOrder, type PaymentMethod } from './payment-methods'

/** Every method, active or not, in the owner's order. Throws when the list cannot be read (the failure rule). */
export async function listPaymentMethods(): Promise<PaymentMethod[]> {
  const { data } = await readAll(() => getAdminSupabase().from('supply_payment_methods').select('id, name, instructions, active, sort_order, created_at').order('sort_order').order('created_at'), { maxRows: REPORT_MAX_ROWS })
  return data.map((r) => ({ id: r.id, name: r.name, instructions: r.instructions, active: r.active, sortOrder: r.sort_order }))
}

/** The methods customers see, in order. */
export async function activePaymentMethods(): Promise<PaymentMethod[]> {
  return activeInOrder(await listPaymentMethods())
}
