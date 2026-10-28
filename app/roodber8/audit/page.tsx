import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { escapeLikePattern } from '@/lib/security'
import { formatDate } from '@/lib/format'
import { AdminHeader, DataTable, FilterBar, FilterField, filterInput, SimplePager } from '@/components/admin/AdminUi'
import { ButtonLink } from '@/components/ui/Button'
import { must } from '@/lib/admin/must'

export const metadata = { title: 'Audit log' }
const PAGE = 100

const ENTITY_PATH: Record<string, string> = {
  property: '/roodber8/properties',
  development: '/roodber8/developments',
  organisation: '/roodber8/organisations',
  product: '/roodber8/products',
  enquiry: '/roodber8/enquiries',
  quote: '/roodber8/quotes',
  user: '/roodber8/users',
}

function diffSummary(diff: unknown): string {
  if (!diff || typeof diff !== 'object') return ''
  return Object.entries(diff as Record<string, unknown>)
    .slice(0, 6)
    .map(([k, v]) => {
      if (v && typeof v === 'object' && 'to' in (v as object)) return `${k}: ${JSON.stringify((v as { from: unknown }).from)} → ${JSON.stringify((v as { to: unknown }).to)}`
      return `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`
    })
    .join('; ')
    .slice(0, 300)
}

export default async function AuditPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const searchParams = await props.searchParams
  await requireAdminPage()
  const page = Math.max(1, Number(searchParams.page) || 1)
  let q = getAdminSupabase().from('audit_log').select('id, created_at, actor, action, entity_type, entity_id, entity_label, diff', { count: 'exact' })
  if (searchParams.q) q = q.ilike('entity_label', `%${escapeLikePattern(searchParams.q.trim().slice(0, 80))}%`)
  if (searchParams.action) q = q.ilike('action', `${escapeLikePattern(searchParams.action.trim().slice(0, 60))}%`)
  if (searchParams.type) q = q.eq('entity_type', searchParams.type.slice(0, 40))
  if (searchParams.from) q = q.gte('created_at', `${searchParams.from}T00:00:00Z`)
  if (searchParams.to) q = q.lte('created_at', `${searchParams.to}T23:59:59Z`)
  const { data, count } = must(await q.order('created_at', { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1))
  const params = new URLSearchParams(Object.entries(searchParams).filter((e): e is [string, string] => Boolean(e[1]) && e[0] !== 'page'))
  return (
    <div>
      <AdminHeader
        title="Audit log"
        description="Every admin action, newest first."
        actions={
          <ButtonLink href="/roodber8/export/audit" variant="secondary" size="sm">
            Export CSV
          </ButtonLink>
        }
      />
      <FilterBar action="/roodber8/audit">
        <FilterField label="Record name">
          <input name="q" defaultValue={searchParams.q} className={filterInput} />
        </FilterField>
        <FilterField label="Action starts with">
          <input name="action" defaultValue={searchParams.action} placeholder="e.g. property." className={filterInput} />
        </FilterField>
        <FilterField label="Type">
          <select name="type" defaultValue={searchParams.type ?? ''} className={filterInput}>
            <option value="">Any</option>
            {['property', 'development', 'organisation', 'product', 'enquiry', 'quote', 'user', 'location', 'settings', 'claim', 'verification'].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="From">
          <input type="date" name="from" defaultValue={searchParams.from} className={filterInput} />
        </FilterField>
        <FilterField label="To">
          <input type="date" name="to" defaultValue={searchParams.to} className={filterInput} />
        </FilterField>
      </FilterBar>
      <p className="mb-2 text-small text-muted">{count ?? 0} entries</p>
      <DataTable
        rows={data ?? []}
        rowKey={(r) => r.id}
        empty="No audit entries match."
        columns={[
          { key: 'when', label: 'When', render: (r) => <span className="whitespace-nowrap">{formatDate(r.created_at)} {new Date(r.created_at).toISOString().slice(11, 16)} UTC</span> },
          { key: 'action', label: 'Action', render: (r) => <span className="font-mono text-caption">{r.action}</span> },
          {
            key: 'record',
            label: 'Record',
            render: (r) => {
              const base = r.entity_type ? ENTITY_PATH[r.entity_type] : undefined
              const label = r.entity_label || r.entity_type || ''
              return base && r.entity_id ? <Link href={`${base}/${r.entity_id}`} className="font-semibold hover:underline">{label}</Link> : label
            },
          },
          { key: 'diff', label: 'Details', render: (r) => <span className="break-words text-caption text-muted">{diffSummary(r.diff)}</span> },
          { key: 'actor', label: 'By', render: (r) => r.actor },
        ]}
      />
      <SimplePager page={page} hasMore={(count ?? 0) > page * PAGE} hrefFor={(p) => `/roodber8/audit?${new URLSearchParams([...Array.from(params.entries()), ['page', String(p)]])}`} />
    </div>
  )
}
