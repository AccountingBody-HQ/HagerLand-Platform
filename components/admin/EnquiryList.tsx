import Link from 'next/link'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { escapeLikePattern } from '@/lib/security'
import { formatDate, formatPhone } from '@/lib/format'
import { INTENT_LABELS } from '@/lib/enquiries'
import { DataTable, FilterBar, FilterField, filterInput, SimplePager, StatusBadge } from './AdminUi'

const PAGE = 50
const TARGETS: Record<string, string> = {
  property: 'Property',
  development: 'Development',
  organisation: 'Company',
  product: 'Product',
  hagerland_development: 'HagerLand Developments',
  general: 'Contact form',
}

/** Shared list for /roodber8/enquiries and /roodber8/sales (HagerLand's own sales leads). */
export async function EnquiryList({ basePath, searchParams, salesOnly = false }: { basePath: string; searchParams: Record<string, string | undefined>; salesOnly?: boolean }) {
  const page = Math.max(1, Number(searchParams.page) || 1)
  let q = getAdminSupabase().from('enquiries').select('id, reference, created_at, status, target_type, intent, name, phone, first_viewed_at, recipient_org_id, recipient_user_id, org:organisations!enquiries_recipient_org_id_fkey(name)', { count: 'exact' })
  if (salesOnly) q = q.or('target_type.eq.hagerland_development,intent.eq.register_interest,details->>topic.like.Agency:*')
  if (searchParams.q) {
    const term = searchParams.q.trim().slice(0, 80)
    q = /^HLE-/i.test(term) ? q.eq('reference', term.toUpperCase()) : q.ilike('name', `%${escapeLikePattern(term)}%`)
  }
  if (searchParams.status) q = q.eq('status', searchParams.status as 'new')
  if (searchParams.target && !salesOnly) q = q.eq('target_type', searchParams.target)
  if (searchParams.from) q = q.gte('created_at', `${searchParams.from}T00:00:00Z`)
  if (searchParams.to) q = q.lte('created_at', `${searchParams.to}T23:59:59Z`)
  if (searchParams.unanswered === '1') q = q.is('first_viewed_at', null).lt('created_at', new Date(Date.now() - 48 * 3_600_000).toISOString()).not('target_type', 'in', '("general","hagerland_development")')
  const { data, count } = await q.order('created_at', { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1)
  const params = new URLSearchParams(Object.entries(searchParams).filter((e): e is [string, string] => Boolean(e[1]) && e[0] !== 'page'))
  return (
    <>
      <FilterBar action={basePath}>
        <FilterField label="Search">
          <input name="q" defaultValue={searchParams.q} placeholder="Name or HLE- reference" className={filterInput} />
        </FilterField>
        <FilterField label="Status">
          <select name="status" defaultValue={searchParams.status ?? ''} className={filterInput}>
            <option value="">Any</option>
            {['new', 'contacted', 'qualified', 'won', 'lost', 'spam'].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FilterField>
        {!salesOnly && (
          <FilterField label="About">
            <select name="target" defaultValue={searchParams.target ?? ''} className={filterInput}>
              <option value="">Anything</option>
              {Object.entries(TARGETS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </FilterField>
        )}
        <FilterField label="From">
          <input type="date" name="from" defaultValue={searchParams.from} className={filterInput} />
        </FilterField>
        <FilterField label="To">
          <input type="date" name="to" defaultValue={searchParams.to} className={filterInput} />
        </FilterField>
        {!salesOnly && (
          <label className="flex h-10 items-center gap-2 text-small">
            <input type="checkbox" name="unanswered" value="1" defaultChecked={searchParams.unanswered === '1'} className="size-4 accent-green" /> Unopened over 48 h
          </label>
        )}
      </FilterBar>
      <p className="mb-2 text-small text-muted">{count ?? 0} found</p>
      <DataTable
        rows={data ?? []}
        rowKey={(r) => r.id}
        empty="No enquiries match these filters."
        columns={[
          { key: 'ref', label: 'Reference', render: (r) => <Link href={`/roodber8/enquiries/${r.id}`} className="font-semibold tabular-nums hover:underline">{r.reference}</Link> },
          { key: 'date', label: 'Received', render: (r) => formatDate(r.created_at) },
          { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { key: 'about', label: 'About', render: (r) => `${TARGETS[r.target_type] ?? r.target_type} · ${INTENT_LABELS[r.intent] ?? r.intent}` },
          { key: 'from', label: 'From', render: (r) => <>{r.name}<br /><span className="text-caption text-muted">{formatPhone(r.phone)}</span></> },
          { key: 'to', label: 'Sent to', render: (r) => (r.org as { name: string } | null)?.name ?? (r.recipient_user_id ? 'Private owner' : 'HagerLand') },
          { key: 'opened', label: 'Opened', render: (r) => (r.first_viewed_at ? formatDate(r.first_viewed_at) : <span className="text-muted">Not yet</span>) },
        ]}
      />
      <SimplePager page={page} hasMore={(count ?? 0) > page * PAGE} hrefFor={(p) => `${basePath}?${new URLSearchParams([...Array.from(params.entries()), ['page', String(p)]])}`} />
    </>
  )
}

export { TARGETS as ENQUIRY_TARGET_LABELS }
