import Link from 'next/link'
import { Plus, Upload } from 'lucide-react'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { escapeLikePattern } from '@/lib/security'
import { formatDate } from '@/lib/format'
import { productPrice } from '@/lib/product-price'
import { STOCK_LABEL } from '@/lib/units'
import { AdminHeader, DataTable, FilterBar, FilterField, filterInput, SimplePager, StatusBadge } from '@/components/admin/AdminUi'
import { ButtonLink } from '@/components/ui/Button'

export const metadata = { title: 'Products' }
const PAGE = 50

export default async function AdminProductsPage({ searchParams }: { searchParams: Record<string, string | undefined> }) {
  requireAdminPage()
  const page = Math.max(1, Number(searchParams.page) || 1)
  const db = getAdminSupabase()
  let q = db.from('products').select('id, name, sku, status, unit, price_type, price_etb_cents, price_updated_at, stock_status, category:product_categories(name), seller:organisations(name)', { count: 'exact' })
  if (searchParams.q) {
    const term = escapeLikePattern(searchParams.q.trim().slice(0, 80))
    // An exact SKU match wins; otherwise search by name.
    const { data: bySku } = await db.from('products').select('id').ilike('sku', term).limit(50)
    q = bySku?.length ? q.in('id', bySku.map((r) => r.id)) : q.ilike('name', `%${term}%`)
  }
  if (searchParams.status) q = q.eq('status', searchParams.status as 'published')
  if (searchParams.stock) q = q.eq('stock_status', searchParams.stock as 'in_stock')
  const { data, count } = await q.order('name').range((page - 1) * PAGE, page * PAGE - 1)
  return (
    <div>
      <AdminHeader
        title="Products"
        description={`${count ?? 0} products in the catalogue`}
        actions={
          <>
            <ButtonLink href="/roodber8/export/products" variant="secondary" size="sm">
              Export CSV
            </ButtonLink>
            <ButtonLink href="/roodber8/products/prices" variant="secondary" size="sm">
              <Upload /> Update prices (CSV)
            </ButtonLink>
            <ButtonLink href="/roodber8/products/new" size="sm">
              <Plus /> New product
            </ButtonLink>
          </>
        }
      />
      <FilterBar action="/roodber8/products">
        <FilterField label="Search">
          <input name="q" defaultValue={searchParams.q} placeholder="Name or SKU" className={filterInput} />
        </FilterField>
        <FilterField label="Status">
          <select name="status" defaultValue={searchParams.status ?? ''} className={filterInput}>
            <option value="">Any</option>
            {['draft', 'published', 'paused', 'archived'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Stock">
          <select name="stock" defaultValue={searchParams.stock ?? ''} className={filterInput}>
            <option value="">Any</option>
            {Object.entries(STOCK_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>
      <DataTable
        rows={data ?? []}
        rowKey={(r) => r.id}
        columns={[
          { key: 'name', label: 'Product', render: (r) => <Link href={`/roodber8/products/${r.id}`} className="font-semibold hover:underline">{r.name}</Link> },
          { key: 'sku', label: 'SKU', render: (r) => <span className="font-mono text-caption">{r.sku ?? ''}</span> },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'cat', label: 'Category', render: (r) => (r.category as { name: string } | null)?.name ?? '' },
          { key: 'price', label: 'Price', render: (r) => productPrice(r), className: 'tabular-nums' },
          { key: 'stock', label: 'Stock', render: (r) => STOCK_LABEL[r.stock_status]?.label },
          { key: 'updated', label: 'Price updated', render: (r) => (r.price_updated_at ? formatDate(r.price_updated_at) : '') },
          { key: 'seller', label: 'Seller', render: (r) => (r.seller as { name: string } | null)?.name ?? '' },
        ]}
      />
      <SimplePager page={page} hasMore={(count ?? 0) > page * PAGE} hrefFor={(p) => `/roodber8/products?page=${p}`} />
    </div>
  )
}
