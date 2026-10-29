'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getUser } from '@/lib/auth'
import { fail, invalid, ok } from '@/lib/action-result'
import { getClientIp, hashIp } from '@/lib/security'
import { rateLimit } from '@/lib/rate-limit'
import { isHoneypotFilled, verifyTurnstileToken } from '@/lib/turnstile'
import { newRequestToken } from '@/lib/service-requests/token'
import { sendCustomerEmail } from '@/lib/supply/order-requests-data'
import { ORDER_REQUEST_LIMITS, STATUS_LINK_DAYS, orderRequestSchema } from '@/lib/supply/order-requests'
import { tradeBasketOpen } from '@/lib/supply/trade-prices-data'
import { hagerlandInbox } from '@/lib/enquiries'
import { sendEmail } from '@/lib/email/send'
import { orderRequestInternalEmail } from '@/lib/email/templates'
import { canonicalUrl } from '@/lib/site'
import { todayInAddis } from '@/lib/supply/shortlist'
import { log } from '@/lib/log'
import type { Database } from '@/lib/database.types'
import type { OrderRequestState } from '@/app/actions/order-request-actions'

// The generated types mark every SQL argument as required; these may be NULL, which order_request_submit (0049) accepts.
type SubmitArgs = Database['public']['Functions']['order_request_submit']['Args']

const FAILED = 'Something went wrong. Please refresh the page.'

const idsSchema = z.array(z.uuid()).min(1).max(50)
const itemsSchema = z
  .array(z.object({ product_id: z.uuid(), quantity: z.number().min(0.01).max(1_000_000) }))
  .min(1)
  .max(50)
// The S6-2 form without its single product and quantity: the basket items come instead.
const detailsSchema = orderRequestSchema.omit({ product_id: true, quantity: true })

/** S6-4: may this signed-in trade customer order every item in their basket now? Everyone else: no (the button is absent). */
export async function tradeBasketOpenAction(productIds: string[]): Promise<boolean> {
  const ids = idsSchema.safeParse(productIds)
  const user = await getUser()
  if (!ids.success || !user) return false
  return tradeBasketOpen(user.id, ids.data)
}

/**
 * S6-4 "Request to order these items": one order request with every basket item, through the S6-2 step unchanged (the
 * owner reserves it, then it splits into one supplier order per partner). Nothing is paid now. Same protections as the
 * S6-2 form: honeypot, rate limits per visitor and the security check.
 */
export async function submitTradeOrderAction(_prev: OrderRequestState, formData: FormData): Promise<OrderRequestState> {
  if (isHoneypotFilled(formData)) return ok({ reference: 'HLR-0', path: '/supplies' })
  const user = await getUser()
  if (!user) return fail(FAILED)
  let rawItems: unknown
  try {
    rawItems = JSON.parse(String(formData.get('items') ?? '[]'))
  } catch {
    return fail(FAILED)
  }
  const items = itemsSchema.safeParse(rawItems)
  if (!items.success) return fail(FAILED)
  // The same product twice in a basket is one item with both quantities.
  const merged = new Map<string, number>()
  for (const i of items.data) merged.set(i.product_id, (merged.get(i.product_id) ?? 0) + i.quantity)
  const parsed = detailsSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  if (d.needed_by && d.needed_by < todayInAddis()) return fail('The "needed by" date is in the past.', { needed_by: 'Choose a future date' })

  const ip = getClientIp(await headers())
  const ipHash = hashIp(ip)
  const [hour, day] = await Promise.all([rateLimit(`order-req:h:${ipHash}`, ORDER_REQUEST_LIMITS.hour, 3600), rateLimit(`order-req:d:${ipHash}`, ORDER_REQUEST_LIMITS.day, 86_400)])
  if (!hour.allowed || !day.allowed) return fail('You have sent several requests recently. Please wait a little or call us.')
  if (!(await verifyTurnstileToken(formData.get('cf-turnstile-response') as string | null, ip))) return fail('Please complete the security check and try again.')

  // Switches, the approved account and every item are checked again here: a page left open from before is refused.
  if (!(await tradeBasketOpen(user.id, Array.from(merged.keys())))) return fail(FAILED)
  const db = getAdminSupabase()
  const { data: place } = await db.from('locations').select('id').eq('id', d.delivery_location_id).maybeSingle()
  if (!place) return fail('Please check the highlighted fields.', { delivery_location_id: 'Choose the location' })

  const link = newRequestToken()
  const { data, error } = await db
    .rpc('order_request_submit', {
      p_name: d.name,
      p_phone: d.phone,
      p_email: d.email ?? null,
      p_location: d.delivery_location_id,
      p_address: d.delivery_address,
      p_needed_by: d.needed_by ?? null,
      p_note: d.note ?? null,
      p_user: user.id,
      p_token_hash: link.hash,
      p_token_expires: new Date(Date.now() + STATUS_LINK_DAYS * 86_400_000).toISOString(),
      p_ip_hash: ipHash,
      p_lines: Array.from(merged, ([product_id, quantity]) => ({ product_id, quantity })),
    } as unknown as SubmitArgs)
    .single()
  const row = data as { id: string; reference: string } | null
  if (error || !row) {
    log.error('order-requests', 'trade basket request could not save', error)
    return fail('We could not save your request. Please try again.')
  }
  const path = `/supplies/order-requests/${link.token}`
  await sendCustomerEmail(row.id, 'received', { link: canonicalUrl(path) })
  const inbox = await hagerlandInbox('supply')
  if (inbox) await sendEmail({ to: inbox, from: 'supply', ...orderRequestInternalEmail({ reference: row.reference, adminUrl: canonicalUrl(`/roodber8/supply/order-requests/${row.id}`) }) })
  return ok({ reference: row.reference, path })
}
