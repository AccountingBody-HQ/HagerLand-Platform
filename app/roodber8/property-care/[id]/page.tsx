import { notFound } from 'next/navigation'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate, formatPhone } from '@/lib/format'
import { countryName } from '@/lib/countries'
import { CARE_OCCUPANCY, CARE_PROPERTY_TYPES, CARE_SERVICE_LABEL, CARE_STATUS_LABEL } from '@/lib/property-care'
import { AdminHeader, KeyValue, Panel } from '@/components/admin/AdminUi'
import { AuditTrail } from '@/components/admin/AuditTrail'
import { CareRequestTool } from '@/components/admin/CareTools'

export const metadata = { title: 'Property Care request' }

export default async function CareRequestPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  await requireAdminPage()
  if (!/^[0-9a-f-]{36}$/.test(params.id)) notFound()
  const db = getAdminSupabase()
  const { data: r } = await db.from('property_care_requests').select('*').eq('id', params.id).maybeSingle()
  if (!r) notFound()
  const [{ data: loc }, { data: history }] = await Promise.all([
    r.property_location_id ? db.from('locations').select('display_name').eq('id', r.property_location_id).maybeSingle() : Promise.resolve({ data: null }),
    db.from('audit_log').select('id, action, created_at, diff').eq('entity_id', r.id).order('created_at', { ascending: false }).limit(50),
  ])
  return (
    <div className="space-y-5">
      <AdminHeader title={`${r.name} · ${r.reference}`} description={`Received ${formatDate(r.created_at)} · ${CARE_STATUS_LABEL[r.status]}`} />
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          <Panel title="Owner">
            <KeyValue items={[['Name', r.name], ['Email', r.email], ['Phone', formatPhone(r.phone)], ['Lives in', [r.city, countryName(r.country_code)].filter(Boolean).join(', ')], ['Time zone', r.time_zone], ['Best time', r.contact_time], ['Prefers', r.preferred_contact], ['News', r.marketing_consent ? 'Yes' : 'No']]} />
          </Panel>
          <Panel title="Property">
            <KeyValue
              items={[
                ['Where', loc?.display_name ?? r.property_location_text],
                ['Type', CARE_PROPERTY_TYPES.find((t) => t.value === r.property_type)?.label],
                ['Used by', CARE_OCCUPANCY.find((t) => t.value === r.occupancy)?.label],
                ['Services', r.services.map((s) => CARE_SERVICE_LABEL[s] ?? s).join(', ')],
              ]}
            />
            {r.message && <p className="mt-4 whitespace-pre-line text-small">{r.message}</p>}
          </Panel>
        </div>
        <div className="space-y-5">
          <Panel title="Stage and notes">
            <CareRequestTool id={r.id} status={r.status} notes={r.admin_notes} />
          </Panel>
          <Panel title="History">
            <AuditTrail entries={history ?? []} />
          </Panel>
        </div>
      </div>
    </div>
  )
}
