import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { escapeLikePattern } from '@/lib/security'
import { formatDate, formatPhone, normalisePhone } from '@/lib/format'
import { AdminHeader, DataTable, FilterBar, FilterField, filterInput, SimplePager } from '@/components/admin/AdminUi'
import { Badge } from '@/components/ui/Badge'
import { FormAlert } from '@/components/forms/FormParts'

export const metadata = { title: 'Users' }
const PAGE = 50

interface Row {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  account_type: string
  is_suspended: boolean
  deletion_requested_at: string | null
  created_at: string
  last_sign_in_at: string | null
  confirmed: boolean
}

export default async function AdminUsersPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const searchParams = await props.searchParams
  await requireAdminPage()
  const page = Math.max(1, Number(searchParams.page) || 1)
  const db = getAdminSupabase()
  const term = (searchParams.q ?? '').trim().slice(0, 120)
  let rows: Row[] = []
  let hasMore = false

  if (term.includes('@')) {
    // Email search: the auth admin API has no email filter, so scan pages of 1,000 (fine at HagerLand's scale).
    const needle = term.toLowerCase()
    const ids: string[] = []
    for (let p = 1; p <= 20 && ids.length < PAGE; p++) {
      const { data } = await db.auth.admin.listUsers({ page: p, perPage: 1000 })
      const users = data?.users ?? []
      for (const u of users) if (u.email?.toLowerCase().includes(needle)) ids.push(u.id)
      if (users.length < 1000) break
    }
    rows = await load(ids)
  } else if (term || searchParams.filter) {
    let q = db.from('profiles').select('id', { count: 'exact' })
    const phone = term ? normalisePhone(term) : null
    if (phone) q = q.eq('phone', phone)
    else if (term) q = q.ilike('full_name', `%${escapeLikePattern(term)}%`)
    if (searchParams.filter === 'suspended') q = q.eq('is_suspended', true)
    if (searchParams.filter === 'deletion') q = q.not('deletion_requested_at', 'is', null)
    if (searchParams.filter === 'business') q = q.eq('account_type', 'business')
    const { data, count } = await q.order('created_at', { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1)
    rows = await load((data ?? []).map((p) => p.id))
    hasMore = (count ?? 0) > page * PAGE
  } else {
    const { data } = await db.auth.admin.listUsers({ page, perPage: PAGE })
    const users = data?.users ?? []
    rows = await load(users.map((u) => u.id))
    hasMore = users.length === PAGE
  }

  async function load(ids: string[]): Promise<Row[]> {
    if (!ids.length) return []
    const [{ data: profiles }, users] = await Promise.all([db.from('profiles').select('id, full_name, phone, account_type, is_suspended, deletion_requested_at, created_at').in('id', ids), Promise.all(ids.map((id) => db.auth.admin.getUserById(id)))])
    const byId = new Map((profiles ?? []).map((p) => [p.id, p]))
    return users
      .map((u) => u.data.user)
      .filter((u): u is NonNullable<typeof u> => Boolean(u))
      .map((u) => {
        const p = byId.get(u.id)
        return {
          id: u.id,
          email: u.email ?? '',
          full_name: p?.full_name ?? null,
          phone: p?.phone ?? null,
          account_type: p?.account_type ?? 'personal',
          is_suspended: p?.is_suspended ?? false,
          deletion_requested_at: p?.deletion_requested_at ?? null,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          confirmed: Boolean(u.email_confirmed_at),
        }
      })
  }

  const params = (p: number) => `/roodber8/users?${new URLSearchParams([...(term ? [['q', term]] : []), ...(searchParams.filter ? [['filter', searchParams.filter]] : []), ['page', String(p)]])}`
  return (
    <div>
      <AdminHeader title="Users" description="Everyone with a HagerLand account. Search by email, phone or name." />
      {searchParams.deleted && <FormAlert tone="success" className="mb-4">Account deleted.</FormAlert>}
      <FilterBar action="/roodber8/users">
        <FilterField label="Search">
          <input name="q" defaultValue={term} placeholder="Email, phone or name" className={`${filterInput} w-64`} />
        </FilterField>
        <FilterField label="Show">
          <select name="filter" defaultValue={searchParams.filter ?? ''} className={filterInput}>
            <option value="">Everyone</option>
            <option value="business">Business accounts</option>
            <option value="suspended">Suspended</option>
            <option value="deletion">Asked to be deleted</option>
          </select>
        </FilterField>
      </FilterBar>
      <DataTable
        rows={rows}
        rowKey={(r) => r.id}
        empty={term ? `No user matches “${term}”.` : 'No users here.'}
        columns={[
          { key: 'email', label: 'Email', render: (r) => <Link href={`/roodber8/users/${r.id}`} className="font-semibold hover:underline">{r.email || '(no email)'}</Link> },
          { key: 'name', label: 'Name', render: (r) => r.full_name ?? '' },
          { key: 'phone', label: 'Phone', render: (r) => (r.phone ? formatPhone(r.phone) : '') },
          { key: 'type', label: 'Type', render: (r) => r.account_type },
          {
            key: 'flags',
            label: 'Flags',
            render: (r) => (
              <span className="flex flex-wrap gap-1">
                {!r.confirmed && <Badge tone="warning">unconfirmed</Badge>}
                {r.is_suspended && <Badge tone="danger">suspended</Badge>}
                {r.deletion_requested_at && <Badge tone="danger">delete requested</Badge>}
              </span>
            ),
          },
          { key: 'joined', label: 'Joined', render: (r) => formatDate(r.created_at) },
          { key: 'last', label: 'Last sign-in', render: (r) => (r.last_sign_in_at ? formatDate(r.last_sign_in_at) : 'Never') },
        ]}
      />
      <SimplePager page={page} hasMore={hasMore} hrefFor={params} />
    </div>
  )
}
