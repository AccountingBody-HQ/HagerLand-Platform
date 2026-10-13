import 'server-only'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { signedDocumentUrl } from '@/lib/storage'
import { answerLines, parseQuestions } from '@/lib/service-requests/questions'
import { isQuoteExpired } from '@/lib/service-requests/labels'

export interface RequestQuote {
  matchId: string
  status: string
  orgName: string
  orgSlug: string | null
  amountMinor: number
  currency: string
  message: string | null
  validUntil: string | null
  expired: boolean
  documentUrl: string | null
  quotedAt: string | null
}

export interface RequestView {
  id: string
  reference: string
  title: string
  details: string
  status: string
  closedReason: string | null
  urgency: string
  budgetBand: string | null
  serviceName: string | null
  place: string
  createdAt: string
  answers: [string, string][]
  attachmentCount: number
  providersReviewing: number
  quotes: RequestQuote[]
}

/**
 * Everything the customer may see about their own request. Call only after checking the viewer owns it
 * (signed in as the requester, or holding a valid guest link).
 */
export async function loadRequestView(id: string): Promise<RequestView | null> {
  const db = getAdminSupabase()
  const { data: r } = await db.from('service_requests').select('id, reference, title, details, status, closed_reason, urgency, budget_band, service_category_id, location_id, location_text, country_code, answers, attachment_paths, created_at').eq('id', id).maybeSingle()
  if (!r) return null
  const [{ data: cat }, { data: loc }, { data: matches }] = await Promise.all([
    r.service_category_id ? db.from('service_categories').select('name, question_schema').eq('id', r.service_category_id).maybeSingle() : Promise.resolve({ data: null }),
    r.location_id ? db.from('locations').select('display_name').eq('id', r.location_id).maybeSingle() : Promise.resolve({ data: null }),
    db.from('service_request_matches').select('id, org_id, status, quote_amount_minor, quote_currency, quote_message, quote_valid_until, quote_document_path, quoted_at').eq('request_id', id),
  ])
  const quoted = (matches ?? []).filter((m) => ['quoted', 'won', 'lost'].includes(m.status) && m.quote_amount_minor !== null)
  const orgIds = Array.from(new Set(quoted.map((m) => m.org_id)))
  const { data: orgs } = orgIds.length ? await db.from('organisations').select('id, name, slug, status').in('id', orgIds) : { data: [] }
  const orgById = new Map((orgs ?? []).map((o) => [o.id, o]))
  const quotes = await Promise.all(
    quoted.map(async (m): Promise<RequestQuote> => {
      const o = orgById.get(m.org_id)
      return {
        matchId: m.id,
        status: m.status,
        orgName: o?.name ?? 'Provider',
        orgSlug: o?.status === 'published' ? o.slug : null,
        amountMinor: m.quote_amount_minor ?? 0,
        currency: m.quote_currency ?? 'ETB',
        message: m.quote_message,
        validUntil: m.quote_valid_until,
        expired: isQuoteExpired(m.quote_valid_until),
        documentUrl: m.quote_document_path ? await signedDocumentUrl(m.quote_document_path, `quote-${r.reference}.pdf`) : null,
        quotedAt: m.quoted_at,
      }
    }),
  )
  return {
    id: r.id,
    reference: r.reference,
    title: r.title,
    details: r.details,
    status: r.status,
    closedReason: r.closed_reason,
    urgency: r.urgency,
    budgetBand: r.budget_band,
    serviceName: cat?.name ?? null,
    place: loc?.display_name ?? r.location_text ?? '',
    createdAt: r.created_at,
    answers: answerLines(parseQuestions(cat?.question_schema), (r.answers as Record<string, string>) ?? {}),
    attachmentCount: (r.attachment_paths ?? []).length,
    providersReviewing: (matches ?? []).filter((m) => ['offered', 'accepted'].includes(m.status)).length,
    quotes: quotes.sort((a, b) => a.amountMinor - b.amountMinor),
  }
}
