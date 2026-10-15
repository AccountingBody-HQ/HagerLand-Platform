import { notFound } from 'next/navigation'
import { requireAdminPage } from '@/lib/admin/guard'
import { getProjectWithLinks } from '@/lib/data/projects'
import { saveProjectAction } from '@/app/roodber8/actions/projects'
import { formatDate, formatPhone } from '@/lib/format'
import { PROJECT_STATUS_LABEL } from '@/lib/build-projects'
import { countryName } from '@/lib/countries'
import { AdminHeader, KeyValue, Panel } from '@/components/admin/AdminUi'
import { ProjectView } from '@/components/build/ProjectView'
import { ActionForm } from '@/components/forms/ActionForm'
import { Field, Select, Textarea } from '@/components/ui/Field'

export const metadata = { title: 'Building project' }

export default async function ProjectAdminPage(props: { params: Promise<{ id: string }> }) {
  await requireAdminPage()
  const { id } = await props.params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()
  const data = await getProjectWithLinks(id)
  if (!data) notFound()
  const p = data.project
  return (
    <div className="space-y-5">
      <AdminHeader title={`${p.reference} · ${p.title}`} description={`Started ${formatDate(p.created_at)}`} />
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <ProjectView data={data} requestHref={(rid) => `/roodber8/service-requests/${rid}`} quoteHref={(qid) => `/roodber8/quotes/${qid}`} />
        <div className="space-y-5">
          <Panel title="Customer">
            <KeyValue items={[['Name', p.name], ['Phone', formatPhone(p.phone)], ['Email', p.email], ['Lives in', countryName(p.country_code)], ['Time zone', p.time_zone], ['Best times', p.preferred_times]]} />
          </Panel>
          <Panel title="Status and notes">
            <ActionForm action={saveProjectAction.bind(null, p.id)} submitLabel="Save" resetOnSuccess={false} className="grid gap-3">
              <Field label="Status" htmlFor="pj-status">
                <Select id="pj-status" name="status" defaultValue={p.status}>
                  {Object.entries(PROJECT_STATUS_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Private notes" htmlFor="pj-notes" optional>
                <Textarea id="pj-notes" name="admin_notes" rows={4} defaultValue={p.admin_notes ?? ''} maxLength={4000} />
              </Field>
            </ActionForm>
          </Panel>
        </div>
      </div>
    </div>
  )
}
