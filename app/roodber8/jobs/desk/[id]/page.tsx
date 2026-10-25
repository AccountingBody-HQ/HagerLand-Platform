import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isOwnerSession, requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { countryName } from '@/lib/countries'
import { formatDate, formatMoney, formatPhone } from '@/lib/format'
import { TRADES, tradeLabel } from '@/lib/jobs'
import { readJobsSwitches } from '@/lib/jobs-switches'
import { agreementLink } from '@/lib/jobs-desk-files'
import {
  ASSIGNMENT_STATUSES,
  ASSIGNMENT_STATUS_LABEL,
  CANDIDATE_STATUS_LABEL,
  CONSENT_METHODS,
  DEFAULT_GUARANTEE_DAYS,
  END_REASONS,
  PLACEMENT_STATUS_LABEL,
  ROLE_TYPES,
  SHARE_METHODS,
  SOURCE_LABEL,
  canReverse,
  deskSeesContact,
  feeTotals,
  introductionBlocker,
  percentageFeeMinor,
} from '@/lib/jobs-desk'
import { bpsToPercent } from '@/lib/supply/money'
import {
  addFreeReplacementAction,
  addToShortlistAction,
  endPlacementAction,
  markAskedAction,
  recordConsentAction,
  recordDeclinedAction,
  recordPlacementAction,
  saveCandidateNotesAction,
  setCandidateOutcomeAction,
  updateAssignmentAction,
} from '@/app/roodber8/actions/jobs-desk'
import { AdminHeader, KeyValue, Panel, StatusBadge } from '@/components/admin/AdminUi'
import { ActionForm } from '@/components/forms/ActionForm'
import { RunButton } from '@/components/admin/AgencyTools'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Badge } from '@/components/ui/Badge'
import { AdultConfirm, CancelPlacement, FeeTools, IntroduceSelector, WithdrawConsent, type FeeEntryView, type FeeTermsView } from '@/components/admin/RecruitmentDeskTools'

export const metadata = { title: 'Recruitment assignment' }

const STEP_LABEL: Record<string, string> = {
  assignment_opened: 'Assignment opened',
  status_changed: 'Status changed',
  shortlisted: 'Added to the shortlist',
  asked: 'Asked',
  declined: 'Said no',
  adult_confirmed: '18 or older confirmed',
  consent_recorded: 'Consent recorded',
  consent_withdrawn: 'Consent withdrawn',
  introduced: 'Introduced',
  interviewed: 'Interviewed',
  not_hired: 'Not hired',
  placed: 'Placement recorded',
  left_inside_guarantee: 'Left inside the guarantee',
  left_after_guarantee: 'Left after the guarantee',
  free_replacement: 'Free replacement',
  placement_cancelled: 'Placement cancelled',
  fee_terms_saved: 'Fee terms saved',
  fee_status: 'Fee status changed',
  fee_entry: 'Fee entry added',
  fee_reversal: 'Fee entry reversed',
}

/**
 * One assignment (Owner and Operations). Fee amounts, percentages and money are loaded and rendered only for the owner;
 * Operations sees "Fee agreed in writing: Yes/No" and nothing else about fees.
 */
