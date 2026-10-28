import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { addRequirementAction, saveAgencyContactAction } from '@/app/roodber8/actions/agency'
import { CONTACT_ROLES, ROLE_LABEL, STAGE_LABEL, STATUS_LABEL, type InstructionStage } from '@/lib/agency'
import { PROPERTY_TYPES } from '@/lib/labels'
import { formatDate, formatETB } from '@/lib/format'
import { AdminHeader, KeyValue, Panel } from '@/components/admin/AdminUi'
import { AgencyRecordSide } from '@/components/admin/AgencyRecordSide'
import { RequirementTools } from '@/components/admin/AgencyTools'
import { ActionForm } from '@/components/forms/ActionForm'
import { LocationMultiPicker } from '@/components/forms/LocationMultiPicker'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { must } from '@/lib/admin/must'

export const metadata = { title: 'Agency contact' }

/** One contact: details and consent, buying or renting requirements with live matches, and their records. */
export default async function ContactPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()
  const db = getAdminSupabase()
  const { data: c } = must(await db.from('agency_contacts').select('*').eq('id', id).maybeSingle())
  if (!c) notFound()
  const [{ data: reqs }, { data: instructions }, { data: valuations }, { data: viewings }, { data: offers }, { data: apps }] = must(await Promise.all([
    db.from('applicant_requirements').select('*').eq('contact_id', id).order('created_at', { ascending: false }),
    db.from('agency_instructions').select('id, reference, title, stage').eq('contact_id', id).order('created_at', { ascending: false }),
    db.from('agency_valuations').select('id, reference, status, created_at').eq('contact_id', id).order('created_at', { ascending: false }),
    db.from('agency_viewings').select('id, reference, status, created_at').eq('contact_id', id).order('created_at', { ascending: false }),
    db.from('agency_offers').select('id, reference, status, amount_etb').eq('contact_id', id).order('created_at', { ascending: false }),
    db.from('rental_applications').select('id, reference, status').eq('contact_id', id).order('created_at', { ascending: false }),
  ]))
  const matches = await Promise.all((reqs ?? []).map(async (r) => ({ id: r.id, rows: r.is_active ? ((must(await db.rpc('agency_requirement_matches', { p_requirement: r.id, p_limit: 10 }))).data ?? []) : [] })))
  const locIds = Array.from(new Set((reqs ?? []).flatMap((r) => r.location_ids)))
  const { data: locs } = locIds.length ? must(await db.from('locations').select('id, display_name').in('id', locIds)) : { data: [] }
  const placeName = (lid: string) => locs?.find((l) => l.id === lid)?.display_name ?? 'a place'
  const related = [
    ...(instructions ?? []).map((x) => ({ href: `/roodber8/agency/instructions/${x.id}`, text: `${x.reference} · ${x.title} · ${STAGE_LABEL[x.stage as InstructionStage]}` })),
    ...(valuations ?? []).map((x) => ({ href: `/roodber8/agency/valuations/${x.id}`, text: `Valuation ${x.reference} · ${STATUS_LABEL[x.status]}` })),
    ...(viewings ?? []).map((x) => ({ href: `/roodber8/agency/viewings/${x.id}`, text: `Viewing ${x.reference} · ${STATUS_LABEL[x.status]}` })),
    ...(offers ?? []).map((x) => ({ href: `/roodber8/agency/offers/${x.id}`, text: `Offer ${x.reference} · ${formatETB(x.amount_etb)} · ${STATUS_LABEL[x.status]}` })),
    ...(apps ?? []).map((x) => ({ href: `/roodber8/agency/applications/${x.id}`, text: `Application ${x.reference} · ${STATUS_LABEL[x.status]}` })),
  ]
  return (
    <div className="space-y-5">
      <AdminHeader title={`${c.name} · ${c.reference}`} description={`Added ${formatDate(c.created_at)} · ${c.roles.map((r) => ROLE_LABEL[r as 'buyer']).join(', ')}`} />
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-5">
          <Panel title="Details and consent">
            <KeyValue items={[['Marketing consent', c.marketing_consent ? `Yes, since ${formatDate(c.consent_at)} (${c.consent_source ?? ''})` : c.consent_source?.startsWith('withdrawn') ? `Withdrawn (${c.consent_source})` : 'No'], ['Time zone', c.time_zone], ['Linked account', c.user_id ? 'Yes' : 'No']]} />
            <div className="mt-4">
              <ActionForm action={saveAgencyContactAction.bind(null, c.id)} submitLabel="Save contact" resetOnSuccess={false}>
                <Field label="Name" htmlFor="c-name">
                  <Input id="c-name" name="name" defaultValue={c.name} maxLength={120} />
                </Field>
                <Field label="Email" htmlFor="c-email" optional>
                  <Input id="c-email" name="email" type="email" defaultValue={c.email ?? ''} />
                </Field>
                <Field label="Phone" htmlFor="c-phone" optional>
                  <Input id="c-phone" name="phone" defaultValue={c.phone ?? ''} />
                </Field>
                <Field label="Agent" htmlFor="c-agent" optional>
                  <Input id="c-agent" name="assigned_agent" defaultValue={c.assigned_agent ?? ''} maxLength={120} />
                </Field>
                <fieldset className="sm:col-span-2">
                  <legend className="mb-1 text-small font-semibold">Roles</legend>
                  <div className="flex flex-wrap gap-4">
                    {CONTACT_ROLES.map((r) => (
                      <label key={r} className="flex min-h-11 items-center gap-2 text-small">
                        <input type="checkbox" name="roles" value={r} defaultChecked={c.roles.includes(r)} className="size-5 accent-green" /> {ROLE_LABEL[r]}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="flex min-h-11 items-center gap-2 text-small sm:col-span-2">
                  <input type="checkbox" name="marketing_consent" value="true" defaultChecked={c.marketing_consent} className="size-5 accent-green" /> Agreed to receive property emails
                </label>
                <Field label="How they agreed (or withdrew)" htmlFor="c-src" optional>
                  <Input id="c-src" name="consent_source" defaultValue={c.marketing_consent ? (c.consent_source ?? '') : ''} maxLength={120} />
                </Field>
                <Field label="Notes" htmlFor="c-notes" optional className="sm:col-span-2">
                  <Textarea id="c-notes" name="notes" rows={3} defaultValue={c.notes ?? ''} maxLength={4000} />
                </Field>
              </ActionForm>
            </div>
          </Panel>
          <Panel title="What they are looking for">
            {(reqs ?? []).length === 0 && <p className="mb-4 text-small text-muted">No requirements recorded.</p>}
            <ul className="space-y-4">
              {(reqs ?? []).map((r) => {
                const m = matches.find((x) => x.id === r.id)?.rows ?? []
                return (
                  <li key={r.id} className="rounded-md border border-border p-3">
                    <p className="font-semibold text-ink">
                      {r.purpose === 'sale' ? 'To buy' : 'To rent'}
                      {r.budget_max_etb ? `, up to ${formatETB(r.budget_max_etb)}` : ''}
                      {r.budget_min_etb ? `, from ${formatETB(r.budget_min_etb)}` : ''}
                      {r.beds_min ? `, ${r.beds_min}+ beds` : ''}
                      {!r.is_active && ' (paused)'}
                    </p>
                    <p className="text-small text-muted">
                      {[r.property_types.map((t) => PROPERTY_TYPES.find((p) => p.value === t)?.label ?? t).join(', '), r.location_ids.map(placeName).join(', '), r.last_emailed_at ? `Last emailed ${formatDate(r.last_emailed_at)}` : null, r.notes].filter(Boolean).join(' · ')}
                    </p>
                    {r.is_active && (
                      <div className="mt-2">
                        <p className="text-small font-semibold">Matching live listings: {m.length}</p>
                        <ul className="text-small">
                          {m.map((x) => (
                            <li key={x.id}>
                              <a href={`/property/${x.slug}`} className="text-green underline" target="_blank" rel="noreferrer">
                                {x.title}
                              </a>{' '}
                              · {x.price_etb ? formatETB(x.price_etb) : 'Price on request'}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="mt-3">
                      <RequirementTools id={r.id} active={r.is_active} canEmail={r.is_active && m.length > 0 && Boolean(c.email) && c.marketing_consent} />
                    </div>
                  </li>
                )
              })}
            </ul>
            <h3 className="mt-5 font-semibold">Add requirements</h3>
            <ActionForm action={addRequirementAction} submitLabel="Save requirements">
              <input type="hidden" name="contact_id" value={c.id} />
              <Field label="Looking to" htmlFor="r-purpose">
                <Select id="r-purpose" name="purpose" defaultValue="sale">
                  <option value="sale">Buy</option>
                  <option value="rent">Rent</option>
                </Select>
              </Field>
              <Field label="Bedrooms at least" htmlFor="r-beds" optional>
                <Input id="r-beds" name="beds_min" inputMode="numeric" />
              </Field>
              <Field label="Budget from (ETB)" htmlFor="r-min" optional>
                <Input id="r-min" name="budget_min_etb" inputMode="numeric" />
              </Field>
              <Field label="Budget up to (ETB)" htmlFor="r-max" optional>
                <Input id="r-max" name="budget_max_etb" inputMode="numeric" />
              </Field>
              <Field label="Areas" htmlFor="r-locs" optional className="sm:col-span-2">
                <LocationMultiPicker id="r-locs" name="location_ids" />
              </Field>
              <fieldset className="sm:col-span-2">
                <legend className="mb-1 text-small font-semibold">Property types</legend>
                <div className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
                  {PROPERTY_TYPES.map((t) => (
                    <label key={t.value} className="flex min-h-10 items-center gap-2 text-small">
                      <input type="checkbox" name="property_types" value={t.value} className="size-5 accent-green" /> {t.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <Field label="Notes" htmlFor="r-notes" optional className="sm:col-span-2">
                <Input id="r-notes" name="notes" maxLength={2000} />
              </Field>
            </ActionForm>
          </Panel>
          <Panel title="Records">
            {related.length === 0 ? (
              <p className="text-small text-muted">No valuations, viewings, offers, applications or instructions yet.</p>
            ) : (
              <ul className="space-y-1 text-small">
                {related.map((r) => (
                  <li key={r.href}>
                    <Link href={r.href} prefetch={false} className="text-green underline">
                      {r.text}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
        <AgencyRecordSide entity="contact" id={c.id} />
      </div>
    </div>
  )
}
