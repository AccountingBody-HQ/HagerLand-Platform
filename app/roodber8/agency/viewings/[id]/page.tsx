import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { saveViewingAction } from '@/app/roodber8/actions/agency'
import { STATUS_LABEL, VIEWING_MODE_LABEL, VIEWING_STATUSES } from '@/lib/agency'
import { formatAppointment, formatDate, formatPhone } from '@/lib/format'
import { AdminHeader, KeyValue, Panel } from '@/components/admin/AdminUi'
import { AgencyRecordSide } from '@/components/admin/AgencyRecordSide'
import { ActionForm } from '@/components/forms/ActionForm'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { must } from '@/lib/admin/must'

export const metadata = { title: 'Viewing' }

function eatLocal(iso: string | null): string {
  if (!iso) return ''
  return new Date(new Date(iso).getTime() + 3 * 3600_000).toISOString().slice(0, 16)
}

export default async function ViewingPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()
  const { data: v } = must(await getAdminSupabase().from('agency_viewings').select('*, property:properties(title, slug)').eq('id', id).maybeSingle())
  if (!v) notFound()
  const p = Array.isArray(v.property) ? v.property[0] : v.property
  return (
    <div className="space-y-5">
      <AdminHeader title={`Viewing ${v.reference}`} description={`${VIEWING_MODE_LABEL[v.mode as 'video']} · ${STATUS_LABEL[v.status]}${v.scheduled_at ? ` · ${formatAppointment(v.scheduled_at)}` : ''}`} />
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-5">
          <Panel title="Request">
            <KeyValue
              items={[
                ['Property', p ? <a key="p" href={`/property/${p.slug}`} target="_blank" rel="noreferrer" className="text-green underline">{p.title}</a> : null],
                ['Visitor', v.name],
                ['Phone', formatPhone(v.phone)],
                ['Email', v.email],
                ['Asked for', v.preferred_times],
                ['Time zone', v.time_zone],
                ['Requested', formatDate(v.created_at)],
                ['Confirmation sent', v.confirmed_at ? formatDate(v.confirmed_at) : null],
                ['Reminder sent', v.reminder_sent_at ? formatDate(v.reminder_sent_at) : null],
                ['Instruction', v.instruction_id ? <Link key="i" href={`/roodber8/agency/instructions/${v.instruction_id}`} prefetch={false} className="text-green underline">Open</Link> : null],
              ]}
            />
            {v.message && <p className="mt-3 whitespace-pre-line text-small">{v.message}</p>}
          </Panel>
          <Panel title="Schedule and feedback">
            <ActionForm action={saveViewingAction.bind(null, v.id)} submitLabel="Save viewing" resetOnSuccess={false}>
              <Field label="Status" htmlFor="w-status">
                <Select id="w-status" name="status" defaultValue={v.status}>
                  {VIEWING_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Date and time (Ethiopia time)" htmlFor="w-when" optional>
                <Input id="w-when" name="scheduled_at" type="datetime-local" defaultValue={eatLocal(v.scheduled_at)} />
              </Field>
              <Field label="Agent" htmlFor="w-agent" optional>
                <Input id="w-agent" name="assigned_agent" defaultValue={v.assigned_agent ?? ''} maxLength={120} />
              </Field>
              <Field label="Video-call link" htmlFor="w-link" optional hint="Needed for video viewings.">
                <Input id="w-link" name="video_link" type="url" defaultValue={v.video_link ?? ''} />
              </Field>
              <Field label="Feedback after the viewing" htmlFor="w-fb" optional className="sm:col-span-2">
                <Textarea id="w-fb" name="feedback" rows={3} defaultValue={v.feedback ?? ''} maxLength={2000} />
              </Field>
              <label className="flex min-h-11 items-center gap-2 text-small sm:col-span-2">
                <input type="checkbox" name="send_confirmation" value="true" className="size-5 accent-green" /> Email the confirmation again (for example after a change of time)
              </label>
            </ActionForm>
          </Panel>
        </div>
        <AgencyRecordSide entity="viewing" id={v.id} />
      </div>
    </div>
  )
}
