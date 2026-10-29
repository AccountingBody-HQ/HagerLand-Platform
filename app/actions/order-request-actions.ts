'use server'

import { headers } from 'next/headers'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getUser } from '@/lib/auth'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { getClientIp, hashIp } from '@/lib/security'
import { rateLimit } from '@/lib/rate-limit'
import { isHoneypotFilled, verifyTurnstileToken } from '@/lib/turnstile'
import { newRequestToken } from '@/lib/service-requests/token'
import { readSupplySwitches } from '@/lib/supply/partner-switches'
import { orderableProduct, sendCustomerEmail } from '@/lib/supply/order-requests-data'
import { ORDER_REQUEST_LIMITS, STATUS_LINK_DAYS, orderRequestSchema } from '@/lib/supply/order-requests'
import { hagerlandInbox } from '@/lib/enquiries'
import { sendEmail } from '@/lib/email/send'
import { orderRequestInternalEmail } from '@/lib/email/templates'
import { canonicalUrl } from '@/lib/site'
import { todayInAddis } from '@/lib/supply/shortlist'
import { log } from '@/lib/log'
import type { Database } from '@/lib/database.types'

// The generated types mark every SQL argument as required; these may be NULL, which order_request_submit (0049) accepts.
type SubmitArgs = Database['public']['Functions']['order_request_submit']['Args']

export type OrderRequestState = ActionResult<{ reference: string; path: string }> | null

const FAILED = 'Something went wrong. Please refresh the page.'

/**
 * S6-2 "Request to order" (public, no account needed). Nothing is paid: HagerLand checks stock first. One database step
 * makes the request and its item; the customer gets a private link to its page.
 */
export async function submitOrderRequestAction(_prev: OrderRequestState, formData: FormData): Promise<OrderRequestState> {
  if (isHoneypotFilled(formData)) return ok({ reference: 'HLR-0', path: '/supplies' })
  // The form is "not found" while the switch is off; a form left open from before is refused too (L6).
  if (!(await readSupplySwitches()).catalogueOrdering) return fail(FAILED)
  const parsed = orderRequestSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  if (d.needed_by && d.needed_by < todayInAddis()) return fail('The "needed by" date is in the past.', { needed_by: 'Choose a future date' })

  const ip = getClientIp(await headers())
  const ipHash = hashIp(ip)
  const [hour, day] = await Promise.all([rateLimit(`order-req:h:${ipHash}`, ORDER_REQUEST_LIMITS.hour, 3600), rateLimit(`order-req:d:${ipHash}`, ORDER_REQUEST_LIMITS.day, 86_400)])
  if (!hour.allowed || !day.allowed) return fail('You have sent several requests recently. Please wait a little or call us.')
  if (!(await verifyTurnstileToken(formData.get('cf-turnstile-response') as string | null, ip))) return fail('Please complete the security check and try again.')

  const db = getAdminSupabase()
  if (!(await orderableProduct(d.product_id))) return fail(FAILED)
  const { data: place } = await db.from('locations').select('id').eq('id', d.delivery_location_id).maybeSingle()
  if (!place) return fail('Please check the highlighted fields.', { delivery_location_id: 'Choose the location' })

  const user = await getUser()
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
      p_user: user?.id ?? null,
      p_token_hash: link.hash,
      p_token_expires: new Date(Date.now() + STATUS_LINK_DAYS * 86_400_000).toISOString(),
      p_ip_hash: ipHash,
      p_lines: [{ product_id: d.product_id, quantity: d.quantity }],
    } as unknown as SubmitArgs)
    .single()
  const row = data as { id: string; reference: string } | null
  if (error || !row) {
    log.error('order-requests', 'could not save', error)
    return fail('We could not save your request. Please try again.')
  }
  const path = `/supplies/order-requests/${link.token}`
  await sendCustomerEmail(row.id, 'received', { link: canonicalUrl(path) })
  const inbox = await hagerlandInbox('supply')
  if (inbox) await sendEmail({ to: inbox, from: 'supply', ...orderRequestInternalEmail({ reference: row.reference, adminUrl: canonicalUrl(`/roodber8/supply/order-requests/${row.id}`) }) })
  return ok({ reference: row.reference, path })
}
