import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { saveTenancyAction } from '@/app/roodber8/actions/lettings'
import { STATUS_LABEL } from '@/lib/agency'
import { formatDate } from '@/lib/format'
import { AdminHeader, KeyValue, Panel } from '@/components/admin/AdminUi'
import { AgencyRecordSide } from '@/components/admin/AgencyRecordSide'
import { TenancyFields } from '@/components/admin/TenancyFields'
import { ActionForm } from '@/components/forms/ActionForm'
import { must } from '@/lib/admin/must'

export const metadata = { title: 'Tenancy' }

export default async function TenancyPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()
  const { data: t } = must(await getAdminSupabase().from('tenancies').select('*, managed:managed_properties(id, reference, title), property:properties(title, slug), application:rental_applications(id, reference)').eq('id', id).maybeSingle())
  if (!t) notFound()
  const one = <T,>(x: T | T[] | null): T | null => (Array.isArray(x) ? (x[0] ?? null) : x)
  const managed = one(t.managed)
  const property = one(t.property)
  const application = one(t.application)
  return (
    <div className="space-y-5">
      <AdminHeader title={`Tenancy ${t.reference} · ${t.title}`} description={`${STATUS_LABEL[t.status]} · from ${formatDate(t.start_date)}`} />
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-5">
          <Panel title="Links">
            <KeyValue
              items={[
                ['Listing', property ? <a key="p" href={`/property/${property.slug}`} target="_blank" rel="noreferrer" className="text-green underline">{property.title}</a> : null],
                ['Application', application ? <Link key="a" href={`/roodber8/agency/applications/${application.id}`} prefetch={false} className="text-green underline">{application.reference}</Link> : null],
                ['Managed property', managed ? <Link key="m" href={`/roodber8/managed-properties/${managed.id}`} prefetch={false} className="text-green underline">{`${managed.reference} · ${managed.title}`}</Link> : 'Not managed by HagerLand'],
                ['Renewal reminder sent', t.renewal_reminded_at ? formatDate(t.renewal_reminded_at) : null],
                ['Notice reminder sent', t.notice_reminded_at ? formatDate(t.notice_reminded_at) : null],
              ]}
            />
          </Panel>
          <Panel title="Tenancy details">
            <ActionForm action={saveTenancyAction.bind(null, t.id)} submitLabel="Save tenancy" resetOnSuccess={false}>
              <TenancyFields p="et" v={{ ...t, managed_ref: managed?.reference ?? '' }} />
            </ActionForm>
          </Panel>
        </div>
        <AgencyRecordSide entity="tenancy" id={t.id} />
      </div>
    </div>
  )
}
