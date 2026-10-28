import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { auditFor, developmentOptions, listerOptions, notesFor } from '@/lib/admin/options'
import { getLocationById } from '@/lib/data/reference'
import { formatDate, formatPhone } from '@/lib/format'
import { AdminHeader, KeyValue, Panel, StatusBadge } from '@/components/admin/AdminUi'
import { AdminPropertyForm } from '@/components/admin/AdminPropertyForm'
import { ModerationControls } from '@/components/admin/ModerationControls'
import { FeatureTool, NotesTool, StatusTool } from '@/components/admin/RecordTools'
import { ChangesDiff } from '@/components/admin/ChangesDiff'
import { AuditTrail } from '@/components/admin/AuditTrail'
import { MediaManager } from '@/components/media/MediaManager'
import { FormAlert } from '@/components/forms/FormParts'
import type { MediaItem } from '@/lib/media-actions'
import { must } from '@/lib/admin/must'

export const metadata = { title: 'Listing' }

export default async function AdminPropertyPage(
  props: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }
) {
  const searchParams = await props.searchParams
  const params = await props.params
  await requireAdminPage()
  const db = getAdminSupabase()
  const { data: p } = must(await db.from('properties').select('*').eq('id', params.id).maybeSingle())
  if (!p) notFound()
  const [{ data: media }, listers, developments, notes, trail, loc, org, person, enquiries] = must(await Promise.all([
    db.from('media').select('id, kind, storage_path, thumb_path, width, height, alt, sort, is_cover, status').eq('entity_type', 'property').eq('entity_id', p.id).order('sort'),
    listerOptions(),
    developmentOptions(),
    notesFor('property', p.id),
    auditFor(p.id),
    getLocationById(p.location_id),
    p.lister_org_id ? db.from('organisations').select('id, name').eq('id', p.lister_org_id).maybeSingle() : Promise.resolve({ data: null }),
    p.lister_user_id ? db.from('profiles').select('id, full_name, phone').eq('id', p.lister_user_id).maybeSingle() : Promise.resolve({ data: null }),
    db.from('enquiries').select('id', { count: 'exact', head: true }).eq('target_type', 'property').eq('target_id', p.id),
  ]))
  const values = { ...p, area_m2: p.area_m2 === null ? null : Number(p.area_m2), plot_area_m2: p.plot_area_m2 === null ? null : Number(p.plot_area_m2), location: loc ? { value: loc.id, label: loc.name, description: loc.display_name } : null }

  return (
    <div className="space-y-5">
      <AdminHeader
        title={p.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={p.status} /> Ref {p.short_id} · updated {formatDate(p.updated_at)}
          </span>
        }
        actions={
          p.status === 'published' ? (
            <Link href={`/property/${p.slug}`} target="_blank" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border-strong bg-white px-3 text-small font-semibold">
              View live <ExternalLink className="size-4" aria-hidden />
            </Link>
          ) : undefined
        }
      />
      {searchParams.created && <FormAlert tone="success">Draft created. Add photos below, then publish it with the status control.</FormAlert>}
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-5">
          {p.status === 'pending_review' && (
            <Panel title="Waiting for review">
              <ModerationControls entity="property" id={p.id} size="md" />
            </Panel>
          )}
          {p.pending_changes && (
            <Panel title="Proposed changes">
              <ChangesDiff live={p as Record<string, unknown>} changes={p.pending_changes as Record<string, unknown>} />
              <div className="mt-3">
                <ModerationControls entity="property" id={p.id} mode="changes" />
              </div>
            </Panel>
          )}
          <Panel title="Photos and floor plans">
            <MediaManager entityType="property" entityId={p.id} initial={(media ?? []) as MediaItem[]} />
            <div className="mt-6">
              <MediaManager entityType="property" entityId={p.id} kind="floorplan" initial={(media ?? []) as MediaItem[]} label="Add floor plans" />
            </div>
          </Panel>
          <AdminPropertyForm id={p.id} version={p.updated_at} values={values} listers={listers} developments={developments} currentLister={p.lister_org_id ?? 'keep'} />
        </div>
        <aside className="space-y-5">
          <Panel title="Lister">
            <KeyValue
              items={[
                ['Type', p.lister_type],
                ['Organisation', org.data ? <Link href={`/roodber8/organisations/${org.data.id}`} className="text-green underline">{org.data.name}</Link> : ''],
                ['Person', person.data ? <Link href={`/roodber8/users/${person.data.id}`} className="text-green underline">{person.data.full_name ?? 'Unnamed'}</Link> : ''],
                ['Contact phone', formatPhone(p.contact_phone)],
                ['Enquiries', String(enquiries.count ?? 0)],
                ['Views', String(p.views_count)],
                ['Published', p.published_at ? formatDate(p.published_at) : ''],
                ['Expires', p.expires_at ? formatDate(p.expires_at) : ''],
              ]}
            />
          </Panel>
          <Panel title="Status">
            <StatusTool entity="property" id={p.id} status={p.status} />
            {p.status === 'published' && (
              <div className="mt-3">
                <ModerationControls entity="property" id={p.id} mode="live" />
              </div>
            )}
            {p.rejection_reason && <p className="mt-3 text-small text-muted">Last reason given: {p.rejection_reason}</p>}
          </Panel>
          <Panel title="Featured">
            <FeatureTool entity="property" id={p.id} featuredUntil={p.featured_until} />
          </Panel>
          <Panel title="Internal notes">
            <NotesTool entity="property" id={p.id} notes={notes} />
          </Panel>
          <Panel title="Audit trail">
            <AuditTrail entries={trail} />
          </Panel>
        </aside>
      </div>
    </div>
  )
}
