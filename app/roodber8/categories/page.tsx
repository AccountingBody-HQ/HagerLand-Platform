import { readAll, REPORT_MAX_ROWS } from '@/lib/admin/read-all'
import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { AdminHeader } from '@/components/admin/AdminUi'
import { TaxonomyEditor, type TreeNode } from '@/components/admin/TaxonomyEditor'
import { cn } from '@/lib/cn'
import { must } from '@/lib/admin/must'

export const metadata = { title: 'Categories' }

function countBy<T>(rows: T[] | null, key: (r: T) => string | null): Map<string, number> {
  const m = new Map<string, number>()
  for (const r of rows ?? []) {
    const k = key(r)
    if (k) m.set(k, (m.get(k) ?? 0) + 1)
  }
  return m
}

export default async function CategoriesPage(props: { searchParams: Promise<{ type?: string }> }) {
  const searchParams = await props.searchParams
  await requireAdminPage()
  const type = searchParams.type === 'service' ? 'service' : 'product'
  const db = getAdminSupabase()
  let nodes: TreeNode[]
  if (type === 'product') {
    const [{ data: cats }, { data: products }] = must(await Promise.all([
      db.from('product_categories').select('id, parent_id, name, slug, sort, is_active, description, seo_title, seo_intro'),
      readAll(() => db.from('products').select('category_id').neq('status', 'removed'), { maxRows: REPORT_MAX_ROWS }),
    ]))
    const counts = countBy(products, (p) => p.category_id)
    nodes = (cats ?? []).map((c) => ({ ...c, meta: counts.get(c.id) ? `${counts.get(c.id)} products` : undefined, fields: { description: c.description, seo_title: c.seo_title, seo_intro: c.seo_intro } }))
  } else {
    const [{ data: cats }, { data: links }] = must(await Promise.all([
      db.from('service_categories').select('id, parent_id, name, slug, sort, is_active, description, seo_title, seo_intro'),
      readAll(() => db.from('organisation_services').select('service_id'), { maxRows: REPORT_MAX_ROWS, key: ['org_id', 'service_id'] }),
    ]))
    const counts = countBy(links, (l) => l.service_id)
    nodes = (cats ?? []).map((c) => ({ ...c, meta: counts.get(c.id) ? `${counts.get(c.id)} companies` : undefined, fields: { description: c.description, seo_title: c.seo_title, seo_intro: c.seo_intro } }))
  }
  const byId = new Map(nodes.map((n) => [n.id, n]))
  const parents = nodes
    .filter((n) => !n.parent_id || !byId.get(n.parent_id)?.parent_id)
    .map((n) => ({ id: n.id, label: n.parent_id ? `${byId.get(n.parent_id)?.name} › ${n.name}` : n.name }))
    .sort((a, b) => a.label.localeCompare(b.label))
  const tab = (t: string, label: string) => (
    <Link href={`/roodber8/categories?type=${t}`} aria-current={type === t ? 'page' : undefined} className={cn('rounded-md px-3 py-2 text-small font-semibold', type === t ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-stone-100')}>
      {label}
    </Link>
  )
  return (
    <div className="max-w-5xl">
      <AdminHeader title="Categories" description="Rename, reorder, add or switch off categories. Web addresses never change after a category is created." />
      <nav aria-label="Category type" className="mb-4 flex gap-2">
        {tab('product', 'Product categories')}
        {tab('service', 'Service categories')}
      </nav>
      <TaxonomyEditor key={type} mode={{ kind: 'category', category: type }} nodes={nodes} parents={parents} addTitle={type === 'product' ? 'Add a product category' : 'Add a service category'} />
    </div>
  )
}
