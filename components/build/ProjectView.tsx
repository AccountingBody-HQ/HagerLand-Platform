import Link from 'next/link'
import { formatDate, formatETBCents, formatMoney } from '@/lib/format'
import { BUDGET_BANDS, PROJECT_SERVICES, PROJECT_STATUS_LABEL, TIMELINES, floorsLabel, labelOf } from '@/lib/build-projects'
import { REQUEST_STATUS_LABEL } from '@/lib/service-requests/labels'
import { Badge } from '@/components/ui/Badge'
import type { getProjectWithLinks } from '@/lib/data/projects'

type Data = NonNullable<Awaited<ReturnType<typeof getProjectWithLinks>>>
const one = <T,>(x: T | T[] | null): T | null => (Array.isArray(x) ? (x[0] ?? null) : x)

/** Everything in a building project in one place (spec 26.9), for the customer and for admin. */
export function ProjectView({ data, requestHref, quoteHref }: { data: Data; requestHref: (id: string) => string; quoteHref?: (id: string) => string }) {
  const { project: p, requests, quotes } = data
  const facts: [string, string | null][] = [
    ['Where', [one(p.location)?.display_name, p.location_text].filter(Boolean).join(' · ') || null],
    ['Plot', p.plot_size_m2 ? `${p.plot_size_m2} m²` : null],
    ['Height', floorsLabel(p.floors)],
    ['Budget', labelOf(BUDGET_BANDS, p.budget_band)],
    ['Start', labelOf(TIMELINES, p.timeline)],
    ['Help with', p.services.map((s) => PROJECT_SERVICES.find((x) => x.value === s)?.label ?? s).join(', ')],
  ]
  return (
    <div className="space-y-6">
      <section aria-labelledby="p-brief" className="rounded-xl border border-border bg-white p-5">
        <h2 id="p-brief" className="hl-h3 flex flex-wrap items-center gap-2">
          The brief <Badge tone="info">{PROJECT_STATUS_LABEL[p.status]}</Badge>
        </h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {facts
            .filter((f): f is [string, string] => Boolean(f[1]))
            .map(([k, v]) => (
              <div key={k}>
                <dt className="text-caption text-muted">{k}</dt>
                <dd className="text-small font-semibold text-ink">{v}</dd>
              </div>
            ))}
        </dl>
        {p.details && <p className="mt-3 whitespace-pre-line text-small">{p.details}</p>}
      </section>
      <section aria-labelledby="p-requests" className="rounded-xl border border-border bg-white p-5">
        <h2 id="p-requests" className="hl-h3">
          Requests and quotes
        </h2>
        {requests.length === 0 && quotes.length === 0 ? (
          <p className="mt-2 text-small text-muted">No linked requests.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {requests.map((r) => {
              const quoted = (Array.isArray(r.matches) ? r.matches : []).filter((m) => m.quote_amount_minor !== null)
              return (
                <li key={r.id} className="py-3">
                  <Link href={requestHref(r.id)} className="font-semibold text-green underline">
                    {r.title}
                  </Link>
                  <span className="ml-2 text-small text-muted">
                    {r.reference} · {REQUEST_STATUS_LABEL[r.status] ?? r.status}
                  </span>
                  {quoted.length > 0 && (
                    <ul className="mt-1 text-small">
                      {quoted.map((m, i) => (
                        <li key={i}>
                          Quote from {one(m.org)?.name ?? 'a provider'}: <strong>{formatMoney((m.quote_amount_minor ?? 0) / 100, m.quote_currency ?? 'ETB')}</strong>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
            {quotes.map((q) => (
              <li key={q.id} className="py-3">
                {quoteHref ? (
                  <Link href={quoteHref(q.id)} className="font-semibold text-green underline">
                    Materials quote from HagerLand Supply
                  </Link>
                ) : (
                  <span className="font-semibold">Materials quote from HagerLand Supply</span>
                )}
                <span className="ml-2 text-small text-muted">
                  {q.reference} · {q.status.replace('_', ' ')} · {formatDate(q.created_at)}
                  {q.quoted_total_etb_cents !== null && ` · ${formatETBCents(q.quoted_total_etb_cents)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
