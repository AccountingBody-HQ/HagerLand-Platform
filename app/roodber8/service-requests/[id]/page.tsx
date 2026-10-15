import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { signedDocumentUrl } from '@/lib/storage'
import { getLocationChain } from '@/lib/data/reference'
import { formatDate, formatMoney, formatPhone } from '@/lib/format'
import { countryName } from '@/lib/countries'
import { answerLines, parseQuestions } from '@/lib/service-requests/questions'
import { CLOSED_REASON_LABEL, MATCH_STATUS_LABEL, MAX_MATCHES, URGENCY_LABEL } from '@/lib/service-requests/labels'
import { ORG_KIND_LABEL } from '@/lib/org-labels'
import { AdminHeader, KeyValue, Panel, StatusBadge, filterInput } from '@/components/admin/AdminUi'
import { AuditTrail } from '@/components/admin/AuditTrail'
import { MatchBoard, MatchCommercialTool, NoProviderTool, RequestNotesTool, RequestStatusTool, WithdrawMatchTool, type Suggestion } from '@/components/admin/ServiceRequestTools'
import { Badge } from '@/components/ui/Badge'
import { RunButton } from '@/components/admin/AgencyTools'
import { ActionForm } from '@/components/forms/ActionForm'
import { Field, Input, Select } from '@/components/ui/Field'
import { assignHagerlandTeamAction, hagerlandQuoteAction } from '@/app/roodber8/actions/service-requests'
import { getPillar } from '@/lib/data/pillars'
import { VERTICAL_PILLAR } from '@/lib/pillars'
import { CURRENCIES } from '@/lib/countries'
import type { VerticalKey } from '@/lib/verticals'

export const metadata = { title: 'Service request' }

interface OrgHit {
  id: string
  name: string
  kind: string
  verification_level: string
  location_display: string | null
  serves_diaspora: boolean
}

