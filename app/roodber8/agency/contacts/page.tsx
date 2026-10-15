import Link from 'next/link'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { saveAgencyContactAction } from '@/app/roodber8/actions/agency'
import { CONTACT_ROLES, ROLE_LABEL } from '@/lib/agency'
import { formatDate, formatPhone } from '@/lib/format'
import { AdminHeader, DataTable, FilterBar, FilterField, Panel, filterInput } from '@/components/admin/AdminUi'
import { ActionForm } from '@/components/forms/ActionForm'
import { Field, Input } from '@/components/ui/Field'

export const metadata = { title: 'Agency contacts' }

const like = (q: string) => `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`

/** Vendors, landlords, buyers and tenants, with their consent records (spec 26.5). */
export default async function ContactsPage(props: { searchParams: Promise<{ q?: string; role?: string }> }) {
  const sp = await props.searchParams
  const q = sp.q?.trim().slice(0, 100) ?? ''
  const role = CONTACT_ROLES.find((r) => r === sp.role)
  let query = getAdminSupabase().from('agency_contacts').select('id, reference, name, email, phone, roles, marketing_consent, assigned_agent, created_at').order('created_at', { ascending: false }).limit(200)
  if (q) query = query.ilike('name', like(q))
  if (role) query = query.contains('roles', [role])
  const { data } = await query
  return (
    <div className="space-y-5">
      <AdminHeader title="Contacts" description="Everyone the agency deals with. Marketing emails go only to contacts with recorded consent." />
      <FilterBar action="/roodber8/agency/contacts">
        <FilterField label="Name">
          <input name="q" defaultValue={q} className={`${filterInput} h-10`} />
        </FilterField>
        <FilterField label="Role">
          <select name="role" defaultValue={role ?? ''} className={`${filterInput} h-10`}>
            <option value="">All</option>
            {CONTACT_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>
      <DataTable
        label="Contacts"
        rows={data ?? []}
        rowKey={(r) => r.id}
        empty="No contacts yet. They are added automatically from valuation, viewing, offer and application forms, or below."
        columns={[
          { key: 'name', label: 'Name', render: (r) => <Link href={`/roodber8/agency/contacts/${r.id}`} prefetch={false} className="font-semibold text-green hover:underline">{r.name}</Link> },
          { key: 'roles', label: 'Roles', render: (r) => r.roles.map((x) => ROLE_LABEL[x as 'buyer'] ?? x).join(', ') },
          { key: 'contact', label: 'Contact', render: (r) => [r.email, r.phone ? formatPhone(r.phone) : null].filter(Boolean).join(' · ') },
          { key: 'consent', label: 'Marketing consent', render: (r) => (r.marketing_consent ? 'Yes' : 'No') },
          { key: 'agent', label: 'Agent', render: (r) => r.assigned_agent ?? '' },
          { key: 'added', label: 'Added', render: (r) => formatDate(r.created_at) },
        ]}
      />
      <Panel title="Add a contact">
        <ActionForm action={saveAgencyContactAction.bind(null, null)} submitLabel="Add contact">
          <Field label="Name" htmlFor="nc-name">
            <Input id="nc-name" name="name" maxLength={120} />
          </Field>
          <Field label="Email" htmlFor="nc-email" optional>
            <Input id="nc-email" name="email" type="email" />
          </Field>
          <Field label="Phone" htmlFor="nc-phone" optional>
            <Input id="nc-phone" name="phone" />
          </Field>
          <Field label="Agent" htmlFor="nc-agent" optional>
            <Input id="nc-agent" name="assigned_agent" maxLength={120} />
          </Field>
          <fieldset className="sm:col-span-2">
            <legend className="mb-1 text-small font-semibold">Roles</legend>
            <div className="flex flex-wrap gap-4">
              {CONTACT_ROLES.map((r) => (
                <label key={r} className="flex min-h-11 items-center gap-2 text-small">
                  <input type="checkbox" name="roles" value={r} className="size-5 accent-green" /> {ROLE_LABEL[r]}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex min-h-11 items-center gap-2 text-small sm:col-span-2">
            <input type="checkbox" name="marketing_consent" value="true" className="size-5 accent-green" /> Agreed to receive property emails
          </label>
          <Field label="How they agreed" htmlFor="nc-src" optional hint="Required with consent, e.g. “by phone, 15 Oct 2026”.">
            <Input id="nc-src" name="consent_source" maxLength={120} />
          </Field>
        </ActionForm>
      </Panel>
    </div>
  )
}
