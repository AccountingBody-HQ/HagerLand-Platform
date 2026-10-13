import { notFound } from 'next/navigation'
import { getActiveMembership, requireUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { getLocationById } from '@/lib/data/reference'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { PortfolioForm } from '@/components/account/PortfolioForm'
import { MediaManager } from '@/components/media/MediaManager'
import { Card } from '@/components/ui/Layout'
import { Badge } from '@/components/ui/Badge'
import { FormAlert } from '@/components/forms/FormParts'
import { LISTING_STATUS_LABELS } from '@/lib/labels'
import type { MediaItem } from '@/lib/media-actions'

export const metadata = { title: 'Edit project' }

export default async function PortfolioEditPage({ params, searchParams }: { params: { id: string }; searchParams: { created?: string } }) {
  await requireUser(`/account/company/portfolio/${params.id}`)
  const active = await getActiveMembership()
  const supabase = getServerSupabase()
  const { data: p } = await supabase.from('portfolio_projects').select('*').eq('id', params.id).maybeSingle()
  if (!p || p.org_id !== active?.org.id) notFound()
  const { data: media } = await supabase.from('media').select('id, kind, storage_path, thumb_path, width, height, alt, sort, is_cover, status').eq('entity_type', 'portfolio').eq('entity_id', p.id).order('sort')
  const loc = await getLocationById(p.location_id)
  const s = LISTING_STATUS_LABELS[p.status]
  return (
    <div className="space-y-6">
      <AccountPageHeader title={p.title} description={<Badge tone={s.tone}>{s.label}</Badge>} />
      {searchParams.created && <FormAlert tone="success">Project created. Add photos, then submit it for review.</FormAlert>}
      {p.status === 'rejected' && p.rejection_reason && <FormAlert>{p.rejection_reason}</FormAlert>}
      <Card className="p-5 sm:p-6">
        <h2 className="hl-h3 mb-4">Photos</h2>
        <MediaManager entityType="portfolio" entityId={p.id} initial={(media ?? []) as MediaItem[]} label="Add project photos" />
      </Card>
      <Card className="p-5 sm:p-6">
        <PortfolioForm status={p.status} defaults={{ id: p.id, title: p.title, description: p.description, location: loc ? { value: loc.id, label: loc.name, description: loc.display_name } : null, year: p.year, project_value_band: p.project_value_band }} />
      </Card>
    </div>
  )
}
