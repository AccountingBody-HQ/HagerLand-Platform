import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { AdminHeader, Panel } from '@/components/admin/AdminUi'
import { TaxonomyEditor, type TreeNode } from '@/components/admin/TaxonomyEditor'
import { AddCountryForm } from '@/components/admin/AddCountryForm'

export const metadata = { title: 'Locations' }

export default async function LocationsPage() {
  await requireAdminPage()
  const db = getAdminSupabase()
  const [{ data: locs }, { data: props }] = await Promise.all([
    db.from('locations').select('id, parent_id, name, name_am, slug, sort, is_active, level, display_name, country_code, seo_intro_sale, seo_intro_rent, seo_intro_professionals'),
    db.from('properties').select('location_id').eq('status', 'published'),
  ])
  const counts = new Map<string, number>()
  for (const p of props ?? []) counts.set(p.location_id, (counts.get(p.location_id) ?? 0) + 1)
  const toNode = (l: NonNullable<typeof locs>[number]): TreeNode => ({
    id: l.id,
    parent_id: l.parent_id,
    name: l.name,
    slug: l.slug,
    sort: l.sort,
    is_active: l.is_active,
    level: l.level,
    meta: [l.level === 'country' ? l.country_code : null, l.name_am, counts.get(l.id) ? `${counts.get(l.id)} live listings` : ''].filter(Boolean).join(' · ') || undefined,
    fields: { name_am: l.name_am, seo_intro_sale: l.seo_intro_sale, seo_intro_rent: l.seo_intro_rent, seo_intro_professionals: l.seo_intro_professionals },
  })
  const all = (locs ?? []).filter((l) => l.is_active).map((l) => ({ id: l.id, label: l.display_name, level: l.level, country: l.country_code })).sort((a, b) => a.label.localeCompare(b.label))
  const et = (locs ?? []).filter((l) => l.country_code === 'ET')
  const abroad = (locs ?? []).filter((l) => l.country_code !== 'ET')
  return (
    <div className="max-w-5xl space-y-10">
      <AdminHeader title="Locations" description="Ethiopia's regions, cities, sub-cities and areas, and the countries and cities abroad where HagerLand lists Ethiopian-serving businesses. Add places, add Amharic names and page intros, switch places off, or merge duplicates." />
      <section className="space-y-3">
        <h2 className="hl-h3">Ethiopia</h2>
        <p className="text-small text-muted">Property listings and developments can only be in Ethiopia.</p>
        <TaxonomyEditor
          mode={{ kind: 'location' }}
          nodes={et.map(toNode)}
          parents={all.filter((l) => l.country === 'ET' && l.level !== 'area')}
          mergeTargets={all.filter((l) => l.country === 'ET')}
          addTitle="Add a place in Ethiopia"
        />
      </section>
      <section className="space-y-3">
        <h2 className="hl-h3">Other countries</h2>
        <p className="text-small text-muted">Used by businesses that serve the Ethiopian community abroad, service requests and interest registrations.</p>
        <Panel title="Add a country">
          <AddCountryForm />
        </Panel>
        <TaxonomyEditor
          mode={{ kind: 'location' }}
          nodes={abroad.map(toNode)}
          parents={all.filter((l) => l.country !== 'ET' && l.level !== 'area')}
          mergeTargets={all.filter((l) => l.country !== 'ET')}
          addTitle="Add a city or area abroad"
          allowRoot={false}
        />
      </section>
    </div>
  )
}
