import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { decideOfferAction } from '@/app/roodber8/actions/agency'
import { OFFER_STATUSES, STATUS_LABEL } from '@/lib/agency'
import { formatDate, formatETB, formatPhone } from '@/lib/format'
import { AdminHeader, KeyValue, Panel } from '@/components/admin/AdminUi'
import { AgencyRecordSide } from '@/components/admin/AgencyRecordSide'
import { ActionForm } from '@/components/forms/ActionForm'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'

export const metadata = { title: 'Offer' }

export default async function OfferPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()
  const { data: o } = await getAdminSupabase().from('agency_offers').select('*, property:properties(title, slug, price_etb)').eq('id', id).maybeSingle()
  if (!o) notFound()
  const p = Array.isArray(o.property) ? o.property[0] : o.property
  return (
    <div className="space-y-5">
      <AdminHeader title={`Offer ${o.reference} · ${formatETB(o.amount_etb)}`} description={`${STATUS_LABEL[o.status]} · received ${formatDate(o.created_at)}`} />
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-5">
          <Panel title="Offer">
            <KeyValue
              items={[
                ['Property', p ? <a key="p" href={`/property/${p.slug}`} target="_blank" rel="noreferrer" className="text-green underline">{p.title}</a> : null],
                ['Asking price', p?.price_etb ? formatETB(p.price_etb) : null],
                ['Offer', formatETB(o.amount_etb)],
                ['Buyer', o.name],
                ['Phone', formatPhone(o.phone)],
                ['Email', o.email],
                ['Funding', o.funding_note],
                ['Conditions', o.conditions],
                ['Counter-offer', o.counter_amount_etb ? formatETB(o.counter_amount_etb) : null],
                ['Owner decision', o.vendor_decision],
                ['Instruction', o.instruction_id ? <Link key="i" href={`/roodber8/agency/instructions/${o.instruction_id}`} prefetch={false} className="text-green underline">Open</Link> : null],
              ]}
            />
          </Panel>
          <Panel title="Record the owner’s decision">
            <ActionForm action={decideOfferAction.bind(null, o.id)} submitLabel="Save decision" resetOnSuccess={false}>
              <Field label="Status" htmlFor="o-status">
                <Select id="o-status" name="status" defaultValue={o.status}>
                  {OFFER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Counter-offer (ETB)" htmlFor="o-counter" optional>
                <Input id="o-counter" name="counter_amount_etb" inputMode="numeric" defaultValue={o.counter_amount_etb ?? ''} />
              </Field>
              <Field label="What the owner decided, and when" htmlFor="o-decision" optional className="sm:col-span-2">
                <Textarea id="o-decision" name="vendor_decision" rows={2} defaultValue={o.vendor_decision ?? ''} maxLength={2000} />
              </Field>
              <label className="flex min-h-11 items-center gap-2 text-small sm:col-span-2">
                <input type="checkbox" name="notify" value="true" defaultChecked className="size-5 accent-green" /> Email the buyer about this decision
              </label>
            </ActionForm>
          </Panel>
        </div>
        <AgencyRecordSide entity="offer" id={o.id} />
      </div>
    </div>
  )
}
