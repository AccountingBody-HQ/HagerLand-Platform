import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { AdminHeader } from '@/components/admin/AdminUi'
import { TaxonomyEditor, type TreeNode } from '@/components/admin/TaxonomyEditor'

export const metadata = { title: 'Locations' }

export default async function LocationsPage() {
  requireAdminPage()
  const db = getAdminSupabase()
  const [{ data: locs }, { data: props }] = await Promise.all([
    db.from('locations').select('id, parent_id, name, name_am, slug, sort, is_active, level, display_name, seo_intro_sale, seo_intro_rent, seo_intro_professionals'),
    db.from('properties').select('location_id').eq('status', 'published'),
  ])
  const counts = new Map<string, number>()
  for (const p of props ?? []) counts.set(p.location_id, (counts.get(p.location_id) ?? 0) + 1)
  const nodes: TreeNode[] = (locs ?? []).map((l) => ({
    id: l.id,
    parent_id: l.parent_id,
    name: l.name,
    slug: l.slug,
    sort: l.sort,
    is_active: l.is_active,
    level: l.level,
    meta: [l.name_am, counts.get(l.id) ? `${counts.get(l.id)} live listings` : ''].filter(Boolean).join(' · ') || undefined,
    fields: { name_am: l.name_am, seo_intro_sale: l.seo_intro_sale, seo_intro_rent: l.seo_intro_rent, seo_intro_professionals: l.seo_intro_professionals },
  }))
  const all = (locs ?? []).filter((l) => l.is_active).map((l) => ({ id: l.id, label: l.display_name, level: l.level })).sort((a, b) => a.label.localeCompare(b.label))
  const parents = all.filter((l) => l.level !== 'area')
  return (
    <div className="max-w-5xl">
      <AdminHeader title="Locations" description="Regions, cities, sub-cities and areas. Add new areas, add Amharic names and page intros, switch places off, or merge duplicates." />
      <TaxonomyEditor mode={{ kind: 'location' }} nodes={nodes} parents={parents} mergeTargets={all} addTitle="Add a location" />
    </div>
  )
}
