import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { linkInstructionListingAction, saveInstructionTermsAction, setInstructionStageAction } from '@/app/roodber8/actions/agency'
import { INSTRUCTION_STAGES, STAGE_LABEL, STATUS_LABEL, instructionFee, type InstructionStage } from '@/lib/agency'
import { formatAppointment, formatDate, formatETB } from '@/lib/format'
import { AdminHeader, KeyValue, Panel } from '@/components/admin/AdminUi'
import { AgencyRecordSide } from '@/components/admin/AgencyRecordSide'
import { ProgressItem } from '@/components/admin/AgencyTools'
import { ActionForm } from '@/components/forms/ActionForm'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'

export const metadata = { title: 'Instruction' }

/** One instruction: terms, stage, the listing it is marketed on, valuations, viewings, offers and sale progression. */
export default async function InstructionPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()
  const db = getAdminSupabase()
  const { data: i } = await db.from('agency_instructions').select('*, contact:agency_contacts(id, name), property:properties(id, title, slug, short_id, status, lister_type), deal:deals(reference)').eq('id', id).maybeSingle()
  if (!i) notFound()
  const [{ data: vals }, { data: views }, { data: offers }, { data: apps }, { data: progress }] = await Promise.all([
    db.from('agency_valuations').select('id, reference, status, appointment_at').eq('instruction_id', id).order('created_at', { ascending: false }),
    db.from('agency_viewings').select('id, reference, name, status, scheduled_at').eq('instruction_id', id).order('created_at', { ascending: false }),
    db.from('agency_offers').select('id, reference, name, amount_etb, status').eq('instruction_id', id).order('created_at', { ascending: false }),
    db.from('rental_applications').select('id, reference, name, status').eq('instruction_id', id).order('created_at', { ascending: false }),
    db.from('sale_progress_items').select('id, label, done').eq('instruction_id', id).order('sort'),
  ])
  const one = <T,>(x: T | T[] | null): T | null => (Array.isArray(x) ? (x[0] ?? null) : x)
  const contact = one(i.contact)
  const property = one(i.property)
  const deal = one(i.deal)
  const fee = instructionFee(i, i.final_price_etb ?? i.asking_price_etb)
  const list = (title: string, rows: { href: string; text: string }[]) => (
    <Panel title={title}>
      {rows.length === 0 ? (
        <p className="text-small text-muted">None yet.</p>
      ) : (
        <ul className="space-y-1 text-small">
          {rows.map((r) => (
            <li key={r.href}>
              <Link href={r.href} prefetch={false} className="text-green underline">
                {r.text}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
  return (
    <div className="space-y-5">
      <AdminHeader title={`${i.reference} · ${i.title}`} description={`${i.purpose === 'sale' ? 'Sale' : 'Letting'} · ${STAGE_LABEL[i.stage as InstructionStage]} · from ${i.source.replace('_', ' ')}`} />
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-5">
          <Panel title="Stage">
            <KeyValue
              items={[
                ['Client', contact ? <Link key="c" href={`/roodber8/agency/contacts/${contact.id}`} prefetch={false} className="text-green underline">{contact.name}</Link> : 'Not linked'],
                ['Live since', i.live_at ? formatDate(i.live_at) : null],
                ['Completed', i.completed_at ? `${formatDate(i.completed_at)}${i.final_price_etb ? ` at ${formatETB(i.final_price_etb)}` : ''}` : null],
                ['Deal', deal ? <Link key="d" href="/roodber8/deals" prefetch={false} className="text-green underline">{deal.reference}</Link> : null],
                ['Fee', fee !== null ? `${formatETB(fee)} (${i.fee_type === 'percent' ? `${i.fee_percent}%` : 'fixed'})` : null],
              ]}
            />
            <ActionForm action={setInstructionStageAction.bind(null, i.id)} submitLabel="Change stage" resetOnSuccess={false}>
              <Field label="Stage" htmlFor="i-stage">
                <Select id="i-stage" name="stage" defaultValue={i.stage}>
                  {INSTRUCTION_STAGES.map((s) => (
                    <option key={s} value={s}>
                      {STAGE_LABEL[s]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={i.purpose === 'sale' ? 'Final price (ETB), for “Completed”' : 'Monthly rent (ETB), for “Completed”'} htmlFor="i-final" optional>
                <Input id="i-final" name="final_price_etb" inputMode="numeric" defaultValue={i.final_price_etb ?? ''} />
              </Field>
            </ActionForm>
          </Panel>
          <Panel title="Written terms">
            <p className="mb-3 text-small text-muted">Needed before “Instructed”. Upload the signed agreement under Documents.</p>
            <ActionForm action={saveInstructionTermsAction.bind(null, i.id)} submitLabel="Save terms" resetOnSuccess={false}>
              <Field label="Fee type" htmlFor="t-type">
                <Select id="t-type" name="fee_type" defaultValue={i.fee_type ?? ''}>
                  <option value="">Not agreed yet</option>
                  <option value="percent">Percentage</option>
                  <option value="fixed">Fixed amount</option>
                </Select>
              </Field>
              <Field label="Percentage" htmlFor="t-pct" optional>
                <Input id="t-pct" name="fee_percent" inputMode="decimal" defaultValue={i.fee_percent ?? ''} />
              </Field>
              <Field label="Fixed fee (ETB)" htmlFor="t-amt" optional>
                <Input id="t-amt" name="fee_amount_etb" inputMode="numeric" defaultValue={i.fee_amount_etb ?? ''} />
              </Field>
              <Field label="Agency" htmlFor="t-agency">
                <Select id="t-agency" name="agency_type" defaultValue={i.agency_type ?? ''}>
                  <option value="">Not agreed yet</option>
                  <option value="sole">Sole agency</option>
                  <option value="multi">Multi-agency</option>
                </Select>
              </Field>
              <Field label="Term starts" htmlFor="t-start">
                <Input id="t-start" name="term_start" type="date" defaultValue={i.term_start ?? ''} />
              </Field>
              <Field label="Term ends" htmlFor="t-end" optional>
                <Input id="t-end" name="term_end" type="date" defaultValue={i.term_end ?? ''} />
              </Field>
              <Field label={i.purpose === 'sale' ? 'Asking price (ETB)' : 'Asking rent per month (ETB)'} htmlFor="t-ask" optional>
                <Input id="t-ask" name="asking_price_etb" inputMode="numeric" defaultValue={i.asking_price_etb ?? ''} />
              </Field>
              <Field label="Agent" htmlFor="t-agent" optional>
                <Input id="t-agent" name="assigned_agent" defaultValue={i.assigned_agent ?? ''} maxLength={120} />
              </Field>
              <Field label="Notes" htmlFor="t-notes" optional className="sm:col-span-2">
                <Textarea id="t-notes" name="notes" rows={3} defaultValue={i.notes ?? ''} maxLength={4000} />
              </Field>
            </ActionForm>
          </Panel>
          <Panel title="Listing">
            {property ? (
              <p className="mb-3 text-small">
                <a href={`/property/${property.slug}`} target="_blank" rel="noreferrer" className="font-semibold text-green underline">
                  {property.title}
                </a>{' '}
                · {property.short_id} · {property.status} · {property.lister_type === 'hagerland' ? 'Marketed by HagerLand' : 'not yet marked as HagerLand-marketed (goes live with the instruction)'}
              </p>
            ) : (
              <p className="mb-3 text-small text-muted">No listing linked. Create it in Properties (lister type HagerLand) and link it here before going live.</p>
            )}
            <ActionForm action={linkInstructionListingAction.bind(null, i.id)} submitLabel="Link listing" className="grid gap-3">
              <Field label="Listing reference or link" htmlFor="i-listing">
                <Input id="i-listing" name="listing" placeholder="e.g. k7f2q9ab" />
              </Field>
            </ActionForm>
          </Panel>
          {list('Valuations', (vals ?? []).map((v) => ({ href: `/roodber8/agency/valuations/${v.id}`, text: `${v.reference} · ${STATUS_LABEL[v.status]}${v.appointment_at ? ` · ${formatAppointment(v.appointment_at)}` : ''}` })))}
          {list('Viewings', (views ?? []).map((v) => ({ href: `/roodber8/agency/viewings/${v.id}`, text: `${v.reference} · ${v.name} · ${STATUS_LABEL[v.status]}${v.scheduled_at ? ` · ${formatAppointment(v.scheduled_at)}` : ''}` })))}
          {i.purpose === 'sale'
            ? list('Offers', (offers ?? []).map((o) => ({ href: `/roodber8/agency/offers/${o.id}`, text: `${o.reference} · ${o.name} · ${formatETB(o.amount_etb)} · ${STATUS_LABEL[o.status]}` })))
            : list('Applications', (apps ?? []).map((a) => ({ href: `/roodber8/agency/applications/${a.id}`, text: `${a.reference} · ${a.name} · ${STATUS_LABEL[a.status]}` })))}
          {(progress ?? []).length > 0 && (
            <Panel title="Sale progression">
              <p className="mb-2 text-small text-muted">Practical steps only. The parties’ own advisers handle the legal work.</p>
              <ul>
                {(progress ?? []).map((p) => (
                  <li key={p.id}>
                    <ProgressItem id={p.id} label={p.label} done={p.done} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
        <AgencyRecordSide entity="instruction" id={i.id} />
      </div>
    </div>
  )
}
