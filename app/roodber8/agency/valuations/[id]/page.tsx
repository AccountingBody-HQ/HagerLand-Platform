import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { saveValuationAction } from '@/app/roodber8/actions/agency'
import { signedDocumentUrl } from '@/lib/storage'
import { STATUS_LABEL, VALUATION_OUTCOMES, VALUATION_STATUSES } from '@/lib/agency'
import { PROPERTY_TYPES } from '@/lib/labels'
import { formatDate, formatPhone } from '@/lib/format'
import { AdminHeader, KeyValue, Panel } from '@/components/admin/AdminUi'
import { AgencyRecordSide } from '@/components/admin/AgencyRecordSide'
import { ReportUpload } from '@/components/admin/AgencyTools'
import { ActionForm } from '@/components/forms/ActionForm'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { must } from '@/lib/admin/must'

export const metadata = { title: 'Valuation' }

/** Ethiopia-time value for a datetime-local field. */
function eatLocal(iso: string | null): string {
  if (!iso) return ''
  return new Date(new Date(iso).getTime() + 3 * 3600_000).toISOString().slice(0, 16)
}

export default async function ValuationPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()
  const db = getAdminSupabase()
  const { data: v } = must(await db.from('agency_valuations').select('*, contact:agency_contacts(id, name, email, phone), location:locations(display_name)').eq('id', id).maybeSingle())
  if (!v) notFound()
  const one = <T,>(x: T | T[] | null): T | null => (Array.isArray(x) ? (x[0] ?? null) : x)
  const c = one(v.contact)
  const report = v.report_path ? await signedDocumentUrl(v.report_path, `${v.reference}-valuation.pdf`) : null
  return (
    <div className="space-y-5">
      <AdminHeader title={`Valuation ${v.reference}`} description={`Requested ${formatDate(v.created_at)} · ${STATUS_LABEL[v.status]}`} />
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-5">
          <Panel title="Request">
            <KeyValue
              items={[
                ['Owner', c ? <Link key="c" href={`/roodber8/agency/contacts/${c.id}`} prefetch={false} className="text-green underline">{c.name}</Link> : null],
                ['Phone', c?.phone ? formatPhone(c.phone) : null],
                ['Email', c?.email],
                ['For', v.purpose === 'sale' ? 'Sale' : 'Letting'],
                ['Property', PROPERTY_TYPES.find((t) => t.value === v.property_type)?.label],
                ['Where', [one(v.location)?.display_name, v.address_line].filter(Boolean).join(' · ')],
                ['Preferred times', v.preferred_times],
                ['Time zone', v.time_zone],
                ['Instruction', v.instruction_id ? <Link key="i" href={`/roodber8/agency/instructions/${v.instruction_id}`} prefetch={false} className="text-green underline">Open the instruction</Link> : null],
              ]}
            />
            {v.details && <p className="mt-3 whitespace-pre-line text-small">{v.details}</p>}
          </Panel>
          <Panel title="Appointment and result">
            <ActionForm action={saveValuationAction.bind(null, v.id)} submitLabel="Save valuation" resetOnSuccess={false}>
              <Field label="Status" htmlFor="v-status">
                <Select id="v-status" name="status" defaultValue={v.status}>
                  {VALUATION_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Appointment (Ethiopia time)" htmlFor="v-when" optional>
                <Input id="v-when" name="appointment_at" type="datetime-local" defaultValue={eatLocal(v.appointment_at)} />
              </Field>
              <Field label="Agent" htmlFor="v-agent" optional>
                <Input id="v-agent" name="assigned_agent" defaultValue={v.assigned_agent ?? ''} maxLength={120} />
              </Field>
              <Field label="Outcome" htmlFor="v-outcome">
                <Select id="v-outcome" name="outcome" defaultValue={v.outcome}>
                  {VALUATION_OUTCOMES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Valuation from (ETB)" htmlFor="v-low" optional>
                <Input id="v-low" name="value_low_etb" inputMode="numeric" defaultValue={v.value_low_etb ?? ''} />
              </Field>
              <Field label="Valuation to (ETB)" htmlFor="v-high" optional>
                <Input id="v-high" name="value_high_etb" inputMode="numeric" defaultValue={v.value_high_etb ?? ''} />
              </Field>
              <Field label="Notes" htmlFor="v-notes" optional className="sm:col-span-2">
                <Textarea id="v-notes" name="notes" rows={3} defaultValue={v.notes ?? ''} maxLength={4000} />
              </Field>
            </ActionForm>
          </Panel>
          <Panel title="Report">
            {report && (
              <p className="mb-3 text-small">
                <a href={report} className="font-semibold text-green underline">
                  Open the report
                </a>{' '}
                (link works for 10 minutes)
              </p>
            )}
            <ReportUpload id={v.id} folder={v.id} />
          </Panel>
        </div>
        <AgencyRecordSide entity="valuation" id={v.id} />
      </div>
    </div>
  )
}
