import Link from 'next/link'
import { z } from 'zod'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { escapeLikePattern } from '@/lib/security'
import { formatPhone, normalisePhone } from '@/lib/format'
import { AdminHeader, Panel, StatusBadge } from '@/components/admin/AdminUi'
import { must } from '@/lib/admin/must'

export const metadata = { title: 'Search' }

interface Hit {
  href: string
  title: string
  meta: string
  status?: string
}

/** Admin global search: names, references (HLE-/HLQ-), short ids, phone numbers and emails across every record type. */
export default async function AdminSearchPage(route: { searchParams: Promise<{ q?: string }> }) {
  const searchParams = await route.searchParams
  await requireAdminPage()
  const term = (searchParams.q ?? '').trim().slice(0, 100)
  const groups: { title: string; hits: Hit[] }[] = []
  if (term.length >= 2) {
    const db = getAdminSupabase()
    const like = `%${escapeLikePattern(term)}%`
    const phone = normalisePhone(term)
    const isUuid = z.uuid().safeParse(term).success
    const isShort = /^[0-9a-z]{8}$/i.test(term)
    const isRef = /^HL[EQ]-\d{4}-\d+$/i.test(term)
    const isEmail = term.includes('@')
    const looksLikeSku = /^[A-Z0-9-]{3,}$/i.test(term)

    const [props, orgs, devs, prods, enqs, quotes, users] = must(await Promise.all([
      isUuid ? db.from('properties').select('id, title, short_id, status').eq('id', term).limit(10) : isShort ? db.from('properties').select('id, title, short_id, status').eq('short_id', term.toLowerCase()).limit(10) : phone ? db.from('properties').select('id, title, short_id, status').eq('contact_phone', phone).limit(20) : db.from('properties').select('id, title, short_id, status').ilike('title', like).limit(20),
      isUuid ? db.from('organisations').select('id, name, kind, status').eq('id', term).limit(10) : phone ? db.from('organisations').select('id, name, kind, status').eq('phone', phone).limit(20) : isEmail ? db.from('organisations').select('id, name, kind, status').ilike('email', term).limit(20) : db.from('organisations').select('id, name, kind, status').ilike('name', like).limit(20),
      isUuid ? db.from('developments').select('id, name, status').eq('id', term).limit(10) : db.from('developments').select('id, name, status').ilike('name', like).limit(20),
      isUuid ? db.from('products').select('id, name, sku, status').eq('id', term).limit(10) : Promise.all([db.from('products').select('id, name, sku, status').ilike('name', like).limit(20), looksLikeSku ? db.from('products').select('id, name, sku, status').ilike('sku', escapeLikePattern(term)).limit(5) : Promise.resolve({ data: [] })]).then(must).then(([byName, bySku]) => ({ data: [...(bySku.data ?? []), ...(byName.data ?? []).filter((n) => !(bySku.data ?? []).some((x) => x.id === n.id))] })),
      isRef && term.toUpperCase().startsWith('HLE') ? db.from('enquiries').select('id, reference, name, status').eq('reference', term.toUpperCase()) : phone ? db.from('enquiries').select('id, reference, name, status').eq('phone', phone).limit(20) : isEmail ? db.from('enquiries').select('id, reference, name, status').ilike('email', term).limit(20) : Promise.resolve({ data: [] as { id: string; reference: string; name: string; status: string }[] }),
      isRef && term.toUpperCase().startsWith('HLQ') ? db.from('quote_requests').select('id, reference, name, status').eq('reference', term.toUpperCase()) : phone ? db.from('quote_requests').select('id, reference, name, status').eq('phone', phone).limit(20) : isEmail ? db.from('quote_requests').select('id, reference, name, status').ilike('email', term).limit(20) : Promise.resolve({ data: [] as { id: string; reference: string; name: string; status: string }[] }),
      phone ? db.from('profiles').select('id, full_name, phone').eq('phone', phone).limit(20) : !isEmail && !isUuid && !isShort ? db.from('profiles').select('id, full_name, phone').ilike('full_name', like).limit(20) : isUuid ? db.from('profiles').select('id, full_name, phone').eq('id', term) : Promise.resolve({ data: [] as { id: string; full_name: string | null; phone: string | null }[] }),
    ]))
    groups.push(
      { title: 'Properties', hits: (props.data ?? []).map((r) => ({ href: `/roodber8/properties/${r.id}`, title: r.title, meta: r.short_id, status: r.status })) },
      { title: 'Organisations', hits: (orgs.data ?? []).map((r) => ({ href: `/roodber8/organisations/${r.id}`, title: r.name, meta: r.kind.replace('_', ' '), status: r.status })) },
      { title: 'Developments', hits: (devs.data ?? []).map((r) => ({ href: `/roodber8/developments/${r.id}`, title: r.name, meta: '', status: r.status })) },
      { title: 'Products', hits: (prods.data ?? []).map((r) => ({ href: `/roodber8/products/${r.id}`, title: r.name, meta: r.sku ?? '', status: r.status })) },
      { title: 'Enquiries', hits: (enqs.data ?? []).map((r) => ({ href: `/roodber8/enquiries/${r.id}`, title: r.reference, meta: r.name, status: r.status })) },
      { title: 'Quotes', hits: (quotes.data ?? []).map((r) => ({ href: `/roodber8/quotes/${r.id}`, title: r.reference, meta: r.name, status: r.status })) },
      { title: 'Users', hits: (users.data ?? []).map((r) => ({ href: `/roodber8/users/${r.id}`, title: r.full_name || 'No name', meta: r.phone ? formatPhone(r.phone) : '' })) },
    )
  }
  const found = groups.filter((g) => g.hits.length)
  return (
    <div className="max-w-4xl">
      <AdminHeader title="Search" description={term ? `Results for “${term}”` : 'Search every record by name, reference, short id, phone or email.'} />
      <form action="/roodber8/search" method="get" role="search" className="mb-5 flex gap-2">
        <label htmlFor="admin-search-q" className="sr-only">
          Search
        </label>
        <input id="admin-search-q" name="q" defaultValue={term} className="h-11 flex-1 rounded-md border border-border-strong bg-white px-3" placeholder="Name, HLE-/HLQ- reference, 8-character id, phone or email" />
        <button type="submit" className="h-11 rounded-md bg-ink px-4 font-semibold text-white">
          Search
        </button>
      </form>
      {term.includes('@') && (
        <p className="mb-4 text-small">
          Looking for a user account? <Link href={`/roodber8/users?q=${encodeURIComponent(term)}`} className="font-semibold text-green underline">Search users by email</Link>.
        </p>
      )}
      {term.length >= 2 && found.length === 0 && <p className="rounded-lg border border-dashed border-border-strong bg-white p-8 text-center text-small text-muted">Nothing found for “{term}”.</p>}
      <div className="space-y-4">
        {found.map((g) => (
          <Panel key={g.title} title={`${g.title} (${g.hits.length})`}>
            <ul className="divide-y divide-border">
              {g.hits.map((h) => (
                <li key={h.href} className="flex items-center justify-between gap-3 py-2">
                  <Link href={h.href} className="min-w-0 font-semibold hover:underline">
                    {h.title} {h.meta && <span className="text-caption font-normal text-muted">{h.meta}</span>}
                  </Link>
                  {h.status && <StatusBadge status={h.status} />}
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
    </div>
  )
}
