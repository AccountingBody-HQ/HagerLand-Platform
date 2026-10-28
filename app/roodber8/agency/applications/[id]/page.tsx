import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { createTenancyFromApplicationAction, saveApplicationAction } from '@/app/roodber8/actions/lettings'
import { signedDocumentUrl } from '@/lib/storage'
import { APPLICATION_STATUSES, STATUS_LABEL } from '@/lib/agency'
import { formatDate, formatPhone } from '@/lib/format'
import { AdminHeader, KeyValue, Panel } from '@/components/admin/AdminUi'
import { AgencyRecordSide } from '@/components/admin/AgencyRecordSide'
import { TenancyFields } from '@/components/admin/TenancyFields'
import { ActionForm } from '@/components/forms/ActionForm'
import { Field, Select, Textarea } from '@/components/ui/Field'
import { must } from '@/lib/admin/must'

export const metadata = { title: 'Application to rent' }

export default async function ApplicationPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()
  const db = getAdminSupabase()
  const { data: a } = must(await db.from('rental_applications').select('*, property:properties(title, slug, price_etb)').eq('id', id).maybeSingle())
  if (!a) notFound()
  const p = Array.isArray(a.property) ? a.property[0] : a.property
  const [{ data: tenancy }, files] = must(await Promise.all([
    db.from('tenancies').select('id, reference').eq('application_id', a.id).maybeSingle(),
    Promise.all(a.document_paths.map(async (path, i) => ({ name: `Document ${i + 1}`, url: await signedDocumentUrl(path) }))),
  ]))
  return (
    <div className="space-y-5">
      <AdminHeader title={`Application ${a.reference} · ${a.name}`} description={`${STATUS_LABEL[a.status]} · received ${formatDate(a.created_at)}`} />
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-5">
          <Panel title="Applicant">
            <KeyValue
              items={[
                ['Property', p ? <a key="p" href={`/property/${p.slug}`} target="_blank" rel="noreferrer" className="text-green underline">{p.title}</a> : null],
                ['Phone', formatPhone(a.phone)],
                ['Email', a.email],
                ['Move in', a.move_in_date ? formatDate(a.move_in_date) : null],
                ['People', a.occupants],
                ['Work', a.employment_note],
                ['Income', a.income_note],
                ['Documents', files.length ? files.map((f) => (f.url ? <a key={f.name} href={f.url} className="mr-3 text-green underline">{f.name}</a> : f.name)) : 'None'],
              ]}
            />
            {a.message && <p className="mt-3 whitespace-pre-line text-small">{a.message}</p>}
          </Panel>
          <Panel title="Referencing and decision">
            <ActionForm action={saveApplicationAction.bind(null, a.id)} submitLabel="Save" resetOnSuccess={false}>
              <Field label="Status" htmlFor="a-status">
                <Select id="a-status" name="status" defaultValue={a.status}>
                  {APPLICATION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </Select>
              </Field>
              <label className="flex min-h-11 items-center gap-2 self-end text-small">
                <input type="checkbox" name="notify" value="true" defaultChecked className="size-5 accent-green" /> Email the applicant when approved or not
              </label>
              <Field label="Referencing notes (private)" htmlFor="a-ref" optional className="sm:col-span-2">
                <Textarea id="a-ref" name="referencing_notes" rows={4} defaultValue={a.referencing_notes ?? ''} maxLength={4000} />
              </Field>
            </ActionForm>
          </Panel>
          <Panel title="Tenancy">
            {tenancy ? (
              <p className="text-small">
                Tenancy{' '}
                <Link href={`/roodber8/agency/tenancies/${tenancy.id}`} prefetch={false} className="font-semibold text-green underline">
                  {tenancy.reference}
                </Link>{' '}
                was created from this application.
              </p>
            ) : a.status === 'approved' ? (
              <ActionForm action={createTenancyFromApplicationAction.bind(null, a.id)} submitLabel="Create tenancy">
                <TenancyFields p="nt" v={{ title: p?.title ?? '', tenant_names: a.name, start_date: a.move_in_date ?? '', rent_minor: p?.price_etb ? p.price_etb * 100 : undefined }} />
              </ActionForm>
            ) : (
              <p className="text-small text-muted">Approve the application to create the tenancy.</p>
            )}
          </Panel>
        </div>
        <AgencyRecordSide entity="application" id={a.id} />
      </div>
    </div>
  )
}
