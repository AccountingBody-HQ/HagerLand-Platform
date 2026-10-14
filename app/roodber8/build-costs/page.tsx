import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { FINISHES } from '@/lib/estimator'
import { formatDate, formatETB } from '@/lib/format'
import { deleteBuildRateAction, saveBuildRateAction } from '../actions/build-costs'
import { AdminHeader, DataTable, Panel } from '@/components/admin/AdminUi'
import { ActionForm } from '@/components/forms/ActionForm'
import { ActionButton } from '@/components/forms/ActionButton'
import { Combobox } from '@/components/ui/Combobox'
import { Input, Select } from '@/components/ui/Field'

export const metadata = { title: 'Build-cost rates' }

/** Rates per m² behind the public build-cost estimator (spec 25.2h). The estimator is hidden until a rate exists. */
export default async function BuildCostsPage() {
  requireAdminPage()
  const { data } = await getAdminSupabase().from('build_cost_rates_public').select('*').order('location_display', { nullsFirst: true }).order('finish')
  const rows = data ?? []
  return (
    <div className="space-y-5">
      <AdminHeader title="Build-cost rates" description={rows.length ? 'The estimator at /build-cost-estimator is live and uses these rates.' : 'No rates yet, so the estimator is hidden. Add at least one rate to show it.'} />
      <Panel title="Add or update a rate">
        <ActionForm action={saveBuildRateAction} submitLabel="Save rate" className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-small font-semibold" htmlFor="br-loc">
            Place (leave empty for the nationwide rate)
            <Combobox id="br-loc" name="location_id" endpoint="/api/locations" placeholder="Nationwide" />
          </label>
          <label className="grid gap-1 text-small font-semibold">
            Finish
            <Select name="finish" defaultValue="standard">
              {FINISHES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-1 text-small font-semibold">
            Rate (ETB per m²)
            <Input name="rate" inputMode="numeric" placeholder="e.g. 25000" />
          </label>
          <label className="grid gap-1 text-small font-semibold">
            Note for admins (optional)
            <Input name="notes" maxLength={300} placeholder="Source and date of the figure" />
          </label>
        </ActionForm>
      </Panel>
      <DataTable
        label="Rates"
        rows={rows}
        rowKey={(r) => r.id ?? ''}
        empty="No rates yet."
        columns={[
          { key: 'l', label: 'Place', render: (r) => r.location_display ?? 'Nationwide' },
          { key: 'f', label: 'Finish', render: (r) => FINISHES.find((f) => f.value === r.finish)?.label ?? r.finish },
          { key: 'r', label: 'Rate per m²', render: (r) => formatETB(r.rate_etb_per_m2) },
          { key: 'u', label: 'Updated', render: (r) => formatDate(r.updated_at) },
          { key: 'a', label: '', render: (r) => (<ActionButton size="sm" variant="ghost" confirm="Delete this rate?" action={deleteBuildRateAction.bind(null, r.id ?? '')}>Delete</ActionButton>) },
        ]}
      />
    </div>
  )
}
