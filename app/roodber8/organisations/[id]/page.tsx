import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink, FileText } from 'lucide-react'
import { isOwnerSession, requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { auditFor, notesFor } from '@/lib/admin/options'
import { getLocations, getProductCategories, getServiceCategories } from '@/lib/data/reference'
import { signedDocumentUrl } from '@/lib/storage'
import { formatDate } from '@/lib/format'
import { ORG_KIND_LABEL } from '@/lib/org-labels'
import { saveAdminOrgAction } from '../../actions/organisations'
import { AdminHeader, Panel, StatusBadge } from '@/components/admin/AdminUi'
import { OrganisationForm } from '@/components/account/OrganisationForm'
import { ModerationControls } from '@/components/admin/ModerationControls'
import { FeatureTool, NotesTool, StatusTool } from '@/components/admin/RecordTools'
import { ChangesDiff } from '@/components/admin/ChangesDiff'
import { AuditTrail } from '@/components/admin/AuditTrail'
import { MembersTool, MergeTool, OrgAdminFields, VisibilityBanner } from '@/components/admin/OrgTools'
import { SingleImageUpload } from '@/components/media/SingleImageUpload'
import { FormAlert } from '@/components/forms/FormParts'
import { SupplyPartnerPanel } from '@/components/admin/SupplyPartnerPanel'
import { ScrollToSection } from '@/components/admin/ScrollToSection'
import { findPossibleDuplicates, getSupplyPartner } from '@/lib/supply/data'
import { offerCounts } from '@/lib/supply/offers-data'
import { partnerAgreements } from '@/lib/supply/agreements-data'
import { AgreementsPanel } from '@/components/admin/SupplyAgreements'
import { partnerPerformanceRows } from '@/lib/supply/insights-data'
import { organisationActivity } from '@/lib/supply/activity-data'
import { PerformanceSummary } from '@/components/admin/PartnerPerformance'
import { ActivityList } from '@/components/admin/OrganisationActivity'
import { GoogleDataPanel } from '@/components/admin/GoogleDataPanel'
import { getAdminSession } from '@/lib/admin-auth'
import { orgFieldSources } from '@/lib/imports/compliance-data'
import { compliance, deadlineText, FIELD_LABEL, SOURCE_LABEL, STATE_LABEL, WARN_DAYS } from '@/lib/imports/compliance'
import { todayInAddis } from '@/lib/supply/shortlist'
import { ActionForm } from '@/components/forms/ActionForm'
import { Field, Input, Select } from '@/components/ui/Field'
import { RevokeBadge } from '@/components/admin/VerificationTools'
import { recordVerificationCheckAction } from '@/app/roodber8/actions/verification'
import { CHECK_METHODS, RECORD_STATUS_LABEL, recordEndsOn } from '@/lib/verification'

export const metadata = { title: 'Organisation' }

export default async function AdminOrgPage(
  props: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string; supply?: string; focus?: string }> }
) {
  const searchParams = await props.searchParams
  const params = await props.params
  await requireAdminPage()
  const db = getAdminSupabase()
  const { data: o } = await db.from('organisations').select('*').eq('id', params.id).maybeSingle()
  if (!o) notFound()
  const [{ data: members }, { data: svc }, { data: cats }, { data: requests }, { data: candidates }, services, products, locations, notes, trail] = await Promise.all([
    db.from('organisation_members').select('user_id, role').eq('org_id', o.id),
    db.from('organisation_services').select('service_id').eq('org_id', o.id),
    db.from('org_product_categories').select('product_category_id').eq('org_id', o.id),
    db.from('verification_requests').select('id, status, documents, created_at, decided_at').eq('org_id', o.id).order('created_at', { ascending: false }),
    db.from('organisations').select('id, name, kind').eq('kind', o.kind).neq('id', o.id).neq('status', 'archived').order('name').limit(500),
    getServiceCategories(),
    getProductCategories(),
    getLocations(),
    notesFor('organisation', o.id),
    auditFor(o.id),
  ])
  const [supply, prices, owner] = await Promise.all([getSupplyPartner(o.id), offerCounts([o.id]), isOwnerSession()])
  // Jobs Phase 4: the recorded checks behind the Verified badge (newest first).
  const { data: checks } = await db.from('employer_verifications').select('id, status, licence_number, licence_expires_on, licence_check_method, licence_checked_at, tin_checked_at, phone_checked_at, phone_check_note, site_visit_at, verified_by, verified_at, valid_until, needs_recheck_since, revoked_at, revoked_by, revoked_reason').eq('organisation_id', o.id).order('created_at', { ascending: false })
  const liveCheck = (checks ?? []).find((c) => ['active', 'needs_recheck'].includes(c.status)) ?? null
  const legacyBadge = o.verification_level === 'verified' && (checks ?? []).length === 0
  // Agreements are owner only: never loaded for staff (blueprint 13.3).
  const agreements = owner && supply.partner ? await partnerAgreements(o.id) : []
  // Imports compliance: where each detail came from, for businesses imported from Google.
  const imported = o.source === 'import' || Boolean(o.google_place_id)
  const googleRows = imported ? await orgFieldSources(o.id) : []
  const today = todayInAddis()
  const gc = imported ? compliance({ id: o.id, status: o.status, claimed: Boolean(o.claimed_at), sources: googleRows }, today) : null
  const session = imported ? await getAdminSession() : null
  const [performance, activity] = await Promise.all([supply.partner ? partnerPerformanceRows({ orgIds: [o.id], owner }).then((r) => r[0] ?? null) : Promise.resolve(null), organisationActivity(o.id)])
  const duplicates = supply.partner ? [] : await findPossibleDuplicates(o)
  const { data: memberProfiles } = await db.from('profiles').select('id, full_name').in('id', (members ?? []).map((m) => m.user_id))
  const memberEmails = await Promise.all(
    (members ?? []).map(async (m) => ({
      user_id: m.user_id,
      role: m.role,
      label: `${memberProfiles?.find((p) => p.id === m.user_id)?.full_name ?? 'Unnamed'} · ${(await db.auth.admin.getUserById(m.user_id)).data.user?.email ?? ''}`,
    })),
  )
  const docs = await Promise.all(
    (requests ?? []).map(async (r) => ({ ...r, links: await Promise.all(Object.entries((r.documents as Record<string, string>) ?? {}).map(async ([k, p]) => ({ label: k.replace(/_/g, ' '), url: await signedDocumentUrl(p) }))) })),
  )
  const v = { ...o, ...((o.pending_changes as Record<string, unknown> | null) ?? {}) } as typeof o
  const loc = locations.find((l) => l.id === v.location_id)
  const isHl = o.kind === 'hagerland'

  return (
    <div className="space-y-5">
      <AdminHeader
        title={o.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={o.status} /> <StatusBadge status={o.verification_level} /> {ORG_KIND_LABEL[o.kind]} · {o.source} · updated {formatDate(o.updated_at)}
          </span>
        }
        actions={
          o.status === 'published' ? (
            <Link href={`/company/${o.slug}`} target="_blank" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border-strong bg-white px-3 text-small font-semibold">
              View live <ExternalLink className="size-4" aria-hidden />
            </Link>
          ) : undefined
        }
      />
      {searchParams.created && <FormAlert tone="success">{o.status === 'published' ? 'Organisation created and published.' : 'Organisation created. It is private until you publish it.'}</FormAlert>}
      {searchParams.supply === 'failed' && <FormAlert>The organisation was created, but its supply partner record was not. Click “Create supply partner record” in the Supply partner panel below.</FormAlert>}
      {searchParams.focus === 'supply-partner' && <ScrollToSection id="supply-partner" />}
      <VisibilityBanner orgId={o.id} status={o.status} version={o.updated_at} isHagerland={isHl || o.is_hagerland} />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-5">
          {o.status === 'pending_review' && (
            <Panel title="Waiting for review">
              <ModerationControls entity="organisation" id={o.id} size="md" />
            </Panel>
          )}
          {o.pending_changes && (
            <Panel title="Proposed changes (editing below applies them)">
              <ChangesDiff live={o as Record<string, unknown>} changes={o.pending_changes as Record<string, unknown>} />
              <div className="mt-3">
                <ModerationControls entity="organisation" id={o.id} mode="changes" />
              </div>
            </Panel>
          )}
          {gc && (
            <div id="google-data" className="scroll-mt-24">
              <Panel title="Google data">
                <GoogleDataPanel
                  orgId={o.id}
                  placeId={o.google_place_id}
                  version={o.updated_at}
                  stateLabel={STATE_LABEL[gc.state]}
                  deadline={deadlineText(gc.daysLeft)}
                  urgent={gc.daysLeft !== null && gc.daysLeft <= WARN_DAYS}
                  fetchedOn={googleRows.filter((r) => r.source === 'google_places' && r.fetchedAt).map((r) => r.fetchedAt as string).sort()[0] ?? null}
                  fields={googleRows.map((r) => ({ field: r.field, label: FIELD_LABEL[r.field], source: r.source, sourceLabel: SOURCE_LABEL[r.source], date: r.source === 'google_places' ? r.fetchedAt : r.confirmedAt, cleared: r.clearedAt, by: r.confirmedBy }))}
                  publishBlock={o.status === 'published' ? null : gc.publishBlock}
                  ownerDecision={owner && gc.googleFields.length > 0 && (gc.isPublic || Boolean(o.claimed_at))}
                  defaultConfirmedBy={session?.kind === 'staff' ? session.name : 'AB'}
                  today={today}
                />
              </Panel>
            </div>
          )}
          <Panel title="Logo and cover">
            <div className="grid gap-6 sm:grid-cols-[180px_1fr]">
              <SingleImageUpload entityType="organisation" entityId={o.id} kind="logo" currentPath={o.logo_path} label="Logo" aspect="aspect-square w-32" />
              <SingleImageUpload entityType="organisation" entityId={o.id} kind="cover" currentPath={o.cover_path} label="Cover image" aspect="aspect-[3/1]" />
            </div>
          </Panel>
          <Panel title="Profile">
            <OrganisationForm
              action={saveAdminOrgAction}
              kinds={isHl ? ['hagerland'] : [o.kind]}
              services={services.map((g) => ({ id: g.id, name: g.name, children: g.children }))}
              productCategories={products.map((c) => ({ id: c.id, name: c.name, children: [] }))}
              defaults={{
                ...v,
                id: o.id,
                version: o.updated_at,
                location: loc ? { value: loc.id, label: loc.name, description: loc.display_name } : null,
                areas: (v.areas_served ?? []).map((id) => locations.find((l) => l.id === id)).filter((l): l is NonNullable<typeof l> => Boolean(l)).map((l) => ({ value: l.id, label: l.name })),
                service_ids: (svc ?? []).map((s) => s.service_id),
                product_category_ids: (cats ?? []).map((c) => c.product_category_id),
              }}
              submitLabel="Save changes"
            />
          </Panel>
          <div id="supply-partner" className="scroll-mt-24">
          <Panel title="Supply partner">
            <SupplyPartnerPanel orgId={o.id} partner={supply.partner} contacts={supply.contacts} evidence={supply.evidence} duplicates={duplicates} prices={prices.get(o.id) ?? { current: 0, expiringSoon: 0, expired: 0 }} />
          </Panel>
          </div>
          {performance && (
            <div id="supply-performance" className="scroll-mt-24">
              <Panel title="Supply performance">
                <PerformanceSummary row={performance} />
              </Panel>
            </div>
          )}
          <Panel title="Jobs, projects and supply activity">
            <ActivityList activity={activity} />
          </Panel>
          {owner && supply.partner && (
            <Panel title="Agreement">
              <AgreementsPanel orgId={o.id} agreements={agreements} />
            </Panel>
          )}
          <Panel title="Verification documents">
            {docs.length === 0 ? (
              <p className="text-small text-muted">No documents submitted.</p>
            ) : (
              <ul className="space-y-3">
                {docs.map((r) => (
                  <li key={r.id} className="text-small">
                    <p>
                      <StatusBadge status={r.status} /> Sent {formatDate(r.created_at)}
                      {r.decided_at ? ` · decided ${formatDate(r.decided_at)}` : ''}
                    </p>
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {r.links.map((l) => (
                        <li key={l.label}>
                          {l.url ? (
                            <a href={l.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border-strong px-3 font-semibold">
                              <FileText className="size-4" aria-hidden /> {l.label}
                            </a>
                          ) : (
                            <span className="text-muted">{l.label} (deleted)</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Verified badge">
            <p className="text-small">
              {o.verification_level !== 'verified'
                ? 'Not verified.'
                : legacyBadge
                  ? 'Verified before the recorded check existed (legacy badge). Record a check to move it to the new standard.'
                  : liveCheck
                    ? `Verified until ${formatDate(liveCheck.status === 'needs_recheck' && liveCheck.needs_recheck_since ? recordEndsOn(liveCheck) : liveCheck.valid_until)}${liveCheck.status === 'needs_recheck' ? ' — needs re-check: the name or licence number changed. Record a new check, or the badge ends on that date.' : '.'}`
                    : 'Verified.'}
            </p>
            {(checks ?? []).length > 0 && (
              <ul className="mt-3 space-y-2 text-small">
                {(checks ?? []).map((c) => (
                  <li key={c.id} className="rounded-md border border-border p-2 [overflow-wrap:anywhere]">
                    <strong>{RECORD_STATUS_LABEL[c.status] ?? c.status}</strong> · checked {formatDate(c.verified_at)} by {c.verified_by} · valid until {formatDate(c.valid_until)}
                    <br />
                    Licence {c.licence_number} ({CHECK_METHODS.find((m) => m.value === c.licence_check_method)?.label.toLowerCase()}, {formatDate(c.licence_checked_at)}
                    {c.licence_expires_on ? `, expires ${formatDate(c.licence_expires_on)}` : ''}) · TIN {formatDate(c.tin_checked_at)} · phone {formatDate(c.phone_checked_at)}
                    {c.site_visit_at ? ` · site visit ${formatDate(c.site_visit_at)}` : ''}
                    {c.phone_check_note ? ` · “${c.phone_check_note}”` : ''}
                    {c.revoked_reason ? ` · revoked by ${c.revoked_by}: “${c.revoked_reason}”` : ''}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 border-t border-border pt-4">
              <p className="mb-2 text-small font-semibold">Record verification check</p>
              <ActionForm action={recordVerificationCheckAction.bind(null, o.id)} submitLabel="Record check and give the badge">
                <Field label="Trade licence number" htmlFor="vc-lic">
                  <Input id="vc-lic" name="licence_number" maxLength={80} defaultValue={o.trade_licence_number ?? ''} />
                </Field>
                <Field label="Licence expires on" htmlFor="vc-exp" optional hint="The badge never lasts past this date.">
                  <Input id="vc-exp" name="licence_expires_on" type="date" />
                </Field>
                <Field label="Licence checked on" htmlFor="vc-lc">
                  <Input id="vc-lc" name="licence_checked_on" type="date" />
                </Field>
                <Field label="How the licence was checked" htmlFor="vc-lm" hint="The online register is optional: use it if it works.">
                  <Select id="vc-lm" name="licence_check_method" defaultValue="document">
                    {CHECK_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Tax number (TIN) checked on" htmlFor="vc-tin">
                  <Input id="vc-tin" name="tin_checked_on" type="date" />
                </Field>
                <Field label="Phoned the business on" htmlFor="vc-ph" hint="On a number found independently (licence, a known contact), not only the one they typed.">
                  <Input id="vc-ph" name="phone_checked_on" type="date" />
                </Field>
                <Field label="Phone call note" htmlFor="vc-pn" optional>
                  <Input id="vc-pn" name="phone_check_note" maxLength={500} />
                </Field>
                <Field label="Site visit on" htmlFor="vc-sv" optional>
                  <Input id="vc-sv" name="site_visit_on" type="date" />
                </Field>
              </ActionForm>
            </div>
            {o.verification_level === 'verified' && (
              <div className="mt-4 border-t border-border pt-4">
                <RevokeBadge orgId={o.id} />
              </div>
            )}
          </Panel>
        </div>
        <aside className="space-y-5">
          <Panel title="Status">
            <StatusTool entity="organisation" id={o.id} status={o.status} />
            {o.status === 'published' && !isHl && (
              <div className="mt-3">
                <ModerationControls entity="organisation" id={o.id} mode="live" />
              </div>
            )}
          </Panel>
          <Panel title="HagerLand-only fields">
            <OrgAdminFields orgId={o.id} initial={{ verification_level: o.verification_level, trade_licence_number: o.trade_licence_number ?? '', tin: o.tin ?? '', plan: o.plan }} />
          </Panel>
          <Panel title="Featured">
            <FeatureTool entity="organisation" id={o.id} featuredUntil={o.featured_until} />
          </Panel>
          <Panel title="Members">
            <MembersTool orgId={o.id} members={memberEmails} />
          </Panel>
          {!isHl && (
            <Panel title="Merge duplicate">
              <MergeTool orgId={o.id} candidates={(candidates ?? []).map((c) => ({ id: c.id, label: c.name }))} />
            </Panel>
          )}
          <Panel title="Internal notes">
            <NotesTool entity="organisation" id={o.id} notes={notes} />
          </Panel>
          <Panel title="Audit trail">
            <AuditTrail entries={trail} />
          </Panel>
        </aside>
      </div>
    </div>
  )
}
