import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { saveAreaGuideAction } from '@/app/roodber8/actions/advice'
import { formatDate } from '@/lib/format'
import { AdminHeader, DataTable, Panel } from '@/components/admin/AdminUi'
import { ActionForm } from '@/components/forms/ActionForm'
import { Combobox } from '@/components/ui/Combobox'
import { Field, Textarea } from '@/components/ui/Field'
import { must } from '@/lib/admin/must'

export const metadata = { title: 'Area guides' }

/** Area guides (spec 26.10): local notes and FAQs shown on a place's property pages with its market figures. */
export default async function AreaGuidesPage() {
  await requireAdminPage()
  const db = getAdminSupabase()
  const [{ data: guides }, { data: insight }] = must(await Promise.all([
    db.from('area_guides').select('location_id, notes, faqs, is_published, updated_at, location:locations(display_name)').order('updated_at', { ascending: false }),
    db.from('market_insight').select('refreshed_at').limit(1).maybeSingle(),
  ]))
  return (
    <div className="space-y-5">
      <AdminHeader title="Area guides" description={<>Market figures on place pages are worked out automatically from live asking prices every day (last refresh: {insight ? formatDate(insight.refreshed_at) : 'not yet'}), shown only where at least the minimum number of listings exists (Settings → Estate agency and market insight). Add your own local notes and FAQs here. Keep them factual; no legal statements.</>} />
      <DataTable
        label="Area guides"
        rows={guides ?? []}
        rowKey={(r) => r.location_id}
        empty="No area guides yet."
        columns={[
          { key: 'place', label: 'Place', render: (r) => (Array.isArray(r.location) ? r.location[0]?.display_name : r.location?.display_name) ?? '' },
          { key: 'pub', label: 'Published', render: (r) => (r.is_published ? 'Yes' : 'Draft') },
          { key: 'faqs', label: 'FAQs', render: (r) => String(Array.isArray(r.faqs) ? r.faqs.length : 0) },
          { key: 'updated', label: 'Updated', render: (r) => formatDate(r.updated_at) },
        ]}
      />
      <Panel title="Write or update an area guide">
        <ActionForm action={saveAreaGuideAction} submitLabel="Save area guide" className="grid gap-4">
          <Field label="Place" htmlFor="ag-loc" hint="Choosing a place that already has a guide replaces it.">
            <Combobox id="ag-loc" name="location_id" endpoint="/api/locations" />
          </Field>
          <Field label="Local notes" htmlFor="ag-notes" optional>
            <Textarea id="ag-notes" name="notes" rows={5} maxLength={4000} />
          </Field>
          <Field label="FAQs" htmlFor="ag-faqs" optional hint="The question on one line, the answer on the next; leave a blank line between pairs.">
            <Textarea id="ag-faqs" name="faqs" rows={6} />
          </Field>
          <label className="flex min-h-11 items-center gap-2 text-small">
            <input type="checkbox" name="is_published" value="true" className="size-5 accent-green" /> Publish on the place’s property pages
          </label>
        </ActionForm>
      </Panel>
    </div>
  )
}
