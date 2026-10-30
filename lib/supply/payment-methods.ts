// QC-2 (AB, LR-1): the ways customers pay HagerLand for a reserved order request (telebirr, CBE Birr, …). The owner
// types each name and its instructions in admin → Supplies → Payment methods; nothing is seeded. Pure: shared by the
// admin page, the actions, the customer order page, the reserved email and the tests.
import { z } from 'zod'

export interface PaymentMethod {
  id: string
  name: string
  instructions: string
  active: boolean
  sortOrder: number
}

export const paymentMethodSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name').max(80, 'Use 80 characters or fewer'),
  instructions: z.string().trim().min(1, 'Enter how to pay').max(1000, 'Use 1,000 characters or fewer'),
})

/** Approved customer sentence (QC-2 2.2), shown after the active methods. */
export function referenceLine(reference: string): string {
  return `Include your order reference ${reference} with your payment.`
}

/** The active methods in their order (the owner's sort order, then oldest first). */
export function activeInOrder(methods: readonly PaymentMethod[]): PaymentMethod[] {
  return methods.filter((m) => m.active).sort((a, b) => a.sortOrder - b.sortOrder)
}

/** The plain-text list used in the reserved email's text version: each method's name, then its instructions. */
export function methodsAsText(methods: readonly PaymentMethod[]): string {
  return methods.map((m) => `${m.name}\n${m.instructions}`).join('\n\n')
}

/** Admin wording (QC-2 section 3, admin-only texts). */
export const PAYMENT_METHODS_TEXT = {
  title: 'Payment methods',
  add: 'Add a payment method',
  name: 'Name',
  instructions: 'How to pay (shown to customers)',
  active: 'Active',
  up: 'Move up',
  down: 'Move down',
  save: 'Save',
  empty: 'No payment methods yet. Add at least one before ordering can be switched on.',
} as const
