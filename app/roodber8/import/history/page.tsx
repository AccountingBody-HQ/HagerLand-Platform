export const dynamic = 'force-dynamic'
import { unstable_noStore as noStore } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/admin-auth'

const C = {
  bg: '#080d1a', panel: '#0d1424', border: '#1a2238', text: '#ffffff',
  muted: '#94a3b8', faint: '#475569', green: '#1C7C4C', gold: '#B8862E',
  goldSoft: 'rgba(184,138,46,0.12)', danger: '#ef4444',
}

const PAGE_SIZE = 50

const SECTION_LABELS: Record<string, string> = {
  companies: 'Businesses', jobs: 'Jobs', housing: 'Housing', money: 'Money',
  cars: 'Cars', tutors: 'Tutors', community: 'Community', events: 'Events',
}

function adminPath(section: string, listingId: string | null): string | null {
  if (!listingId) return null
  return section === 'companies' ? `/roodber8/businesses/${listingId}` : `/roodber8/${section}/${listingId}`
}

export default async function ImportHistoryPage({ searchParams }: { searchParams: { page?: string } }) {
  noStore()
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!verifySessionToken(token)) redirect('/roodber8-login')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: rows, count } = await supabase
    .from('import_log')
    .select('*', { count: 'exact' })
    .order('imported_at', { ascending: false })
    .range(from, to)

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <p style={{ color: C.faint, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.5rem' }}>
          Admin · Import Tool
        </p>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Import History</h1>
        <p style={{ color: C.muted, fontSize: '0.9rem' }}>
          Every import ever run — {total} record{total !== 1 ? 's' : ''}. Failed imports can be retried from the{' '}
          <Link href="/roodber8/import" style={{ color: C.green }}>import tool</Link>; only successful imports are blocked as duplicates.
        </p>
      </div>

      <div style={{ background: C.panel, border: '1px solid ' + C.border, borderRadius: '12px', overflow: 'hidden' }}>
        {(rows || []).length === 0 && (
          <p style={{ color: C.muted, padding: '1.5rem', margin: 0 }}>No imports recorded yet.</p>
        )}
        {(rows || []).map((row) => {
          const link = adminPath(row.section, row.listing_id)
          return (
            <div key={row.google_place_id + row.section} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1.25rem', borderBottom: '1px solid ' + C.border }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 600, marginBottom: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.listing_name || row.google_place_id}
                </p>
                <p style={{ color: C.muted, fontSize: '0.8rem', margin: 0 }}>
                  {new Date(row.imported_at).toLocaleString('en-GB')}
                  {row.error ? ' · ' + row.error : ''}
                </p>
              </div>
              <span style={{ flexShrink: 0, background: 'rgba(255,255,255,0.06)', color: C.muted, fontSize: '0.72rem', fontWeight: 600, padding: '0.25rem 0.6rem', borderRadius: '999px' }}>
                {SECTION_LABELS[row.section] || row.section}
              </span>
              <span style={{
                flexShrink: 0, fontSize: '0.75rem', fontWeight: 600, padding: '0.25rem 0.6rem', borderRadius: '999px',
                background: row.status === 'imported' ? 'rgba(28,124,76,0.15)' : 'rgba(239,68,68,0.12)',
                color: row.status === 'imported' ? C.green : C.danger,
              }}>
                {row.status === 'imported' ? 'Imported' : 'Failed'}
              </span>
              {link ? (
                <Link href={link} style={{ flexShrink: 0, color: C.muted, fontSize: '0.8rem', border: '1px solid ' + C.border, borderRadius: '8px', padding: '0.35rem 0.75rem', textDecoration: 'none' }}>
                  View
                </Link>
              ) : (
                <span style={{ flexShrink: 0, width: '52px' }} />
              )}
            </div>
          )
        })}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', alignItems: 'center' }}>
          {page > 1 && (
            <Link href={`/roodber8/import/history?page=${page - 1}`} style={{ color: C.muted, fontSize: '0.85rem', border: '1px solid ' + C.border, borderRadius: '8px', padding: '0.45rem 0.9rem', textDecoration: 'none' }}>
              Previous
            </Link>
          )}
          <span style={{ color: C.faint, fontSize: '0.8rem' }}>Page {page} of {totalPages}</span>
          {page < totalPages && (
            <Link href={`/roodber8/import/history?page=${page + 1}`} style={{ color: C.muted, fontSize: '0.85rem', border: '1px solid ' + C.border, borderRadius: '8px', padding: '0.45rem 0.9rem', textDecoration: 'none' }}>
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
