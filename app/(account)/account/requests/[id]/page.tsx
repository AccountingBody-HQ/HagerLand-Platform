import { notFound } from 'next/navigation'
import { Download, Mail, Phone } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { signedDocumentUrl } from '@/lib/storage'
import { formatDate, formatMoney, formatPhone } from '@/lib/format'
import { answerLines, parseQuestions } from '@/lib/service-requests/questions'
import { MATCH_STATUS_LABEL, URGENCY_LABEL } from '@/lib/service-requests/labels'
import { Badge } from '@/components/ui/Badge'
import { MatchQuoteForm, MatchResponse } from '@/components/service-requests/ProviderTools'
import { LoadFailed } from '@/components/account/LoadFailed'
import { log } from '@/lib/log'

export const metadata = { title: 'Customer request' }

export default async function ProviderRequestPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  await requireUser(`/account/requests/${params.id}`)
  if (!/^[0-9a-f-]{36}$/.test(params.id)) notFound()
  // The view returns only matches for the signed-in user's organisations, with contact details after acceptance.
  const { data: v, error } = await getServerSupabase().from('service_requests_for_provider').select('*').eq('match_id', params.id).maybeSingle()
  if (error) {
    log.error('account', 'provider request failed to load', error)
    return <LoadFailed what="this request" />
  }
  if (!v || !v.request_id) notFound()
  const accepted = ['accepted', 'quoted', 'won'].includes(v.match_status ?? '')
  const db = getAdminSupabase()
  const [{ data: cat }, { data: req }, { data: match }] = await Promise.all([
    v.service_category_id ? db.from('service_categories').select('question_schema').eq('id', v.service_category_id).maybeSingle() : Promise.resolve({ data: null }),
    accepted ? db.from('service_requests').select('attachment_paths').eq('id', v.request_id).maybeSingle() : Promise.resolve({ data: null }),
    db.from('service_request_matches').select('quote_document_path').eq('id', params.id).maybeSingle(),
  ])
  const files = accepted ? await Promise.all((req?.attachment_paths ?? []).map(async (p, i) => ({ name: `File ${i + 1}`, url: await signedDocumentUrl(p) }))) : []
  const answers = answerLines(parseQuestions(cat?.question_schema), (v.answers as Record<string, string>) ?? {})
  return (
    <div className="space-y-8">
      <header>
        <p className="text-small text-muted">
          {v.reference} · sent to you {v.offered_at ? formatDate(v.offered_at) : ''}
        </p>
        <h1 className="hl-h2 mt-1">{v.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone={v.match_status === 'offered' ? 'gold' : 'info'}>{MATCH_STATUS_LABEL[v.match_status ?? ''] ?? v.match_status}</Badge>
          {v.urgency === 'emergency' && <Badge tone="danger">Emergency</Badge>}
        </div>
      </header>

      <section className="rounded-lg border border-border bg-white p-4">
        <dl className="grid gap-x-6 gap-y-2 text-small sm:grid-cols-2">
          {([['Service', v.service_name], ['Where', v.location_display ?? v.location_text], ['How soon', URGENCY_LABEL[v.urgency ?? '']], ['Budget', v.budget_band], ...answers] as [string, string | null | undefined][])
            .filter((x): x is [string, string] => Boolean(x[1]))
            .map(([k, val]) => (
              <div key={k} className="flex gap-2">
                <dt className="w-36 shrink-0 text-muted">{k}</dt>
                <dd className="min-w-0 break-words">{val}</dd>
              </div>
            ))}
        </dl>
        <p className="mt-4 whitespace-pre-line">{v.details}</p>
        {!accepted && (v.attachment_count ?? 0) > 0 && <p className="mt-3 text-small text-muted">{v.attachment_count} file(s) attached: you can open them after accepting.</p>}
        {files.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-3">
            {files.map((f) =>
              f.url ? (
                <li key={f.name}>
                  <a href={f.url} className="inline-flex min-h-11 items-center gap-2 font-semibold text-green underline">
                    <Download className="size-4" aria-hidden /> {f.name}
                  </a>
                </li>
              ) : null,
            )}
          </ul>
        )}
      </section>

      {v.match_status === 'offered' && <MatchResponse matchId={params.id} />}

      {accepted && (
        <section className="min-w-0 rounded-lg border border-green/30 bg-green-tint p-4">
          <h2 className="hl-h3">Customer</h2>
          <p className="mt-2 font-semibold">{v.requester_name}</p>
          <ul className="mt-2 space-y-1">
            {v.requester_phone && (
              <li>
                <a href={`tel:${v.requester_phone}`} className="inline-flex min-h-11 items-center gap-2 font-semibold text-green">
                  <Phone className="size-4" aria-hidden /> {formatPhone(v.requester_phone)}
                </a>
              </li>
            )}
            {v.requester_email && (
              <li>
                <a href={`mailto:${v.requester_email}`} className="inline-flex min-h-11 min-w-0 items-center gap-2 break-all font-semibold text-green">
                  <Mail className="size-4 shrink-0" aria-hidden /> {v.requester_email}
                </a>
              </li>
            )}
          </ul>
          {v.preferred_contact && <p className="mt-1 text-small text-muted">Prefers: {v.preferred_contact}</p>}
        </section>
      )}

      {(v.match_status === 'accepted' || v.match_status === 'quoted') && v.request_status !== 'cancelled' && (
        <section>
          <h2 className="hl-h3 mb-4">{v.match_status === 'quoted' ? 'Your quote (you can update it)' : 'Send your quote'}</h2>
          <MatchQuoteForm
            matchId={params.id}
            defaults={{
              amount: v.quote_amount_minor ? String(v.quote_amount_minor / 100) : '',
              currency: v.quote_currency ?? v.currency ?? 'ETB',
              message: v.quote_message ?? '',
              validUntil: v.quote_valid_until ?? '',
              hasDocument: Boolean(match?.quote_document_path),
            }}
          />
        </section>
      )}
      {v.match_status === 'won' && v.quote_amount_minor !== null && (
        <p className="rounded-lg bg-green-tint p-4 font-semibold text-green-darker">The customer chose your quote of {formatMoney(v.quote_amount_minor / 100, v.quote_currency ?? 'ETB')}. Contact them to agree the details in writing.</p>
      )}
    </div>
  )
}
