import { readAll, REPORT_MAX_ROWS } from '@/lib/admin/read-all'
import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/format'
import { AdminHeader, DataTable, SimplePager, StatusBadge } from '@/components/admin/AdminUi'
import { cn } from '@/lib/cn'
import { ImportSearch } from './ImportSearch'
import { ImportReview } from './ImportReview'
import { loadImported } from '@/lib/imports/compliance-data'
import { STATE_LABEL } from '@/lib/imports/compliance'
import { must } from '@/lib/admin/must'

export const metadata = { title: 'Imports' }
const PAGE = 50

export default async function ImportPage(props: { searchParams: Promise<{ tab?: string; page?: string }> }) {
  const searchParams = await props.searchParams
  await requireAdminPage()
  const tab = searchParams.tab === 'review' || searchParams.tab === 'history' ? searchParams.tab : 'search'
  const db = getAdminSupabase()
  const { count: reviewCount } = must(await db.from('organisations').select('id', { count: 'exact', head: true }).eq('source', 'import').in('status', ['draft', 'pending_review']))
  const tabLink = (key: string, label: string) => (
    <Link href={`/roodber8/import?tab=${key}`} aria-current={tab === key ? 'page' : undefined} className={cn('rounded-md px-3 py-2 text-small font-semibold', tab === key ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-stone-100')}>
      {label}
    </Link>
  )
  let body: React.ReactNode
  if (tab === 'search') {
    const [{ data: services }, { data: locations }] = must(await Promise.all([
      db.from('service_categories').select('id, name, parent_id').eq('is_active', true).order('sort'),
      readAll(() => db.from('locations').select('id, display_name, level').eq('is_active', true).neq('level', 'area').order('display_name'), { maxRows: REPORT_MAX_ROWS }),
    ]))
    const byId = new Map((services ?? []).map((s) => [s.id, s.name]))
    body = (
      <ImportSearch
        configured={Boolean(process.env.GOOGLE_PLACES_API_KEY)}
        services={(services ?? []).map((s) => ({ id: s.id, label: s.parent_id ? `${byId.get(s.parent_id)} › ${s.name}` : s.name })).sort((a, b) => a.label.localeCompare(b.label))}
        locations={(locations ?? []).map((l) => ({ id: l.id, label: l.display_name }))}
      />
    )
  } else if (tab === 'review') {
    const { data } = must(await db
      .from('organisations')
      .select('id, name, kind, description, phone, website, address_line, location:locations(display_name), services:organisation_services(service:service_categories(name))')
      .eq('source', 'import')
      .in('status', ['draft', 'pending_review'])
      .order('created_at')
      .limit(200))
    const states = new Map((await loadImported()).map((r) => [r.id, r.c]))
    body = (
      <ImportReview
        items={(data ?? []).map((o) => ({
          id: o.id,
          name: o.name,
          kind: o.kind,
          description: o.description,
          phone: o.phone,
          website: o.website,
          address: o.address_line,
          location: (o.location as { display_name: string } | null)?.display_name ?? null,
          services: ((o.services ?? []) as { service: { name: string } | null }[]).map((s) => s.service?.name ?? '').filter(Boolean),
          state: STATE_LABEL[states.get(o.id)?.state ?? 'lead'],
          block: states.get(o.id)?.publishBlock ?? null,
        }))}
      />
    )
  } else {
    const page = Math.max(1, Number(searchParams.page) || 1)
    const { data, count } = must(await db.from('import_log').select('google_place_id, section, status, listing_id, listing_name, error, imported_at, entity_type', { count: 'exact' }).order('imported_at', { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1))
    body = (
      <>
        <DataTable
          rows={data ?? []}
          rowKey={(r) => `${r.google_place_id}:${r.section}`}
          empty="No imports yet."
          columns={[
            { key: 'name', label: 'Business', render: (r) => (r.listing_id && r.entity_type === 'organisation' && r.section.startsWith('org_') ? <Link href={`/roodber8/organisations/${r.listing_id}`} className="font-semibold hover:underline">{r.listing_name || 'Unnamed'}</Link> : r.listing_name ?? '') },
            { key: 'section', label: 'Section', render: (r) => (r.section.startsWith('org_') ? r.section.slice(4).replace('_', ' ') : `${r.section} (old site)`) },
            { key: 'status', label: 'Result', render: (r) => <StatusBadge status={r.status} /> },
            { key: 'error', label: 'Note', render: (r) => r.error ?? '' },
            { key: 'date', label: 'When', render: (r) => (r.imported_at ? formatDate(r.imported_at) : '') },
          ]}
        />
        <SimplePager page={page} hasMore={(count ?? 0) > page * PAGE} hrefFor={(p) => `/roodber8/import?tab=history&page=${p}`} />
      </>
    )
  }
  return (
    <div className="space-y-5">
      <AdminHeader
        title="Imports"
        description="Find businesses on Google as leads. Only Google’s place ID is kept: confirm each business’s details with the business itself (phone, WhatsApp, Telegram, visit or email) before it can be published."
        actions={
          <Link href="/roodber8/imports/compliance" prefetch={false} className="inline-flex min-h-10 items-center text-small font-semibold text-green underline">
            Imports compliance
          </Link>
        }
      />
      <nav aria-label="Import steps" className="flex flex-wrap gap-2">
        {tabLink('search', '1. Search and import')}
        {tabLink('review', `2. Leads to confirm (${reviewCount ?? 0})`)}
        {tabLink('history', 'History')}
      </nav>
      {body}
    </div>
  )
}
