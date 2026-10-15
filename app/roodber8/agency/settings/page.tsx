import { getAdminSupabase } from '@/lib/supabase/admin'
import { saveAgencyListsAction } from '@/app/roodber8/actions/agency'
import { AdminHeader, Panel } from '@/components/admin/AdminUi'
import { ActionForm } from '@/components/forms/ActionForm'
import { Field, Textarea } from '@/components/ui/Field'

export const metadata = { title: 'Agency checklists' }

/** Sale progression defaults and the rent-ready checklist (spec 26.5, 26.6), editable by AB. */
export default async function AgencyListsPage() {
  const { data } = await getAdminSupabase().from('site_settings').select('key, value').in('key', ['sale_progression_defaults', 'rent_ready_checklist'])
  const lines = (k: string) => {
    const v = data?.find((r) => r.key === k)?.value
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').join('\n') : ''
  }
  return (
    <div className="space-y-5">
      <AdminHeader title="Checklists" description="One item per line. Keep them practical: no legal statements. The sale steps are copied to a sale when an offer is accepted; the rent-ready list is shown on the landlord services page." />
      <Panel>
        <ActionForm action={saveAgencyListsAction} submitLabel="Save checklists" resetOnSuccess={false} className="grid gap-4">
          <Field label="Sale progression steps" htmlFor="l-sale">
            <Textarea id="l-sale" name="sale_progression_defaults" rows={10} defaultValue={lines('sale_progression_defaults')} />
          </Field>
          <Field label="Rent-ready checklist" htmlFor="l-rent">
            <Textarea id="l-rent" name="rent_ready_checklist" rows={8} defaultValue={lines('rent_ready_checklist')} />
          </Field>
        </ActionForm>
      </Panel>
    </div>
  )
}
