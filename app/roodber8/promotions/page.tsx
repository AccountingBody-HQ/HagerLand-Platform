import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate, formatETBCents } from '@/lib/format'
import { AdminHeader, DataTable, Panel } from '@/components/admin/AdminUi'
import { NewPromotion, PromotionEndTool } from '@/components/admin/PromotionTools'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'

export const metadata = { title: 'Promotions' }

const ADMIN_PATH: Record<string, string> = { property: 'properties', development: 'developments', organisation: 'organisations', product: 'products' }

export default async function PromotionsPage(route: { searchParams: Promise<{ show?: string }> }) {
  const searchParams = await route.searchParams
  await requireAdminPage()
  const show = searchParams.show === 'ended' ? 'ended' : searchParams.show === 'upcoming' ? 'upcoming' : 'active'
  const db = getAdminSupabase()
  const now = new Date().toISOString()
  let q = db.from('promotions').select('*')
  if (show === 'active') q = q.lte('starts_at', now).gt('ends_at', now).order('ends_at')
  if (show === 'upcoming') q = q.gt('starts_at', now).order('starts_at')
  if (show === 'ended') q = q.lte('ends_at', now).order('ends_at', { ascending: false }).limit(200)
  const { data: promos } = await q
  const rows = promos ?? []
  const ids = (t: string) => rows.filter((r) => r.entity_type === t).map((r) => r.entity_id)
  const [props, devs, orgs, prods] = await Promise.all([
    ids('property').length ? db.from('properties').select('id, title').in('id', ids('property')) : { data: [] },
    ids('development').length ? db.from('developments').select('id, name').in('id', ids('development')) : { data: [] },
    ids('organisation').length ? db.from('organisations').select('id, name').in('id', ids('organisation')) : { data: [] },
    ids('product').length ? db.from('products').select('id, name').in('id', ids('product')) : { data: [] },
  ])
  const names = new Map<string, string>([
    ...(props.data ?? []).map((r): [string, string] => [r.id, r.title]),
    ...[...(devs.data ?? []), ...(orgs.data ?? []), ...(prods.data ?? [])].map((r): [string, string] => [r.id, r.name]),
  ])
  const tab = (key: string, label: string) => (
    <Link href={`/roodber8/promotions?show=${key}`} aria-current={show === key ? 'page' : undefined} className={cn('rounded-md px-3 py-2 text-small font-semibold', show === key ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-stone-100')}>
      {label}
    </Link>
  )
  return (
    <div className="space-y-5">
      <AdminHeader title="Promotions" description="Featured placements with start and end dates. Featured badges switch on and off automatically." />
      <Panel title="New promotion">
        <NewPromotion />
      </Panel>
      <nav aria-label="Promotion status" className="flex gap-2">
        {tab('active', 'Active')}
        {tab('upcoming', 'Upcoming')}
        {tab('ended', 'Ended')}
      </nav>
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        empty={show === 'active' ? 'No promotions are running.' : show === 'upcoming' ? 'Nothing scheduled.' : 'No ended promotions.'}
        columns={[
          { key: 'what', label: 'Record', render: (r) => <Link href={`/roodber8/${ADMIN_PATH[r.entity_type]}/${r.entity_id}`} className="font-semibold hover:underline">{names.get(r.entity_id) ?? 'Deleted record'}</Link> },
          { key: 'type', label: 'Type', render: (r) => r.entity_type },
          { key: 'kind', label: 'Placement', render: (r) => r.kind.replace(/_/g, ' ') },
          { key: 'dates', label: 'Dates', render: (r) => `${formatDate(r.starts_at)} – ${formatDate(r.ends_at)}` },
          { key: 'paid', label: 'Paid', render: (r) => (r.paid ? <Badge tone="gold">{r.price_etb_cents !== null ? formatETBCents(r.price_etb_cents) : 'paid'}</Badge> : 'Free') },
          { key: 'notes', label: 'Notes', render: (r) => r.notes ?? '' },
          { key: 'act', label: '', render: (r) => <PromotionEndTool id={r.id} active={show !== 'ended'} /> },
        ]}
      />
    </div>
  )
}
