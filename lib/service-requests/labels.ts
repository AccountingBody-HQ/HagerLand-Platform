/** Shared wording for service requests (spec 24.5). Client-safe. */

export const URGENCY = [
  { value: 'emergency', label: 'Emergency', description: 'Needs attention today' },
  { value: 'within_week', label: 'Within a week', description: 'Soon, but not an emergency' },
  { value: 'flexible', label: 'Flexible', description: 'Planning ahead or getting prices' },
] as const
export type Urgency = (typeof URGENCY)[number]['value']

export const URGENCY_LABEL: Record<string, string> = Object.fromEntries(URGENCY.map((u) => [u.value, u.label]))

export const BUDGET_BANDS = ['Under ETB 10,000', 'ETB 10,000 – 50,000', 'ETB 50,000 – 250,000', 'ETB 250,000 – 1M', 'ETB 1M – 5M', 'Over ETB 5M', 'Not sure yet'] as const
export const BUDGET_BANDS_ABROAD = ['Under 500', '500 – 2,000', '2,000 – 10,000', '10,000 – 50,000', 'Over 50,000', 'Not sure yet'] as const

export const REQUEST_STATUS_LABEL: Record<string, string> = {
  submitted: 'Received',
  triaged: 'Being matched',
  matched: 'Sent to providers',
  quoted: 'Quotes received',
  won: 'Provider chosen',
  lost: 'Closed',
  cancelled: 'Cancelled',
}

export const MATCH_STATUS_LABEL: Record<string, string> = {
  offered: 'New request',
  accepted: 'Accepted',
  declined: 'Declined',
  quoted: 'Quote sent',
  won: 'Chosen by the customer',
  lost: 'Not chosen',
  withdrawn: 'Withdrawn',
}

export const CLOSED_REASON_LABEL: Record<string, string> = {
  customer_cancelled: 'Cancelled by the customer',
  no_provider: 'No suitable provider available',
  all_declined: 'Providers could not take it on',
  chose_other: 'The customer chose another option',
  duplicate: 'Duplicate request',
  spam: 'Spam',
  completed: 'Completed',
  other: 'Other',
}

/** Maximum providers matched to one request (spec 24.5). */
export const MAX_MATCHES = 3

/** A provider is reminded once when a match is unanswered after this long; it also shows in the admin digest. */
export const MATCH_REMINDER_HOURS = 48

/** Guest links to view quotes stay valid this long after they were (re)issued. */
export const GUEST_LINK_DAYS = 30

/** True when a quote's "valid until" date has passed. */
export function isQuoteExpired(validUntil: string | null | undefined, today = new Date().toISOString().slice(0, 10)): boolean {
  return Boolean(validUntil && validUntil < today)
}
