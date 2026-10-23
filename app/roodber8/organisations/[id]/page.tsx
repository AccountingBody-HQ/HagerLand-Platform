import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink, FileText } from 'lucide-react'
import { requireAdminPage } from '@/lib/admin/guard'
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
import { MembersTool, MergeTool, OrgAdminFields } from '@/components/admin/OrgTools'
import { SingleImageUpload } from '@/components/media/SingleImageUpload'
import { FormAlert } from '@/components/forms/FormParts'
import { SupplyPartnerPanel } from '@/components/admin/SupplyPartnerPanel'
import { findPossibleDuplicates, getSupplyPartner } from '@/lib/supply/data'

export const metadata = { title: 'Organisation' }

export default async function AdminOrgPage(
  props: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }
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
  const supply = await getSupplyPartner(o.id)
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
      {searchParams.created && <FormAlert tone="success">Organisation created and published.</FormAlert>}
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
          <Panel title="Supply partner">
            <SupplyPartnerPanel orgId={o.id} partner={supply.partner} contacts={supply.contacts} evidence={supply.evidence} duplicates={duplicates} />
          </Panel>
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