export default async function ServiceRequestDetail(
  props: { params: Promise<{ id: string }>; searchParams: Promise<{ find?: string }> }
) {
  const searchParams = await props.searchParams
  const params = await props.params
  await requireAdminPage()
  if (!/^[0-9a-f-]{36}$/.test(params.id)) notFound()
  const db = getAdminSupabase()
  const { data: r } = await db.from('service_requests').select('*').eq('id', params.id).maybeSingle()
  if (!r) notFound()
  const [{ data: cat }, { data: matches }] = await Promise.all([
    r.service_category_id ? db.from('service_categories').select('name, question_schema').eq('id', r.service_category_id).maybeSingle() : Promise.resolve({ data: null }),
    db.from('service_request_matches').select('*').eq('request_id', r.id).order('offered_at'),
  ])
  const { data: history } = await db.from('audit_log').select('id, action, created_at, diff').eq('entity_id', r.id).order('created_at', { ascending: false }).limit(50)
  const orgIds = (matches ?? []).map((m) => m.org_id)
  const { data: orgs } = orgIds.length ? await db.from('organisations').select('id, name').in('id', orgIds) : { data: [] }
  const orgName = new Map((orgs ?? []).map((o) => [o.id, o.name]))
  // Direct mode (spec 26.8): HagerLand's own team can take the request when the pillar's Direct mode is on.
  const { data: team } = await db.from('organisations').select('id').eq('slug', 'hagerland-services').maybeSingle()
  const pillarKey = VERTICAL_PILLAR[r.vertical_key as VerticalKey]
  const directOn = Boolean(pillarKey && (await getPillar(pillarKey))?.direct)
  const active = (matches ?? []).filter((m) => !['declined', 'withdrawn'].includes(m.status))
  const slots = Math.max(0, MAX_MATCHES - active.length)
  const open = ['submitted', 'triaged', 'matched', 'quoted'].includes(r.status)

  // Suggestions: same service, nearest location first (the place, then each parent), verified first.
  const chain = r.location_id ? (await getLocationChain(r.location_id)).reverse() : []
  const found = new Map<string, OrgHit>()
  const search = async (args: Record<string, unknown>) => {
    const { data } = await db.rpc('search_organisations', { p_sort: 'verified', p_page_size: 12, ...args })
    for (const o of ((data as unknown as { items?: OrgHit[] })?.items ?? [])) if (!found.has(o.id) && !orgIds.includes(o.id)) found.set(o.id, o)
  }
  if (open && slots > 0) {
    if (searchParams.find) await search({ p_q: searchParams.find.slice(0, 80) })
    else {
      for (const loc of chain) {
        if (found.size >= 9) break
        await search({ p_service_id: r.service_category_id ?? undefined, p_location_id: loc.id })
      }
      if (found.size < 9) await search({ p_service_id: r.service_category_id ?? undefined, p_country_code: r.country_code })
    }
  }
  const suggestions: Suggestion[] = Array.from(found.values()).slice(0, 12).map((o) => ({
    id: o.id,
    name: o.name,
    meta: [ORG_KIND_LABEL[o.kind] ?? o.kind, o.verification_level, o.location_display, o.serves_diaspora ? 'serves the community abroad' : null].filter(Boolean).join(' · '),
  }))
  const files = await Promise.all((r.attachment_paths ?? []).map(async (p, i) => ({ name: `Attachment ${i + 1}`, url: await signedDocumentUrl(p) })))
  const answers = answerLines(parseQuestions(cat?.question_schema), (r.answers as Record<string, string>) ?? {})

  return (
    <div className="space-y-5">
      <AdminHeader
        title={r.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {r.reference} · received {formatDate(r.created_at)} <StatusBadge status={r.status} />
            {r.urgency === 'emergency' && <Badge tone="danger">Emergency</Badge>}
            {r.closed_reason && <span>{CLOSED_REASON_LABEL[r.closed_reason]}</span>}
          </span>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          <Panel title="Request">
            <KeyValue
              items={[
                ['Service', cat?.name],
                ['How soon', URGENCY_LABEL[r.urgency]],
                ['Budget', r.budget_band],
                ['Where', r.location_id ? chain.map((l) => l.name).reverse().join(', ') : r.location_text],
                ['Country', countryName(r.country_code)],
                ...answers,
              ]}
            />
            <p className="mt-4 whitespace-pre-line text-small">{r.details}</p>
            {files.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-3 text-small">
                {files.map((f) => (f.url ? <li key={f.name}><a href={f.url} className="font-semibold text-green underline">{f.name}</a></li> : null))}
              </ul>
            )}
          </Panel>
          <Panel title="Customer">
            <KeyValue items={[['Name', r.name], ['Phone', formatPhone(r.phone)], ['Email', r.email], ['Prefers', r.preferred_contact], ['Account', r.requester_user_id ? 'Signed in' : 'Guest (email link)']]} />
          </Panel>
          <Panel title={`Providers (${active.length} of ${MAX_MATCHES})`}>
            {(matches ?? []).length === 0 ? (
              <p className="text-small text-muted">Not sent to anyone yet.</p>
            ) : (
              <ul className="space-y-4">
                {(matches ?? []).map((m) => (
                  <li key={m.id} className="rounded-md border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link href={`/roodber8/organisations/${m.org_id}`} className="font-semibold hover:underline">
                        {orgName.get(m.org_id) ?? 'Business'}
                      </Link>
                      <span className="flex items-center gap-2">
                        <StatusBadge status={m.status} />
                        <span className="text-caption text-muted">{MATCH_STATUS_LABEL[m.status]}</span>
                        {['offered', 'accepted', 'quoted'].includes(m.status) && <WithdrawMatchTool matchId={m.id} />}
                      </span>
                    </div>
                    <p className="mt-1 text-caption text-muted">
                      Sent {formatDate(m.offered_at)}
                      {m.responded_at ? ` · answered ${formatDate(m.responded_at)}` : ''}
                      {m.declined_reason ? ` · “${m.declined_reason}”` : ''}
                    </p>
                    {m.quote_amount_minor !== null && (
                      <p className="mt-2 text-small">
                        Quote: <strong>{formatMoney(m.quote_amount_minor / 100, m.quote_currency ?? r.currency)}</strong>
                        {m.quote_valid_until ? ` · valid until ${formatDate(m.quote_valid_until)}` : ''}
                      </p>
                    )}
                    {team && m.org_id === team.id && ['accepted', 'quoted'].includes(m.status) && (
                      <div className="mt-3 border-t border-border pt-3">
                        <p className="mb-2 text-small font-semibold">HagerLand’s quote</p>
                        <ActionForm action={hagerlandQuoteAction.bind(null, m.id)} submitLabel="Send HagerLand’s quote" resetOnSuccess={false}>
                          <Field label="Amount" htmlFor={`hq-a-${m.id}`}>
                            <Input id={`hq-a-${m.id}`} name="amount" inputMode="decimal" defaultValue={m.quote_amount_minor !== null ? m.quote_amount_minor / 100 : ''} />
                          </Field>
                          <Field label="Currency" htmlFor={`hq-c-${m.id}`}>
                            <Select id={`hq-c-${m.id}`} name="currency" defaultValue={m.quote_currency ?? r.currency}>
                              {CURRENCIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </Select>
                          </Field>
                          <Field label="Valid until" htmlFor={`hq-v-${m.id}`} optional>
                            <Input id={`hq-v-${m.id}`} name="valid_until" type="date" defaultValue={m.quote_valid_until ?? ''} />
                          </Field>
                          <Field label="Message to the customer" htmlFor={`hq-m-${m.id}`} optional>
                            <Input id={`hq-m-${m.id}`} name="message" defaultValue={m.quote_message ?? ''} maxLength={2000} />
                          </Field>
                        </ActionForm>
                      </div>
                    )}
                    <div className="mt-3 border-t border-border pt-3">
                      <MatchCommercialTool
                        matchId={m.id}
                        currency={m.quote_currency ?? r.currency}
                        leadFee={m.lead_fee_minor !== null ? String(m.lead_fee_minor / 100) : ''}
                        rate={m.commission_rate !== null ? String(m.commission_rate) : ''}
                        commission={m.commission_minor !== null ? String(m.commission_minor / 100) : ''}
                        invoiced={m.invoiced}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {open && slots > 0 && directOn && team && !orgIds.includes(team.id) && (
            <Panel title="Provided by HagerLand">
              <p className="mb-3 text-small text-muted">HagerLand delivers this service directly. Assign it to HagerLand’s own team as well as, or instead of, the providers below.</p>
              <RunButton label="Assign HagerLand’s own team" fn={assignHagerlandTeamAction.bind(null, r.id)} variant="primary" />
            </Panel>
          )}
          {open && slots > 0 && (
            <Panel title="Send to providers">
              <form method="get" className="mb-4 flex flex-wrap items-end gap-2">
                <label className="flex flex-col gap-1 text-caption font-semibold text-muted">
                  Find a business by name
                  <input name="find" defaultValue={searchParams.find ?? ''} className={`${filterInput} h-10`} />
                </label>
                <button type="submit" className="h-10 rounded-md bg-ink px-4 text-small font-semibold text-white">
                  Search
                </button>
                {searchParams.find && (
                  <Link href={`/roodber8/service-requests/${r.id}`} className="inline-flex h-10 items-center px-2 text-small text-muted">
                    Back to suggestions
                  </Link>
                )}
              </form>
              <MatchBoard id={r.id} suggestions={suggestions} slots={slots} />
            </Panel>
          )}
        </div>
        <div className="space-y-5">
          <Panel title="Status">
            <RequestStatusTool id={r.id} status={r.status} />
            {open && (
              <div className="mt-4">
                <NoProviderTool id={r.id} />
              </div>
            )}
          </Panel>
          <Panel title="Notes">
            <RequestNotesTool id={r.id} notes={r.admin_notes} />
          </Panel>
          <Panel title="History">
            <AuditTrail entries={history ?? []} />
          </Panel>
        </div>
      </div>
    </div>
  )
}
