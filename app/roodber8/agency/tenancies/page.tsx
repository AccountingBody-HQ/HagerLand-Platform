import { getAdminSupabase } from '@/lib/supabase/admin'
import { createTenancyAction } from '@/app/roodber8/actions/lettings'
import { STATUS_LABEL, TENANCY_STATUSES } from '@/lib/agency'
import { formatDate, formatMoney } from '@/lib/format'
import { AgencyList, RefLink } from '@/components/admin/AgencyList'
import { Panel } from '@/components/admin/AdminUi'
import { TenancyFields } from '@/components/admin/TenancyFields'
import { ActionForm } from '@/components/forms/ActionForm'
import { Field, Input } from '@/components/ui/Field'

export const metadata = { title: 'Tenancies' }

export default async function TenanciesPage(props: { searchParams: Promise<{ status?: string }> }) {
  const sp = await props.searchParams
  const status = TENANCY_STATUSES.find((s) => s === sp.status)
  let q = getAdminSupabase().from('tenancies').select('id, reference, title, tenant_names, start_date, end_date, rent_minor, currency, rent_period, renewal_date, notice_date, status').order('start_date', { ascending: false }).limit(300)
  if (status) q = q.eq('status', status)
  const { data } = await q
  return (
    <AgencyList
      title="Tenancies"
      description="Renewal and notice reminders are emailed to the team by the daily job (30 and 14 days before)."
      base="/roodber8/agency/tenancies"
      statuses={TENANCY_STATUSES}
      status={status}
      rows={data ?? []}
      empty="No tenancies yet."
      columns={[
        { key: 'ref', label: 'Reference', render: (r) => <RefLink href={`/roodber8/agency/tenancies/${r.id}`}>{r.reference}</RefLink> },
        { key: 'title', label: 'Tenancy', render: (r) => r.title },
        { key: 'who', label: 'Tenants', render: (r) => r.tenant_names },
        { key: 'dates', label: 'Dates', render: (r) => `${formatDate(r.start_date)}${r.end_date ? ` – ${formatDate(r.end_date)}` : ''}` },
        { key: 'rent', label: 'Rent', render: (r) => `${formatMoney(r.rent_minor / 100, r.currency)} / ${r.rent_period}` },
        { key: 'renew', label: 'Renewal', render: (r) => (r.renewal_date ? formatDate(r.renewal_date) : '') },
        { key: 'status', label: 'Status', render: (r) => STATUS_LABEL[r.status] },
      ]}
      extra={
        <Panel title="Add a tenancy">
          <ActionForm action={createTenancyAction} submitLabel="Create tenancy">
            <TenancyFields p="ct" />
            <Field label="Tenant email" htmlFor="ct-email" optional>
              <Input id="ct-email" name="tenant_email" type="email" />
            </Field>
            <Field label="Tenant phone" htmlFor="ct-phone" optional>
              <Input id="ct-phone" name="tenant_phone" />
            </Field>
          </ActionForm>
        </Panel>
      }
    />
  )
}
