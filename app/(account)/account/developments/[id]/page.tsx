import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { loadOwnerDevelopment } from '@/lib/data/owner-dev'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { DevelopmentForm } from '@/components/account/DevelopmentForm'
import { MediaManager } from '@/components/media/MediaManager'
import { Card } from '@/components/ui/Layout'
import { Badge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { FormAlert } from '@/components/forms/FormParts'
import { LISTING_STATUS_LABELS } from '@/lib/labels'
import type { MediaItem } from '@/lib/media-actions'
import { formatDate } from '@/lib/format'
import { UpdateForm } from '@/components/development/UpdateForm'
import { postDevelopmentUpdateAction } from '../actions'

export const metadata = { title: 'Edit development' }

export default async function EditDevelopmentPage(
  props: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }
) {
  const searchParams = await props.searchParams
  const params = await props.params
  await requireUser(`/account/developments/${params.id}`)
  const loaded = await loadOwnerDevelopment(params.id)
  if (!loaded) notFound()
  const { row, defaults } = loaded
  const [{ data: media }, { data: updates }] = await Promise.all([
    getServerSupabase().from('media').select('id, kind, storage_path, thumb_path, width, height, alt, sort, is_cover, status').eq('entity_type', 'development').eq('entity_id', row.id).order('sort'),
    getServerSupabase().from('development_updates').select('id, title, happened_on, status, rejection_reason').eq('development_id', row.id).order('happened_on', { ascending: false }),
  ])
  const s = LISTING_STATUS_LABELS[row.status]
  return (
    <div className="space-y-6">
      <AccountPageHeader
        title={row.name}
        description={<Badge tone={s.tone}>{s.label}</Badge>}
        action={row.status === 'published' ? <ButtonLink href={`/developments/${row.slug}`} variant="secondary">View public page</ButtonLink> : undefined}
      />
      {searchParams.created && <FormAlert tone="success">Saved as a draft. Add photos, then submit it for review.</FormAlert>}
      {row.status === 'rejected' && row.rejection_reason && <FormAlert>{row.rejection_reason}</FormAlert>}
      <Card className="space-y-6 p-5 sm:p-6">
        <div>
          <h2 className="hl-h3 mb-3">Photos</h2>
          <MediaManager entityType="development" entityId={row.id} initial={(media ?? []) as MediaItem[]} />
        </div>
        <div>
          <h2 className="hl-h3 mb-3">Floor plans</h2>
          <MediaManager entityType="development" entityId={row.id} kind="floorplan" initial={(media ?? []) as MediaItem[]} label="Add floor plans" />
        </div>
      </Card>
      <Card className="p-5 sm:p-8">
        <DevelopmentForm defaults={{ ...defaults, id: row.id, status: row.status, updated_at: row.updated_at }} />
      </Card>
      <Card className="space-y-5 p-5 sm:p-8">
        <div>
          <h2 className="hl-h3">Construction progress</h2>
          <p className="mt-1 text-small text-muted">Post dated updates with photos. They appear on the development page once HagerLand has reviewed them.</p>
        </div>
        {updates && updates.length > 0 && (
          <ul className="divide-y divide-border rounded-md border border-border">
            {updates.map((u) => {
              const us = LISTING_STATUS_LABELS[u.status]
              return (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div>
                    <p className="font-semibold">{u.title}</p>
                    <p className="text-small text-muted">{formatDate(u.happened_on)}</p>
                    {u.status === 'rejected' && u.rejection_reason && <p className="text-small text-error">{u.rejection_reason}</p>}
                  </div>
                  <Badge tone={us.tone}>{us.label}</Badge>
                </li>
              )
            })}
          </ul>
        )}
        <UpdateForm developmentId={row.id} action={postDevelopmentUpdateAction} note="HagerLand reviews each update before it is published." />
      </Card>
      <FormAlert tone="info">To list individual units for sale or rent, create a listing and choose this development in the Location step.</FormAlert>
    </div>
  )
}
