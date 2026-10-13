import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { auditFor, developerOptions, notesFor } from '@/lib/admin/options'
import { getLocationById } from '@/lib/data/reference'
import { parseUnitTypes } from '@/lib/data/developments'
import { formatDate } from '@/lib/format'
import { saveAdminDevelopmentAction } from '../../actions/developments'
import { AdminHeader, Panel, StatusBadge } from '@/components/admin/AdminUi'
import { DevelopmentForm } from '@/components/account/DevelopmentForm'
import { ModerationControls } from '@/components/admin/ModerationControls'
import { FeatureTool, NotesTool, StatusTool } from '@/components/admin/RecordTools'
import { ChangesDiff } from '@/components/admin/ChangesDiff'
import { AuditTrail } from '@/components/admin/AuditTrail'
import { MediaManager } from '@/components/media/MediaManager'
import { FormAlert } from '@/components/forms/FormParts'
import type { MediaItem } from '@/lib/media-actions'

export const metadata = { title: 'Development' }

export default async function AdminDevelopmentPage({ params, searchParams }: { params: { id: string }; searchParams: { created?: string } }) {
  requireAdminPage()
  const db = getAdminSupabase()
  const { data: d } = await db.from('developments').select('*').eq('id', params.id).maybeSingle()
  if (!d) notFound()
  const [{ data: media }, devs, notes, trail, loc, units] = await Promise.all([
    db.from('media').select('id, kind, storage_path, thumb_path, width, height, alt, sort, is_cover, status').eq('entity_type', 'development').eq('entity_id', d.id).order('sort'),
    developerOptions(),
    notesFor('development', d.id),
    auditFor(d.id),
    getLocationById(d.location_id),
    db.from('properties').select('id, title, status').eq('development_id', d.id).limit(50),
  ])
  return (
    <div className="space-y-5">
      <AdminHeader
        title={d.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={d.status} /> {d.is_hagerland ? 'HagerLand Developments · ' : ''}updated {formatDate(d.updated_at)}
          </span>
        }
        actions={
          d.status === 'published' ? (
            <Link href={d.is_hagerland ? `/our-developments/${d.slug}` : `/developments/${d.slug}`} target="_blank" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border-strong bg-white px-3 text-small font-semibold">
              View live <ExternalLink className="size-4" aria-hidden />
            </Link>
          ) : undefined
        }
      />
      {searchParams.created && <FormAlert tone="success">Draft created. Add photos, then set the status to published.</FormAlert>}
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-5">
          {d.status === 'pending_review' && (
            <Panel title="Waiting for review">
              <ModerationControls entity="development" id={d.id} size="md" />
            </Panel>
          )}
          {d.pending_changes && (
            <Panel title="Proposed changes">
              <ChangesDiff live={d as Record<string, unknown>} changes={d.pending_changes as Record<string, unknown>} />
              <div className="mt-3">
                <ModerationControls entity="development" id={d.id} mode="changes" />
              </div>
            </Panel>
          )}
          <Panel title="Photos and plans">
            <MediaManager entityType="development" entityId={d.id} initial={(media ?? []) as MediaItem[]} />
            <div className="mt-6">
              <MediaManager entityType="development" entityId={d.id} kind="floorplan" initial={(media ?? []) as MediaItem[]} label="Add plans" />
            </div>
          </Panel>
          <Panel title="Details">
            <DevelopmentForm
              action={saveAdminDevelopmentAction}
              developerOptions={devs}
              currentDeveloper={d.developer_org_id}
              defaults={{ ...d, id: d.id, status: d.status, location: loc ? { value: loc.id, label: loc.name, description: loc.display_name } : null, unit_types: parseUnitTypes(d.unit_types) }}
            />
          </Panel>
        </div>
        <aside className="space-y-5">
          <Panel title="Status">
            <StatusTool entity="development" id={d.id} status={d.status} />
            {d.status === 'published' && (
              <div className="mt-3">
                <ModerationControls entity="development" id={d.id} mode="live" />
              </div>
            )}
          </Panel>
          <Panel title="Featured">
            <FeatureTool entity="development" id={d.id} featuredUntil={d.featured_until} />
          </Panel>
          <Panel title={`Linked listings (${units.data?.length ?? 0})`}>
            <ul className="space-y-1 text-small">
              {(units.data ?? []).map((u) => (
                <li key={u.id} className="flex justify-between gap-2">
                  <Link href={`/roodber8/properties/${u.id}`} className="text-green underline">
                    {u.title}
                  </Link>
                  <StatusBadge status={u.status} />
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Internal notes">
            <NotesTool entity="development" id={d.id} notes={notes} />
          </Panel>
          <Panel title="Audit trail">
            <AuditTrail entries={trail} />
          </Panel>
        </aside>
      </div>
    </div>
  )
}
