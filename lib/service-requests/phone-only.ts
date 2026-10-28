// Tidy T-2 (T2-4): a staffing request staff send for a phone-only caller (from a call-back) may have no email. Only
// when ALL of these hold: the service is staffing, the form carries a call-back id, the session is the owner or
// Operations, and that call-back is still open. Everyone else (the public form included) must give an email.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export interface PhoneOnlyCheck {
  categorySlug: string
  callbackId: string
  /** Whether the visitor is signed in to admin as the owner or Operations. */
  staffSession: () => Promise<boolean>
  /** Whether the call-back is open (only asked once the cheaper checks pass). */
  callbackOpen: (id: string) => Promise<boolean>
}

export async function phoneOnlyAllowed(c: PhoneOnlyCheck, staffingSlug: string): Promise<boolean> {
  if (c.categorySlug !== staffingSlug || !UUID.test(c.callbackId)) return false
  if (!(await c.staffSession())) return false
  return c.callbackOpen(c.callbackId)
}
