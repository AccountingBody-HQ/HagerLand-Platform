// S6-2 order requests, stock reservations and the payment window (migration 0049): the pure rules shared by the public
// form, the customer's status page, admin, the hourly job and the tests. The database enforces the same rules
// (order_request_transition_allowed, order_requests_guard); a unit test keeps the two lists equal.
// Customer wording is AB's approved text (S6-2 brief, section 3); errors reuse the site's existing texts.
import { z } from 'zod'
import { formatETBCents } from '@/lib/format'
import { unitLabel } from '@/lib/units'
import { nameSchema, optionalEmailSchema, optionalText, phoneSchema, textSchema } from '@/lib/validation/common'

export const ORDER_REQUEST_STATUSES = [
  'submitted',
  'checking_stock',
  'partially_reserved',
  'reserved',
  'paid',
  'fulfilling',
  'delivered',
  'completed',
  'unavailable',
  'expired',
  'cancelled',
  'refunded',
  'disputed',
] as const
export type OrderRequestStatus = (typeof ORDER_REQUEST_STATUSES)[number]

/** Allowed status changes (the same list as order_request_transition_allowed in 0049). */
export const ORDER_REQUEST_TRANSITIONS: Record<OrderRequestStatus, OrderRequestStatus[]> = {
  submitted: ['checking_stock', 'unavailable', 'cancelled'],
  checking_stock: ['partially_reserved', 'reserved', 'unavailable', 'cancelled'],
  partially_reserved: ['reserved', 'cancelled'],
  reserved: ['paid', 'expired', 'cancelled', 'refunded'],
  expired: ['checking_stock', 'cancelled', 'refunded'],
  paid: ['fulfilling', 'refunded'],
  fulfilling: ['delivered', 'refunded'],
  delivered: ['completed', 'disputed'],
  disputed: ['completed', 'refunded'],
  unavailable: [],
  cancelled: [],
  completed: [],
  refunded: [],
}
export function canMoveOrderRequest(from: OrderRequestStatus, to: OrderRequestStatus): boolean {
  return ORDER_REQUEST_TRANSITIONS[from]?.includes(to) ?? false
}
/** Set only by the database: "paid" (payments cover the total), "delivered"/"completed" (supplier orders), "expired". */
export const DATABASE_ONLY: OrderRequestStatus[] = ['paid', 'delivered', 'expired']
/** Stock outcomes Operations may record; everything about money is the owner's. */
export const OPERATIONS_MOVES: OrderRequestStatus[] = ['checking_stock', 'partially_reserved', 'unavailable', 'disputed']
/** Prices, items and holds may still change in these states. */
export const EDITABLE: OrderRequestStatus[] = ['submitted', 'checking_stock', 'partially_reserved', 'expired']
/** Finished: the keeping period may start counting. */
export const FINISHED: OrderRequestStatus[] = ['completed', 'cancelled', 'expired', 'unavailable', 'refunded']
/** The customer has money with HagerLand (or it is due) in these states. */
export const PAID_STATES: OrderRequestStatus[] = ['paid', 'fulfilling', 'delivered', 'disputed', 'completed']

/** Reservation length: 48 hours by default; the owner may choose 1–168 hours for each reservation (D5). */
export const DEFAULT_RESERVATION_HOURS = 48
export const MIN_RESERVATION_HOURS = 1
export const MAX_RESERVATION_HOURS = 168
export function reservationHours(input: unknown): number | null {
  const n = typeof input === 'number' ? input : typeof input === 'string' && input.trim() ? Number(input.trim()) : DEFAULT_RESERVATION_HOURS
  return Number.isInteger(n) && n >= MIN_RESERVATION_HOURS && n <= MAX_RESERVATION_HOURS ? n : null
}

/** "31 Oct 2026, 14:30" in Addis Ababa time (the customer wording adds "(Addis Ababa time)"). */
const addisFmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Addis_Ababa', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
export function addisDateTime(value: string | Date | null | undefined): string {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  return Number.isNaN(d.getTime()) ? '' : addisFmt.format(d)
}

