import { notFound } from 'next/navigation'
import { getUser } from '@/lib/auth'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { hashRequestToken, isWellFormedToken } from '@/lib/service-requests/token'
import { expireDueOrderRequests, loadCustomerOrderRequest } from '@/lib/supply/order-requests-data'
import { activePaymentMethods } from '@/lib/supply/payment-methods-data'
import { referenceLine } from '@/lib/supply/payment-methods'
import { CUSTOMER_TEXT, customerStatusLabel } from '@/lib/supply/order-requests'
import { unitLabel } from '@/lib/units'
import { Container } from '@/components/ui/Layout'
import { FormAlert } from '@/components/forms/FormParts'
import { log } from '@/lib/log'

export const dynamic = 'force-dynamic'
const robots = { index: false, follow: false }

/** The request behind the address: a private link (anyone holding it), or the reference for the signed-in customer. */
async function requestIdFor(key: string): Promise<string | null> {
  const db = getAdminSupabase()
  if (isWellFormedToken(key)) {
    const { data } = await db.from('order_requests').select('id, access_token_expires_at').eq('access_token_hash', hashRequestToken(key)).maybeSingle()
    return data && data.access_token_expires_at && new Date(data.access_token_expires_at).getTime() > Date.now() ? data.id : null
  }
  if (!/^HLR-\d{4}-\d{6}$/.test(key)) return null
  const user = await getUser()
  if (!user) return null
  const { data } = await db.from('order_requests').select('id').eq('reference', key).eq('requester_user_id', user.id).maybeSingle()
  return data?.id ?? null
}

export async function generateMetadata(props: { params: Promise<{ key: string }> }) {
  const id = await requestIdFor((await props.params).key)
  const r = id ? await loadCustomerOrderRequest(id) : null
  return r ? { title: CUSTOMER_TEXT.heading(r.reference), robots, referrer: 'no-referrer' as const } : { robots }
}

/** S6-2: the customer's order request page (approved wording). Never the partner, the cost or HagerLand's notes. */
export default async function CustomerOrderRequestPage(props: { params: Promise<{ key: string }>; searchParams: Promise<{ sent?: string }> }) {
  const [{ key }, searchParams] = await Promise.all([props.params, props.searchParams])
  const id = await requestIdFor(key)
  if (!id) notFound()
  // Never show a stale "reserved": reservations whose time has passed end now (the hourly job does the same).
  try {
    await expireDueOrderRequests('customer page')
  } catch (err) {
    log.error('order-requests', 'expiry on page load failed', err)
  }
  const r = await loadCustomerOrderRequest(id)
  if (!r) notFound()
  // QC-2: the owner's active payment methods, in order (none: the section is left out).
  const methods = r.status === 'reserved' ? await activePaymentMethods() : []
  return (
    <Container className="max-w-2xl py-10 lg:py-16">
      {searchParams.sent === '1' && (
        <FormAlert tone="success" className="mb-6">
          {CUSTOMER_TEXT.success(r.reference)}
        </FormAlert>
      )}
      <h1 className="hl-h1">{CUSTOMER_TEXT.heading(r.reference)}</h1>
      <p className="mt-4 rounded-lg bg-green-tint p-4 font-semibold text-ink" data-testid="order-request-status">
        {customerStatusLabel({ status: r.status, reservedUntil: r.reservedUntil, totalCents: r.totalCents })}
      </p>
      <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-white">
        {r.lines.map((l) => {
          const qty = l.status === 'short' && l.confirmedQty !== null ? l.confirmedQty : l.quantity
          return (
            <li key={l.id} className="flex flex-wrap justify-between gap-2 px-4 py-3">
              <span className={l.status === 'unavailable' ? 'text-muted line-through' : 'text-ink'}>{l.itemName}</span>
              <span className="text-muted">
                {qty} {unitLabel(l.unit, qty)}
              </span>
            </li>
          )
        })}
      </ul>
      {r.status === 'reserved' && methods.length > 0 && (
        <section aria-labelledby="how-to-pay" className="mt-8">
          <h2 id="how-to-pay" className="hl-h3">
            {CUSTOMER_TEXT.howToPay}
          </h2>
          <ul className="mt-3 space-y-3">
            {methods.map((m) => (
              <li key={m.id} className="rounded-lg border border-border bg-white p-4" data-testid="how-to-pay-method">
                <p className="font-semibold text-ink">{m.name}</p>
                <p className="mt-1 whitespace-pre-line">{m.instructions}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3">{referenceLine(r.reference)}</p>
        </section>
      )}
    </Container>
  )
}
