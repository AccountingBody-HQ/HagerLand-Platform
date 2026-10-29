import { redirect } from 'next/navigation'
import { isOwnerSession, requireAdminPage } from '@/lib/admin/guard'
import { formatETBCents } from '@/lib/format'
import { AdminHeader, Panel } from '@/components/admin/AdminUi'
import { ButtonLink } from '@/components/ui/Button'
import { reconciliationData } from '@/lib/supply/settlements-data'
import { FIGURE_LABEL, reconcilesText, type RecFigures } from '@/lib/supply/settlements'

export const metadata = { title: 'Supply settlements report' }
export const dynamic = 'force-dynamic'

const KEYS = Object.keys(FIGURE_LABEL) as (keyof RecFigures)[]
const MONTH = new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric', timeZone: 'UTC' })

/**
 * S6-3 (owner only): money for HagerLand-as-the-seller orders, by Addis Ababa month and to date, and whether it reconciles
 * with the supply ledger. Amounts are in ETB (payments in another currency are recorded in birr).
 */
export default async function SupplySettlementsReportPage() {
  await requireAdminPage()
  if (!(await isOwnerSession())) redirect('/roodber8?denied=1')
  const r = await reconciliationData()
  const months = [...r.months].reverse()
  return (
    <div className="max-w-6xl space-y-5">
      <AdminHeader
        title="Supply settlements"
        description="Owner only. Order requests (HagerLand as the seller), their supplier orders, what partners are owed and paid, and HagerLand's margin, by Addis Ababa month. Amounts in ETB."
        actions={
          <ButtonLink href="/roodber8/reports/supply-settlements/export" variant="secondary" size="sm" prefetch={false}>
            Export CSV
          </ButtonLink>
        }
      />
      <Panel title="Reconciles with ledger">
        <p className="font-semibold" data-testid="reconciles">
          Reconciles with ledger: {reconcilesText(r)}
        </p>
        <ul className="mt-3 space-y-1 text-small">
          {r.checks.map((c) => (
            <li key={c.label}>
              {c.ok ? 'Yes' : 'No'} · {c.label}
              {c.references.length ? `: ${c.references.join(', ')}` : ''}
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Figures (ETB)">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-small" data-testid="settlement-figures">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-4">Measure</th>
                <th className="py-2 pr-4">To date</th>
                {months.map((m) => (
                  <th key={m.month} className="py-2 pr-4">
                    {MONTH.format(new Date(`${m.month}-01T00:00:00Z`))}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {KEYS.map((k) => (
                <tr key={k} className="border-b border-border">
                  <th scope="row" className="py-2 pr-4 font-normal">
                    {FIGURE_LABEL[k]}
                  </th>
                  <td className="py-2 pr-4 font-semibold tabular-nums">{formatETBCents(r.toDate[k])}</td>
                  {months.map((m) => (
                    <td key={m.month} className="py-2 pr-4 tabular-nums">
                      {formatETBCents(m.figures[k])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-small text-muted">
          Margin = items delivered to customers, less what the partners are owed for them, less refunds on delivered orders, plus anything partners repaid. Delivery charges are HagerLand&rsquo;s income and shown on their own line. &ldquo;Due to partners&rdquo; is what was earned but not yet paid at the end of each month.
        </p>
      </Panel>
    </div>
  )
}