/** Line total as the database rounds it: half up to the cent (0049 order_request_reserve, 0037 totals). */
export function lineTotalCents(unitPriceCents: number, quantity: number): number {
  return Math.round(unitPriceCents * quantity)
}
export function requestTotalCents(lines: { unitPriceCents: number | null; quantity: number | null }[], deliveryCents: number): number | null {
  if (lines.some((l) => l.unitPriceCents === null || l.quantity === null)) return null
  return lines.reduce((sum, l) => sum + lineTotalCents(l.unitPriceCents as number, l.quantity as number), 0) + deliveryCents
}

/** "Portland cement (30 bags)" for the customer emails. */
export function itemText(name: string, quantity: number, unit: string): string {
  return `${name} (${Number(quantity)} ${unitLabel(unit, Number(quantity))})`
}
export function itemList(items: { name: string; quantity: number; unit: string }[]): string {
  return items.map((i) => itemText(i.name, i.quantity, i.unit)).join(', ')
}

// ---------------------------------------------------------------------------------------------------------------
// Customer wording (approved text, verbatim)
// ---------------------------------------------------------------------------------------------------------------
export const CUSTOMER_TEXT = {
  button: 'Request to order',
  note: 'No payment now. We check stock first, then reserve it for you.',
  priceLine: 'We confirm the price when we reserve your order.',
  leadTime: (days: number) => `Typical lead time: ${days} days. We confirm it when we reserve your order.`,
  emailHint: 'Leave it empty if you have no email. We will phone you instead.',
  submit: 'Send order request',
  success: (reference: string) => `Thank you. Your order request ${reference} is with our team. We will check stock and contact you. You have not paid anything.`,
  heading: (reference: string) => `Order request ${reference}`,
  howToPay: 'How to pay',
} as const

/** The customer's status label (approved wording). A dispute is between HagerLand and its partner: the customer sees "Delivered". */
export function customerStatusLabel(r: { status: string; reservedUntil: string | null; totalCents: number | null }): string {
  switch (r.status as OrderRequestStatus) {
    case 'submitted':
    case 'checking_stock':
      return 'Checking stock'
    case 'reserved':
      return `Reserved until ${addisDateTime(r.reservedUntil)} (Addis Ababa time): pay ${formatETBCents(r.totalCents)} by then`
    case 'partially_reserved':
      return 'Part of your order is available'
    case 'unavailable':
      return 'Not available'
    case 'paid':
      return 'Paid'
    case 'fulfilling':
      return 'Preparing delivery'
    case 'delivered':
    case 'disputed':
      return 'Delivered'
    case 'completed':
      return 'Completed'
    case 'expired':
      return 'Reservation ended'
    case 'cancelled':
      return 'Cancelled'
    case 'refunded':
      return 'Refunded'
  }
  return ''
}

/** Admin names (house style). */
export const ADMIN_STATUS_LABEL: Record<OrderRequestStatus, string> = {
  submitted: 'New',
  checking_stock: 'Checking stock',
  partially_reserved: 'Part available',
  reserved: 'Reserved (waiting for payment)',
  paid: 'Paid',
  fulfilling: 'Supplier orders made',
  delivered: 'Delivered',
  completed: 'Completed',
  unavailable: 'Not available',
  expired: 'Reservation ended',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  disputed: 'Disputed',
}

// ---------------------------------------------------------------------------------------------------------------
// The public form
// ---------------------------------------------------------------------------------------------------------------
/** Per visitor (coded internet address): 5 an hour and 20 a day (D8). */
export const ORDER_REQUEST_LIMITS = { hour: 5, day: 20 } as const
/** The customer's private status link stays usable for 180 days. */
export const STATUS_LINK_DAYS = 180

const blank = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : v)
export const orderRequestSchema = z.object({
  product_id: z.uuid(),
  quantity: z.preprocess((v) => (v === '' || v === null || v === undefined ? undefined : Number(String(v).replace(/[,\s]/g, ''))), z.number({ error: 'Enter a number' }).min(0.01, 'Enter a number').max(1_000_000)),
  name: nameSchema,
  phone: phoneSchema,
  email: optionalEmailSchema,
  delivery_location_id: z.uuid({ error: 'Choose the location' }),
  delivery_address: textSchema(300, { min: 2, label: 'Delivery address' }),
  needed_by: z.preprocess(blank, z.iso.date().optional()),
  note: optionalText(2000, 'Message'),
})
export type OrderRequestInput = z.infer<typeof orderRequestSchema>
