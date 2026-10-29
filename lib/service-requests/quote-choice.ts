/**
 * Fix F-3: what choose_service_request_quote (migration 0046) answered, and the customer's message for a refusal.
 * Every message is one the "choose this quote" flow already used; nothing new is shown to customers.
 */

export type QuoteChoice = { outcome: 'chosen' | 'already_chosen'; orgId: string } | { outcome: 'not_allowed'; reason: string } | { outcome: 'error' }

/** The flow's existing generic message, for a database error or an answer it does not recognise. */
export const CHOICE_FAILED = 'Something went wrong. Please refresh the page.'

const REFUSALS: Record<string, string> = {
  not_owner: 'This link has expired. Ask for a new one below.',
  request_closed: 'This request is closed.',
  quote_not_available: 'That quote is not available.',
  quote_expired: 'That quote has expired. Ask the provider for an updated quote.',
}

export function readQuoteChoice(data: unknown, error: unknown): QuoteChoice {
  if (error || !data || typeof data !== 'object') return { outcome: 'error' }
  const d = data as { outcome?: unknown; reason?: unknown; org_id?: unknown }
  if ((d.outcome === 'chosen' || d.outcome === 'already_chosen') && typeof d.org_id === 'string') return { outcome: d.outcome, orgId: d.org_id }
  if (d.outcome === 'not_allowed') return { outcome: 'not_allowed', reason: typeof d.reason === 'string' ? d.reason : '' }
  return { outcome: 'error' }
}

export function quoteChoiceRefusal(reason: string): string {
  return REFUSALS[reason] ?? CHOICE_FAILED
}
