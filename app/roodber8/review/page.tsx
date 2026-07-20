export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { approveListing, rejectListing, approveClaim, rejectClaim } from './actions'
import Link from 'next/link'

const COLORS = {
  bg: '#080d1a',
  panel: '#0d1424',
  border: '#1a2238',
  text: '#ffffff',
  muted: '#94a3b8',
  green: '#1C7C4C',
  gold: '#B8862E',
  danger: '#ef4444',
}

const SECTIONS = [
  { table: 'jobs', label: 'Jobs', titleField: 'title', subtitleFields: ['category', 'city'], adminPath: 'jobs' },
  { table: 'housing', label: 'Housing', titleField: 'title', subtitleFields: ['category', 'city'], adminPath: 'housing' },
  { table: 'cars', label: 'Cars', titleField: 'title', subtitleFields: ['category', 'city'], adminPath: 'cars' },
  { table: 'tutors', label: 'Tutors', titleField: 'name', subtitleFields: ['category', 'city'], adminPath: 'tutors' },
  { table: 'community', label: 'Community', titleField: 'name', subtitleFields: ['category', 'city'], adminPath: 'community' },
  { table: 'events', label: 'Events', titleField: 'title', subtitleFields: ['category', 'city'], adminPath: 'events' },
  { table: 'companies', label: 'Business', titleField: 'company_name', subtitleFields: ['sic_description', 'trading_address_city'], adminPath: 'businesses' },
  { table: 'money', label: 'Money', titleField: 'title', subtitleFields: ['category', 'city'], adminPath: 'money' },
] as const

export default async function ReviewPage() {
  const sessionToken = cookies().get(SESSION_COOKIE)?.value
  const isAuthenticated = verifySessionToken(sessionToken)

  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ color: COLORS.text, textAlign: 'center' }}>
          <p style={{ marginBottom: 16 }}>Not authenticated.</p>
          <Link href="/roodber8" style={{ color: COLORS.green }}>Go to sign in</Link>
        </div>
      </div>
    )
  }

  const results = await Promise.all(
    SECTIONS.map((s) =>
      supabaseAdmin.from(s.table).select('*').eq('status', 'pending').order(s.table === 'companies' ? 'first_seen_at' : 'created_at', { ascending: false })
    )
  )

  const { data: pendingClaims } = await supabaseAdmin
    .from('business_claims')
    .select('id, company_id, claimant_name, claimant_email, created_at, companies(company_name)')
    .eq('status', 'verified')
    .order('created_at', { ascending: false })

  const pendingBySection = SECTIONS.map((s, i) => ({ ...s, items: results[i].data ?? [] }))
  const totalPending = pendingBySection.reduce((sum, s) => sum + s.items.length, 0)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.bg, fontFamily: 'system-ui, sans-serif', padding: '48px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 2 }}>HagerLand Admin</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, margin: 0 }}>
              Review Queue {totalPending > 0 && <span style={{ color: COLORS.gold }}>({totalPending})</span>}
            </h1>
          </div>
          <Link href="/roodber8" style={{ color: COLORS.muted, fontSize: 13, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 16px', textDecoration: 'none' }}>
            ← Command Centre
          </Link>
        </div>

        {pendingClaims && pendingClaims.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: COLORS.gold, marginBottom: 12 }}>
              Business Claims — Awaiting Approval ({pendingClaims.length})
            </h2>
            <div style={{ backgroundColor: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
              {pendingClaims.map((claim, idx: number) => (
                <div key={claim.id}
                  style={{ padding: 16, borderBottom: idx < pendingClaims.length - 1 ? `1px solid ${COLORS.border}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ color: COLORS.text, fontSize: 14, fontWeight: 600, margin: 0 }}>
                      {(Array.isArray(claim.companies) ? claim.companies[0]?.company_name : (claim.companies as { company_name: string } | null)?.company_name) ?? 'Unknown business'}
                    </p>
                    <p style={{ color: COLORS.muted, fontSize: 12, margin: '4px 0 0' }}>
                      {claim.claimant_name} · {claim.claimant_email}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <Link href={`/roodber8/businesses/${claim.company_id}`}
                      style={{ background: 'transparent', color: COLORS.muted, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
                      View
                    </Link>
                    <form action={approveClaim.bind(null, claim.id, claim.company_id)}>
                      <button type="submit"
                        style={{ background: COLORS.green, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Approve
                      </button>
                    </form>
                    <form action={rejectClaim.bind(null, claim.id)}>
                      <button type="submit"
                        style={{ background: 'transparent', color: COLORS.danger, border: `1px solid ${COLORS.danger}`, borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Reject
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {totalPending === 0 && (
          <div style={{ backgroundColor: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 32, textAlign: 'center', color: COLORS.muted }}>
            Nothing pending review right now.
          </div>
        )}

        {pendingBySection.map((section) =>
          section.items.length > 0 ? (
            <div key={section.table} style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: COLORS.text, marginBottom: 8 }}>
                {section.label} ({section.items.length})
              </h2>
              <div style={{ backgroundColor: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: 'hidden' }}>
                {section.items.map((item: { id: string; [key: string]: string | null }, idx: number) => (
                  <div
                    key={item.id}
                    style={{
                      padding: 16,
                      borderBottom: idx < section.items.length - 1 ? `1px solid ${COLORS.border}` : 'none',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 16,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: COLORS.text, fontSize: 14, fontWeight: 600, margin: 0 }}>
                        {item[section.titleField]}
                      </p>
                      <p style={{ color: COLORS.muted, fontSize: 12, margin: '4px 0 0' }}>
                        {section.subtitleFields.map((f) => item[f]).filter(Boolean).join(' · ')}
                      </p>
                      {item.contact_email && (
                        <p style={{ color: COLORS.muted, fontSize: 12, margin: '2px 0 0' }}>{item.contact_email}</p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <Link
                        href={`/roodber8/${section.adminPath}/${item.id}`}
                        style={{ background: 'transparent', color: COLORS.muted, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}
                      >
                        View
                      </Link>
                      <form action={approveListing.bind(null, section.table, item.id)}>
                        <button type="submit" style={{ background: COLORS.green, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          Approve
                        </button>
                      </form>
                      <form action={rejectListing.bind(null, section.table, item.id)}>
                        <button type="submit" style={{ background: 'transparent', color: COLORS.danger, border: `1px solid ${COLORS.danger}`, borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          Reject
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null
        )}
      </div>
    </div>
  )
}
