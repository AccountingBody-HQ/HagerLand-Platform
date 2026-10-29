'use server'

/** Admin area these actions belong to (Trade accounts); every action also calls assertOwner(): trade prices are the owner's. */
const AREA = '/roodber8/trade-accounts'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { adminActor, assertAdmin, assertOwner, audit } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { STALE_EDIT } from '@/lib/concurrency'
import { agreementError, agreementInputSchema, agreementRow, belowPayable } from '@/lib/supply/trade-prices'
import { payableFloor } from '@/lib/supply/trade-prices-data'
import { formatETBCents } from '@/lib/format'

type Msg = ActionResult<{ message: string }>

/**
 * Owner: a trade price for one approved trade account: an agreed price for a product, or a price or discount for a
 * category, with its dates. The database refuses overlaps and any price below what HagerLand pays the partner. Nothing
 * is sent to the customer; they see it only while trade pricing is on.
 */
export async function addTradePriceAction(tradeAccountId: string, input: Record<string, unknown>): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  if (!z.uuid().safeParse(tradeAccountId).success) return fail('Trade account not found.')
  const parsed = agreementInputSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the trade price.')
  const row = agreementRow(parsed.data)
  const db = getAdminSupabase()
  const { data: account } = await db.from('trade_accounts').select('id, reference, status').eq('id', tradeAccountId).maybeSingle()
  if (!account) return fail('Trade account not found.')
  if (account.status !== 'approved') return fail('Trade prices are for approved trade accounts only.')
  // The no-loss check first, in plain words (the database checks it again, for categories too).
  if (row.product_id && row.price_cents !== null) {
    const floor = await payableFloor(row.product_id)
    if (belowPayable(row.price_cents, floor)) return fail(`Below what HagerLand pays the partner (${formatETBCents(floor)}). Choose a higher price.`)
  }
  const { data, error } = await db
    .from('trade_price_agreements')
    .insert({ trade_account_id: tradeAccountId, ...row, created_by: (await adminActor()).slice(0, 120) })
    .select('id')
    .single()
  if (error || !data) return fail(agreementError(error?.message))
  await audit('trade_price.add', { type: 'trade_price_agreement', id: data.id, label: account.reference }, {
    product: row.product_id,
    category: row.category_id,
    price_cents: row.price_cents,
    discount_bps: row.discount_bps,
    from: row.valid_from,
    until: row.valid_until,
  })
  revalidatePath(`/roodber8/trade-accounts/${tradeAccountId}`)
  return ok({ message: 'Trade price saved.' })
}

const endSchema = z.object({ reason: z.string().trim().min(2, 'Enter the reason').max(500), expectedUpdatedAt: z.string().min(1) })

/** Owner: end an agreement (kept, with the reason). From the next price check the customer no longer gets it. */
export async function endTradePriceAction(id: string, input: z.input<typeof endSchema>): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const parsed = endSchema.safeParse(input)
  if (!z.uuid().safeParse(id).success || !parsed.success) return fail(parsed.success ? 'Trade price not found.' : (parsed.error.issues[0]?.message ?? 'Enter the reason'))
  const db = getAdminSupabase()
  const { data: a } = await db.from('trade_price_agreements').select('id, trade_account_id, status, updated_at').eq('id', id).maybeSingle()
  if (!a) return fail('Trade price not found.')
  if (a.status !== 'active' || new Date(a.updated_at).getTime() !== new Date(parsed.data.expectedUpdatedAt).getTime()) return fail(STALE_EDIT)
  const { error } = await db.from('trade_price_agreements').update({ status: 'ended', end_reason: parsed.data.reason, ended_at: new Date().toISOString() }).eq('id', id).eq('status', 'active')
  if (error) return fail(agreementError(error.message))
  await audit('trade_price.end', { type: 'trade_price_agreement', id }, { reason: parsed.data.reason })
  revalidatePath(`/roodber8/trade-accounts/${a.trade_account_id}`)
  return ok({ message: 'Trade price ended.' })
}
