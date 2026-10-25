import Link from 'next/link'
import { Download, Hourglass, Paperclip } from 'lucide-react'
import type { RequestView as View } from '@/lib/data/request-view'
import { CLOSED_REASON_LABEL, URGENCY_LABEL } from '@/lib/service-requests/labels'
import { customerStatusLabel, requestFormCopy } from '@/lib/service-requests/form-copy'
import { formatDate, formatMoney } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Layout'
import { CancelRequestButton, ChooseQuoteButton } from './RequestActions'
import { ReviewBox } from './ReviewBox'
import { IntroducedPeople } from './IntroducedPeople'
import type { IntroducedPerson } from '@/lib/jobs-desk-data'
import type { Translate } from '@/lib/i18n/translate'
import { EMPLOYER_ABROAD_TEXT } from '@/lib/service-requests/employer-abroad'

/**
 * The customer's page for one request: status, what they asked for, and quotes to compare (spec 24.5). For staffing
 * requests with the recruitment desk switch on, `desk` lists the people introduced (Jobs Phase 3).
 */
export function RequestView({ r, token, desk = null, t = (s) => s }: { r: View; token?: string; desk?: { count: number; people: IntroducedPerson[] } | null; t?: Translate }) {
  const open = ['submitted', 'triaged', 'matched', 'quoted'].includes(r.status)
  const canChoose = ['matched', 'quoted'].includes(r.status)
  // Services HagerLand handles itself (the staffing requirement) talk about the recruitment team, not quotes.
  const section = requestFormCopy(r.serviceSlug ?? '').customer?.section
  return (
    <div className="space-y-8">
      <header>
        <p className="text-small text-muted">
          {r.reference} · sent {formatDate(r.createdAt)}
        </p>
        <h1 className="hl-h2 mt-1">{r.title}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge tone={open ? 'info' : r.status === 'won' ? 'green' : 'neutral'}>{customerStatusLabel(r.serviceSlug, r.status)}</Badge>
          {r.urgency === 'emergency' && <Badge tone="danger">Emergency</Badge>}
        </div>
        {r.closedReason && <p className="mt-2 text-small text-muted">{CLOSED_REASON_LABEL[r.closedReason]}</p>}
        {desk && <p className="mt-2 text-small">{t('Candidates introduced: {n}').replace('{n}', String(desk.count))}</p>}
        {r.employerAbroad && <p className="mt-2 text-small text-muted">{t(EMPLOYER_ABROAD_TEXT.confirmation)}</p>}
      </header>

      {desk && <IntroducedPeople people={desk.people} t={t} />}

      {r.chosen && (
        <section aria-labelledby="review-h" className="rounded-lg border border-border bg-white p-5">
          <h2 id="review-h" className="hl-h3">
            How did it go with {r.chosen.orgName}?
          </h2>
          <p className="mb-4 mt-1 text-small text-muted">Only customers who chose a provider through HagerLand can review them, so every review is from a real job.</p>
          <ReviewBox requestId={r.id} token={token} orgName={r.chosen.orgName} existing={r.chosen.review} />
        </section>
      )}

      <section aria-labelledby="quotes-h">
        <h2 id="quotes-h" className="hl-h3">
          {section?.heading ?? 'Quotes'}
        </h2>
        {r.quotes.length === 0 ? (
          <EmptyState
            className="mt-4"
            icon={<Hourglass />}
            title={section ? (open ? section.emptyOpen : section.emptyClosed) : open ? 'No quotes yet' : 'No quotes'}
            description={
              open
                ? section
                  ? section.text
                  : r.providersReviewing > 0
                  ? `${r.providersReviewing} provider${r.providersReviewing === 1 ? ' is' : 's are'} looking at your request. Quotes appear here and we email you each one.`
                  : 'We are finding suitable providers. Quotes appear here and we email you each one.'
                : undefined
            }
          />
        ) : (
          <ul className="mt-4 space-y-3">
            {r.quotes.map((q) => (
              <li key={q.matchId} className="rounded-lg border border-border bg-white p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold text-ink">
                    {q.orgSlug ? (
                      <Link href={`/company/${q.orgSlug}`} className="hover:underline">
                        {q.orgName}
                      </Link>
                    ) : (
                      q.orgName
                    )}
                  </p>
                  <p className="font-display text-h3 font-bold tabular-nums">{formatMoney(q.amountMinor / 100, q.currency, { decimals: q.amountMinor % 100 ? 2 : 0 })}</p>
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-small text-muted">
                  {q.quotedAt && <span>Sent {formatDate(q.quotedAt)}</span>}
                  {q.validUntil && <span>{q.expired ? `Expired ${formatDate(q.validUntil)}` : `Valid until ${formatDate(q.validUntil)}`}</span>}
                  {q.status === 'won' && <Badge tone="green">You chose this quote</Badge>}
                  {q.status === 'lost' && <Badge tone="neutral">Not chosen</Badge>}
                  {q.expired && q.status === 'quoted' && <Badge tone="warning">Expired</Badge>}
                </div>
                {q.message && <p className="mt-3 whitespace-pre-line text-ink">{q.message}</p>}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {q.documentUrl && (
                    <a href={q.documentUrl} className="inline-flex min-h-11 items-center gap-2 font-semibold text-green underline">
                      <Download className="size-4" aria-hidden /> Quote document
                    </a>
                  )}
                  {canChoose && q.status === 'quoted' && !q.expired && <ChooseQuoteButton requestId={r.id} matchId={q.matchId} token={token} orgName={q.orgName} />}
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-small text-muted">Agree the work, price and timing in writing before you pay anything.</p>
      </section>

      <section aria-labelledby="ask-h" className="rounded-lg border border-border bg-stone-50 p-4">
        <h2 id="ask-h" className="hl-h3">
          What you asked for
        </h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-small sm:grid-cols-2">
          {[
            ['Service', r.serviceName],
            ['Where', r.place],
            ['How soon', URGENCY_LABEL[r.urgency]],
            ['Budget', r.budgetBand],
            ...r.answers,
          ]
            .filter((x): x is [string, string] => Boolean(x[1]))
            .map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="w-36 shrink-0 text-muted">{k}</dt>
                <dd className="min-w-0 break-words">{v}</dd>
              </div>
            ))}
        </dl>
        <p className="mt-3 whitespace-pre-line">{r.details}</p>
        {r.attachmentCount > 0 && (
          <p className="mt-3 inline-flex items-center gap-2 text-small text-muted">
            <Paperclip className="size-4" aria-hidden /> {r.attachmentCount} file{r.attachmentCount === 1 ? '' : 's'} attached
          </p>
        )}
      </section>

      {open && <CancelRequestButton requestId={r.id} token={token} />}
    </div>
  )
}
