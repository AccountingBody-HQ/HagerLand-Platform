import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate, formatPhone } from '@/lib/format'
import { tradeDecisionAction } from '../actions/products'
import { AdminHeader, DataTable, FilterBar, FilterField, StatusBadge, filterInput } from '@/components/admin/AdminUi'
import { DecisionButtons } from '@/components/admin/ModerationControls'
import { ActionButton } from '@/components/forms/ActionButton'

export const metadata = { title: 'Trade accounts' }

const STATUSES = ['pending', 'approved', 'rejected', 'revoked'] as const

/** Trade account applications and decisions (spec 25.2e). Approved accounts see trade prices; nobody else does. */
export default async function TradeAccountsPage({ searchParams }: { searchParams: { status?: string } }) {
  requireAdminPage()
  const status = STATUSES.find((s) => s === searchParams.status) ?? 'pending'
  const { data } = await getAdminSupabase().from('trade_accounts').select('*').eq('status', status).order('created_at', { ascending: status === 'pending' }).limit(200)
  return (
    <div>
      <AdminHeader title="Trade accounts" description="Businesses that applied to see trade prices. Approve only businesses you have checked." />
      <FilterBar action="/roodber8/trade-accounts">
        <FilterField label="Status">
          <select name="status" defaultValue={status} className={filterInput}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>
      <DataTable
        label="Trade accounts"
        rows={data ?? []}
        rowKey={(r) => r.id}
        empty="Nothing here."
        columns={[
          { key: 'ref', label: 'Reference', render: (r) => <span className="font-mono text-caption">{r.reference}</span> },
          { key: 'b', label: 'Business', render: (r) => (<div><p className="font-semibold">{r.business_name}</p><p>{r.trade_type}</p></div>) },
          { key: 'c', label: 'Contact', render: (r) => (<div><p>{formatPhone(r.phone)}</p>{r.tin && <p>TIN {r.tin}</p>}</div>) },
          { key: 'n', label: 'Notes', render: (r) => <span className="line-clamp-3 max-w-xs">{[r.expected_monthly_spend, r.notes].filter(Boolean).join(' · ')}</span> },
          { key: 'd', label: 'Applied', render: (r) => formatDate(r.created_at) },
          { key: 's', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          {
            key: 'a',
            label: '',
            render: (r) =>
              r.status === 'pending' ? (
                <DecisionButtons askNote onApprove={tradeDecisionAction.bind(null, r.id, 'approved')} onReject={tradeDecisionAction.bind(null, r.id, 'rejected')} />
              ) : r.status === 'approved' ? (
                <ActionButton size="sm" variant="ghost" confirm="Close this trade account? They will stop seeing trade prices." action={tradeDecisionAction.bind(null, r.id, 'revoked', undefined)}>
                  Close account
                </ActionButton>
              ) : null,
          },
        ]}
      />
    </div>
  )
}
