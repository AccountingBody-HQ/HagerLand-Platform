import { readAll, REPORT_MAX_ROWS } from '@/lib/admin/read-all'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { lastMonths, monthlyReport } from '@/lib/admin/aggregate'
import { formatDate, formatMoney } from '@/lib/format'
import { AdminHeader, Panel, StatusBadge } from '@/components/admin/AdminUi'
import { DealForm } from '@/components/admin/DealForm'
import { ButtonLink } from '@/components/ui/Button'
import { must } from '@/lib/admin/must'

export const metadata = { title: 'Deals and commissions' }

const SOURCE_LABEL: Record<string, string> = { enquiry: 'Enquiry', service_request: 'Service request', quote_request: 'Supply quote', property_care: 'Property Care', manual: 'Manual' }
const minor = (n: number | null, c: string) => (n === null ? '—' : formatMoney(n / 100, c))

/** Deals and commission ledger with monthly revenue and lead reports (spec 25.2k). */
export default async function DealsPage() {
  await requireAdminPage()
  const db = getAdminSupabase()
  const months = lastMonths(12)
  const since = `${months[0]}-01T00:00:00Z`
  // The table shows the latest 500 deals; the monthly figures use every deal (Fix F-1, same read as the CSV report).
  const [{ data: deals }, { data: allDeals }, { data: reqs }, { data: enqs }, { data: quotes }] = must(await Promise.all([
    db.from('deals').select('*').order('created_at', { ascending: false }).limit(500),
    readAll(() => db.from('deals').select('closed_at, created_at, status, currency, value_minor, commission_minor, lead_fee_minor'), { maxRows: REPORT_MAX_ROWS }),
    readAll(() => db.from('service_requests').select('created_at').gte('created_at', since), { maxRows: REPORT_MAX_ROWS }),
    readAll(() => db.from('enquiries').select('created_at').gte('created_at', since), { maxRows: REPORT_MAX_ROWS }),
    readAll(() => db.from('quote_requests').select('created_at').gte('created_at', since), { maxRows: REPORT_MAX_ROWS }),
  ]))
  const report = monthlyReport(months, { requests: (reqs ?? []).map((r) => r.created_at), enquiries: (enqs ?? []).map((r) => r.created_at), quoteRequests: (quotes ?? []).map((r) => r.created_at), deals: allDeals })
  const currencies = Array.from(new Set(report.flatMap((r) => Object.keys(r.money)))).sort()
  return (
    <div className="space-y-6">
      <AdminHeader
        title="Deals and commissions"
        description="Every deal HagerLand earns from: commissions, lead fees and HagerLand's own sales. Deals from service requests are added automatically when a customer chooses a quote."
        actions={
          <>
            <ButtonLink href="/roodber8/export/deals" variant="secondary" size="sm">
              Export deals
            </ButtonLink>
            <ButtonLink href="/roodber8/export/report-revenue" variant="secondary" size="sm">
              Export monthly report
            </ButtonLink>
          </>
        }
      />
      <Panel title="Monthly leads and revenue (last 12 months)">
        <div className="overflow-x-auto" role="region" aria-label="Monthly report" tabIndex={0}>
          <table className="w-full min-w-[640px] text-left text-small">
            <thead className="text-caption uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="py-2">Month</th>
                <th scope="col" className="py-2">Service requests</th>
                <th scope="col" className="py-2">Enquiries</th>
                <th scope="col" className="py-2">Supply quotes</th>
                <th scope="col" className="py-2">Deals won</th>
                {currencies.map((c) => (
                  <th key={c} scope="col" className="py-2">
                    Commission + fees ({c})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border tabular-nums">
              {report.map((r) => (
                <tr key={r.month}>
                  <td className="py-2 font-semibold">{r.month}</td>
                  <td className="py-2">{r.requests}</td>
                  <td className="py-2">{r.enquiries}</td>
                  <td className="py-2">{r.quoteRequests}</td>
                  <td className="py-2">{r.dealsWon}</td>
                  {currencies.map((c) => (
                    <td key={c} className="py-2">
                      {r.money[c] ? formatMoney((r.money[c].commission + r.money[c].leadFees) / 100, c) : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Add a deal">
        <DealForm />
      </Panel>
      <Panel title="Deals">
        {(deals ?? []).length === 0 ? (
          <p className="text-small text-muted">No deals yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {(deals ?? []).map((d) => (
              <li key={d.id} className="py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    {d.reference} · {d.title}
                  </p>
                  <span className="flex items-center gap-2 text-small text-muted">
                    {SOURCE_LABEL[d.source_type]} · {formatDate(d.created_at)} <StatusBadge status={d.status} />
                  </span>
                </div>
                <p className="mt-1 text-small text-muted">
                  Value {minor(d.value_minor, d.currency)} · commission {minor(d.commission_minor, d.currency)} · lead fee {minor(d.lead_fee_minor, d.currency)}
                </p>
                <details className="mt-2">
                  <summary className="cursor-pointer text-small font-semibold text-green">Edit</summary>
                  <div className="mt-3">
                    <DealForm
                      compact
                      initial={{
                        id: d.id,
                        title: d.title,
                        currency: d.currency,
                        value: d.value_minor !== null ? String(d.value_minor / 100) : '',
                        commission: d.commission_minor !== null ? String(d.commission_minor / 100) : '',
                        lead_fee: d.lead_fee_minor !== null ? String(d.lead_fee_minor / 100) : '',
                        status: d.status,
                        notes: d.notes ?? '',
                      }}
                    />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