export default async function RecruitmentAssignmentPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  await requireAdminPage()
  if (!/^[0-9a-f-]{36}$/.test(params.id)) notFound()
  const db = getAdminSupabase()
  const { data: a } = await db.from('recruitment_assignments').select('*, request:service_requests(id, reference, title), org:organisations(name, slug)').eq('id', params.id).maybeSingle()
  if (!a) notFound()
  const [owner, switches, { data: candidates }, { data: placements }, { data: events }] = await Promise.all([
    isOwnerSession(),
    readJobsSwitches(),
    db.from('recruitment_candidates').select('*').eq('assignment_id', a.id).order('created_at'),
    db.from('recruitment_placements').select('*').eq('assignment_id', a.id).order('created_at'),
    db.from('recruitment_events').select('id, step, candidate_id, placement_id, actor, created_at').eq('assignment_id', a.id).order('created_at', { ascending: false }).limit(200),
  ])
  const rows = candidates ?? []
  const byId = new Map(rows.map((c) => [c.id, c]))
  const places = placements ?? []
  const placementIds = places.map((p) => p.id)
  // Operations: only whether the fee is agreed in writing. Owner: the terms and the fee record.
  const { data: feeStatus } = placementIds.length ? await db.from('recruitment_fee_terms').select('placement_id, status').in('placement_id', placementIds) : { data: [] }
  const agreed = new Map((feeStatus ?? []).map((t) => [t.placement_id, ['agreed', 'invoiced', 'paid'].includes(t.status)]))
  const feeViews = new Map<string, { terms: FeeTermsView | null; entries: FeeEntryView[]; totals: { due: string; received: string; waived: string; outstanding: string } | null }>()
  if (owner && placementIds.length) {
    const { data: terms } = await db.from('recruitment_fee_terms').select('*').in('placement_id', placementIds)
    const termIds = (terms ?? []).map((t) => t.id)
    const { data: entries } = termIds.length ? await db.from('recruitment_fee_entries').select('*').in('fee_terms_id', termIds).order('created_at') : { data: [] }
    for (const p of places) {
      const t = (terms ?? []).find((x) => x.placement_id === p.id)
      const mine = (entries ?? []).filter((e) => t && e.fee_terms_id === t.id)
      const money = (minor: number | null, currency: string) => (minor === null ? '' : formatMoney(minor / 100, currency, { decimals: minor % 100 ? 2 : 0 }))
      const totals = t ? feeTotals(mine) : null
      const reversed = new Set(mine.filter((e) => e.entry_type === 'reversal').map((e) => e.reverses_entry_id))
      feeViews.set(p.id, {
        terms: t
          ? {
              fee_type: t.fee_type,
              currency: t.currency,
              amount: t.amount_minor === null ? '' : String(t.amount_minor / 100),
              percent: t.percent_bps === null ? '' : String(t.percent_bps / 100),
              basis: t.basis ?? 'first_year_salary',
              basis_note: t.basis_note ?? '',
              basis_amount: t.basis_amount_minor === null ? '' : String(t.basis_amount_minor / 100),
              agreed_in_writing_on: t.agreed_in_writing_on ?? '',
              status: t.status,
              waived_reason: t.waived_reason,
              notes: t.notes ?? '',
              documentUrl: t.document_path ? await agreementLink(t.document_path) : null,
              computedFee:
                t.fee_type === 'fixed'
                  ? money(t.amount_minor, t.currency)
                  : t.percent_bps !== null && t.basis_amount_minor !== null
                    ? `${money(percentageFeeMinor(t.percent_bps, t.basis_amount_minor), t.currency)} (${bpsToPercent(t.percent_bps)})`
                    : t.percent_bps !== null
                      ? bpsToPercent(t.percent_bps)
                      : null,
            }
          : null,
        entries: mine.map((e) => ({ id: e.id, type: e.entry_type, amount: money(e.amount_minor, e.currency), date: formatDate(e.occurred_on), method: e.method, reference: e.reference, reason: e.reason, reversed: reversed.has(e.id), canReverse: canReverse(e, mine) })),
        totals: totals && t ? { due: money(totals.due, t.currency) || '0', received: money(totals.received, t.currency) || '0', waived: money(totals.waived, t.currency) || '0', outstanding: money(totals.outstanding, t.currency) || '0' } : null,
      })
    }
  }
  const request = a.request as { id: string; reference: string; title: string } | null
  const org = a.org as { name: string; slug: string } | null
  const closed = ['filled', 'closed', 'cancelled'].includes(a.status)
  const ready = rows.filter((c) => introductionBlocker(c) === null)
  const placedCandidates = new Set(places.filter((p) => p.status !== 'cancelled').map((p) => p.candidate_id))
  const replaceable = rows.filter((c) => c.introduced_at && !c.consent_withdrawn_at && !placedCandidates.has(c.id))
  const who = (c: (typeof rows)[number]) => (deskSeesContact(c) ? (c.name ?? 'Removed') : `${c.reference} (contact details hidden until they agree)`)

  return (
    <div className="space-y-5">
      <AdminHeader
        title={`Recruitment assignment ${a.reference}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={a.status} /> {ASSIGNMENT_STATUS_LABEL[a.status as keyof typeof ASSIGNMENT_STATUS_LABEL]}
            {request && (
              <>
                {' · '}
                <Link href={`/roodber8/service-requests/${request.id}`} prefetch={false} className="font-semibold text-green underline">
                  Staffing request {request.reference}
                </Link>
              </>
            )}
            {!switches.recruitmentDesk && (
              <>
                <Badge tone="warning">Desk switch off</Badge>
                <span>Nothing is shown or emailed to the employer.</span>
              </>
            )}
          </span>
        }
      />

      <Panel title="Assignment">
        <KeyValue
          items={[
            ['Employer', a.private_client ? 'Private client (no business profile)' : (org?.name ?? '')],
            ['Based outside Ethiopia', a.employer_based_abroad === null ? 'Not asked' : a.employer_based_abroad ? `Yes${a.employer_country ? ` (${countryName(a.employer_country)})` : ''}` : 'No'],
            ['Work in', 'Ethiopia'],
          ]}
        />
        <div className="mt-4">
          <ActionForm action={updateAssignmentAction.bind(null, a.id)} submitLabel="Save assignment" resetOnSuccess={false}>
            <Field label="Status" htmlFor="as-status">
              <Select id="as-status" name="status" defaultValue={a.status}>
                {ASSIGNMENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {ASSIGNMENT_STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Employer business profile" htmlFor="as-org" optional hint="The address of their company page, e.g. /company/abc-construction. Empty: private client.">
              <Input id="as-org" name="employer_slug" defaultValue={org?.slug ?? ''} maxLength={120} />
            </Field>
            <Field label="Roles" htmlFor="as-roles" optional className="sm:col-span-2">
              <Textarea id="as-roles" name="roles" rows={2} maxLength={2000} defaultValue={a.roles ?? ''} />
            </Field>
            <Field label="How many people" htmlFor="as-head" optional>
              <Input id="as-head" name="headcount" inputMode="numeric" defaultValue={a.headcount ?? ''} />
            </Field>
            <Field label="Pay" htmlFor="as-pay" optional>
              <Input id="as-pay" name="pay_text" maxLength={200} defaultValue={a.pay_text ?? ''} />
            </Field>
            <Field label="Start date" htmlFor="as-start" optional>
              <Input id="as-start" name="start_date" type="date" defaultValue={a.start_date ?? ''} />
            </Field>
            <Field label="Why closed (when closing)" htmlFor="as-close" optional>
              <Input id="as-close" name="close_reason" maxLength={500} defaultValue={a.close_reason ?? ''} />
            </Field>
            <Field label="Private notes" htmlFor="as-notes" optional className="sm:col-span-2">
              <Textarea id="as-notes" name="notes" rows={2} maxLength={2000} defaultValue={a.notes ?? ''} />
            </Field>
          </ActionForm>
        </div>
      </Panel>

      {!closed && (
        <Panel title="Add to the shortlist">
          <p className="mb-3 text-small text-muted">Only people you choose are added. An application to another employer’s job shows only its reference and trade until the person agrees to be introduced to this employer.</p>
          <div className="grid gap-4 lg:grid-cols-2">
            <ActionForm action={addToShortlistAction.bind(null, a.id)} submitLabel="Add the applicant" className="grid gap-2">
              <input type="hidden" name="source" value="application" />
              <Field label="Job application reference" htmlFor="sl-app" hint="Like HLA-2026-000123 (email and phone applications).">
                <Input id="sl-app" name="reference" maxLength={20} />
              </Field>
            </ActionForm>
            <ActionForm action={addToShortlistAction.bind(null, a.id)} submitLabel="Add the candidate" className="grid gap-2">
              <input type="hidden" name="source" value="profile" />
              <Field label="Candidate profile reference" htmlFor="sl-prof" hint="Like C-1A2B3C4D. Only visible profiles asking for placement help.">
                <Input id="sl-prof" name="reference" maxLength={12} />
              </Field>
            </ActionForm>
            <ActionForm action={addToShortlistAction.bind(null, a.id)} submitLabel="Add from the register" className="grid gap-2">
              <input type="hidden" name="source" value="register" />
              <Field label="Worker register reference" htmlFor="sl-reg" hint="Like HLW-2026-000045.">
                <Input id="sl-reg" name="reference" maxLength={20} />
              </Field>
            </ActionForm>
            <ActionForm action={addToShortlistAction.bind(null, a.id)} submitLabel="Add the person" className="grid gap-2 sm:grid-cols-2">
              <input type="hidden" name="source" value="manual" />
              <Field label="Name (after a call)" htmlFor="sl-name">
                <Input id="sl-name" name="name" maxLength={120} />
              </Field>
              <Field label="Phone" htmlFor="sl-phone">
                <Input id="sl-phone" name="phone" inputMode="tel" maxLength={32} placeholder="+251 9…" />
              </Field>
              <Field label="Trade" htmlFor="sl-trade">
                <Select id="sl-trade" name="trade" defaultValue="">
                  <option value="">Choose</option>
                  {TRADES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Area" htmlFor="sl-area">
                <Input id="sl-area" name="area" maxLength={200} />
              </Field>
            </ActionForm>
          </div>
        </Panel>
      )}

      <Panel title={`Shortlist (${rows.length})`}>
        {rows.length === 0 ? (
          <p className="text-small text-muted">Nobody on the shortlist yet.</p>
        ) : (
          <ul className="space-y-4">
            {rows.map((c) => {
              const contact = deskSeesContact(c)
              const live = c.consent_at && !c.consent_withdrawn_at && !c.declined_at
              return (
                <li key={c.id} className="rounded-md border border-border p-3" data-testid={`shortlist-${c.reference}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">
                      {who(c)} <span className="font-normal text-muted">· {c.reference}</span>
                    </p>
                    <Badge tone={c.status === 'hired' ? 'green' : ['declined', 'withdrawn', 'not_hired'].includes(c.status) ? 'neutral' : 'info'}>{CANDIDATE_STATUS_LABEL[c.status] ?? c.status}</Badge>
                  </div>
                  <p className="mt-1 text-small text-muted">
                    {SOURCE_LABEL[c.source]}
                    {c.other_employer ? ' (another employer’s job)' : ''}
                    {c.trade ? ` · ${tradeLabel(c.trade)}` : ''}
                    {c.role_text ? ` · ${c.role_text}` : ''}
                    {contact && c.area_text ? ` · ${c.area_text}` : ''}
                  </p>
                  {contact && !c.personal_data_deleted_at && (
                    <p className="mt-1 text-small [overflow-wrap:anywhere]">
                      {c.phone ? formatPhone(c.phone) : ''}
                      {c.phone && c.email ? ' · ' : ''}
                      {c.email ?? ''}
                    </p>
                  )}
                  <p className="mt-1 text-small">
                    18 or older: <strong>{c.adult_confirmed_at ? `yes (${c.adult_confirmed_method === 'source_record' ? 'ticked on their form' : `confirmed by ${CONSENT_METHODS.find((m) => m.value === c.adult_confirmed_method)?.label.toLowerCase() ?? 'staff'}`})` : 'not confirmed'}</strong>
                    {' · '}Consent:{' '}
                    <strong>
                      {c.consent_withdrawn_at
                        ? `withdrawn ${formatDate(c.consent_withdrawn_at)}`
                        : c.consent_at
                          ? `yes, ${formatDate(c.consent_at)} by ${CONSENT_METHODS.find((m) => m.value === c.consent_method)?.label.toLowerCase() ?? ''}`
                          : c.declined_at
                            ? 'said no'
                            : 'not yet'}
                    </strong>
                    {c.consent_at && ` · may share: ${SHARE_METHODS.filter((m) => c[m.key]).map((m) => m.label).join(', ')}`}
                    {c.introduced_at && ` · introduced ${formatDate(c.introduced_at)}`}
                  </p>
                  {!c.personal_data_deleted_at && !closed && (
                    <div className="mt-3 space-y-3 border-t border-border pt-3">
                      {(c.status === 'shortlisted' || (!c.consent_at && !c.declined_at)) && (
                        <div className="flex flex-col gap-2 sm:flex-row">
                          {c.status === 'shortlisted' && <RunButton label="Mark as asked" fn={markAskedAction.bind(null, c.id)} />}
                          {!c.consent_at && !c.declined_at && <RunButton label="Said no" fn={recordDeclinedAction.bind(null, c.id)} variant="ghost" />}
                        </div>
                      )}
                      {!c.adult_confirmed_at && !c.declined_at && !c.consent_withdrawn_at && <AdultConfirm candidateId={c.id} />}
                      {!c.consent_at && !c.declined_at && (
                        <ActionForm action={recordConsentAction.bind(null, c.id)} submitLabel="Record consent" className="grid gap-2 rounded-md bg-stone-50 p-3 sm:grid-cols-2">
                          <p className="text-small font-semibold sm:col-span-2">Agreed to be introduced to this employer, for this request only</p>
                          <Field label="How did they agree?" htmlFor={`cs-m-${c.id}`}>
                            <Select id={`cs-m-${c.id}`} name="method" defaultValue="phone_call">
                              {CONSENT_METHODS.map((m) => (
                                <option key={m.value} value={m.value}>
                                  {m.label}
                                </option>
                              ))}
                            </Select>
                          </Field>
                          <Field label="Note" htmlFor={`cs-n-${c.id}`} optional>
                            <Input id={`cs-n-${c.id}`} name="note" maxLength={500} />
                          </Field>
                          <fieldset className="sm:col-span-2">
                            <legend className="text-small font-semibold">The employer may contact them by</legend>
                            <div className="grid sm:grid-cols-3">
                              {SHARE_METHODS.map((m) => (
                                <Checkbox key={m.key} id={`cs-${m.key}-${c.id}`} name={m.key} label={m.label} />
                              ))}
                            </div>
                          </fieldset>
                        </ActionForm>
                      )}
                      {live && <WithdrawConsent candidateId={c.id} introduced={Boolean(c.introduced_at)} />}
                      {c.introduced_at && !c.consent_withdrawn_at && ['introduced', 'interviewed'].includes(c.status) && (
                        <>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            {c.status === 'introduced' && <RunButton label="Interviewed" fn={setCandidateOutcomeAction.bind(null, c.id, 'interviewed')} />}
                            <RunButton label="Not hired" fn={setCandidateOutcomeAction.bind(null, c.id, 'not_hired')} variant="ghost" />
                          </div>
                          <ActionForm action={recordPlacementAction.bind(null, c.id)} submitLabel="Record as hired" className="grid gap-2 rounded-md bg-green-tint p-3 sm:grid-cols-2">
                            <p className="text-small font-semibold sm:col-span-2">Hired through HagerLand</p>
                            <Field label="Role type" htmlFor={`pl-t-${c.id}`} hint={`Default guarantee: ${DEFAULT_GUARANTEE_DAYS.trade} days for trades, ${DEFAULT_GUARANTEE_DAYS.professional} for professionals.`}>
                              <Select id={`pl-t-${c.id}`} name="role_type" defaultValue="trade">
                                {ROLE_TYPES.map((r) => (
                                  <option key={r.value} value={r.value}>
                                    {r.label}
                                  </option>
                                ))}
                              </Select>
                            </Field>
                            <Field label="Start date" htmlFor={`pl-s-${c.id}`}>
                              <Input id={`pl-s-${c.id}`} name="start_date" type="date" />
                            </Field>
                            <Field label="Role" htmlFor={`pl-r-${c.id}`} optional>
                              <Input id={`pl-r-${c.id}`} name="role_text" maxLength={120} defaultValue={c.role_text ?? tradeLabel(c.trade) ?? ''} />
                            </Field>
                            <Field label="Guarantee (days)" htmlFor={`pl-g-${c.id}`} optional hint="Empty: the default for the role type.">
                              <Input id={`pl-g-${c.id}`} name="guarantee_days" inputMode="numeric" />
                            </Field>
                          </ActionForm>
                        </>
                      )}
                      <ActionForm action={saveCandidateNotesAction.bind(null, c.id)} submitLabel="Save notes" resetOnSuccess={false} className="grid gap-2">
                        <Field label="Private notes (never shown to the employer; deleted after 12 months)" htmlFor={`cn-${c.id}`} optional>
                          <Textarea id={`cn-${c.id}`} name="notes" rows={2} maxLength={1000} defaultValue={c.notes ?? ''} />
                        </Field>
                      </ActionForm>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      {!closed && (
        <Panel title="Introduce">
          <IntroduceSelector assignmentId={a.id} deskOn={switches.recruitmentDesk} people={ready.map((c) => ({ id: c.id, label: `${c.name ?? c.reference} · ${c.reference}` }))} />
        </Panel>
      )}

      <Panel title={`Placements (${places.length})`}>
        {places.length === 0 ? (
          <p className="text-small text-muted">No placements yet.</p>
        ) : (
          <ul className="space-y-4">
            {places.map((p) => {
              const c = byId.get(p.candidate_id)
              const replacedBy = places.find((x) => x.replaces_placement_id === p.id)
              const fee = feeViews.get(p.id)
              return (
                <li key={p.id} className="rounded-md border border-border p-3" data-testid={`placement-${p.reference}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">
                      {c ? who(c) : ''} <span className="font-normal text-muted">· {p.reference}</span>
                    </p>
                    <span className="flex flex-wrap gap-2">
                      {p.is_free_replacement && <Badge tone="green">Free replacement</Badge>}
                      <Badge tone="info">{PLACEMENT_STATUS_LABEL[p.status] ?? p.status}</Badge>
                    </span>
                  </div>
                  <p className="mt-1 text-small">
                    {p.role_text ?? tradeLabel(p.trade)} · {p.role_type === 'professional' ? 'Professional' : 'Trade'} · starts {formatDate(p.start_date)} · guarantee {p.guarantee_days} days, ends {formatDate(p.guarantee_ends_on)}
                    {p.ended_on ? ` · last day ${formatDate(p.ended_on)}` : ''}
                    {p.replaces_placement_id ? ` · replaces ${places.find((x) => x.id === p.replaces_placement_id)?.reference ?? ''}` : ''}
                    {replacedBy ? ` · replaced by ${replacedBy.reference}` : ''}
                  </p>
                  {!p.is_free_replacement && <p className="mt-1 text-small">Fee agreed in writing: <strong>{agreed.get(p.id) ? 'Yes' : 'No'}</strong></p>}
                  <div className="mt-3 space-y-3 border-t border-border pt-3">
                    {['hired', 'guarantee_running', 'completed'].includes(p.status) && (
                      <ActionForm action={endPlacementAction.bind(null, p.id)} submitLabel="Record that they left" className="grid gap-2 sm:grid-cols-3">
                        <Field label="Last day" htmlFor={`pe-d-${p.id}`}>
                          <Input id={`pe-d-${p.id}`} name="ended_on" type="date" />
                        </Field>
                        <Field label="Why" htmlFor={`pe-r-${p.id}`}>
                          <Select id={`pe-r-${p.id}`} name="end_reason" defaultValue="">
                            <option value="">Choose</option>
                            {END_REASONS.filter((r) => r.value !== 'did_not_start').map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.label}
                              </option>
                            ))}
                          </Select>
                        </Field>
                        <Field label="Note" htmlFor={`pe-n-${p.id}`} optional>
                          <Input id={`pe-n-${p.id}`} name="end_note" maxLength={500} />
                        </Field>
                      </ActionForm>
                    )}
                    {p.status === 'replaced' && !replacedBy && (
                      <ActionForm action={addFreeReplacementAction.bind(null, p.id)} submitLabel="Replace (free)" className="grid gap-2 sm:grid-cols-3">
                        <Field label="Replacement (introduced person)" htmlFor={`pr-c-${p.id}`}>
                          <Select id={`pr-c-${p.id}`} name="candidate_id" defaultValue="">
                            <option value="">Choose</option>
                            {replaceable.map((x) => (
                              <option key={x.id} value={x.id}>
                                {x.name ?? x.reference} · {x.reference}
                              </option>
                            ))}
                          </Select>
                        </Field>
                        <Field label="Start date" htmlFor={`pr-s-${p.id}`}>
                          <Input id={`pr-s-${p.id}`} name="start_date" type="date" />
                        </Field>
                        <Field label="Guarantee (days)" htmlFor={`pr-g-${p.id}`} optional hint={`Empty: ${p.guarantee_days} days, the same as before.`}>
                          <Input id={`pr-g-${p.id}`} name="guarantee_days" inputMode="numeric" />
                        </Field>
                      </ActionForm>
                    )}
                    {['hired', 'guarantee_running'].includes(p.status) && !replacedBy && <CancelPlacement placementId={p.id} />}
                    {owner && !p.is_free_replacement && fee && <FeeTools placementId={p.id} terms={fee.terms} entries={fee.entries} totals={fee.totals} />}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      <Panel title="Timeline">
        {(events ?? []).length === 0 ? (
          <p className="text-small text-muted">Nothing yet.</p>
        ) : (
          <ul className="space-y-1 text-small">
            {(events ?? []).map((e) => (
              <li key={e.id} className="break-words [overflow-wrap:anywhere]">
                {formatDate(e.created_at)} {new Date(e.created_at).toLocaleTimeString('en-GB', { timeZone: 'Africa/Addis_Ababa', hour: '2-digit', minute: '2-digit' })} · {STEP_LABEL[e.step] ?? e.step}
                {e.candidate_id ? ` · ${byId.get(e.candidate_id)?.reference ?? ''}` : ''}
                {e.placement_id ? ` · ${places.find((p) => p.id === e.placement_id)?.reference ?? ''}` : ''}
                <span className="text-muted"> · {e.actor}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
