export const dynamic = 'force-dynamic'
import { cookies } from 'next/headers'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/admin-auth'
import { redirect } from 'next/navigation'
import { approveClaim, rejectClaim } from '@/app/roodber8/review/actions'
import { createClient } from '@supabase/supabase-js'
import { unstable_noStore as noStore } from 'next/cache'
import Link from 'next/link'

const C = {
  bg: '#080d1a', panel: '#0d1424', border: '#1a2238',
  text: '#ffffff', muted: '#94a3b8', faint: '#475569',
  green: '#1C7C4C', gold: '#B8862E', goldSoft: 'rgba(184,138,46,0.12)',
  danger: '#ef4444', blue: '#3b82f6', blueSoft: 'rgba(59,130,246,0.12)',
}

export default async function AdminClaimsPage() {
  noStore()
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!verifySessionToken(token)) redirect('/roodber8-login')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

  const { data: claims } = await supabase
    .from('business_claims')
    .select('id, company_id, claimant_name, claimant_email, claimant_phone, relationship, status, created_at, ip_address, companies(company_name, trading_address_city, address, country, phone, website, source, google_place_id)')
    .order('created_at', { ascending: false })
    .limit(100)

  const all = claims ?? []
  const pending = all.filter(c => c.status === 'verified')

  function getCompany(claim: Record<string, unknown>) {
    const co = claim.companies
    if (!co) return null
    return Array.isArray(co) ? co[0] : co as Record<string, unknown>
  }

  return (
    <div style={{ padding: 32, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <Link href='/roodber8' style={{ color: C.faint, fontSize: 12, textDecoration: 'none' }}>← Command Centre</Link>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: '8px 0 4px' }}>Business Claims</h1>
        <p style={{ fontSize: 13, color: C.faint, margin: 0 }}>{pending.length} awaiting approval · {all.length} total</p>
      </div>

      {pending.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: C.gold, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Awaiting Approval ({pending.length})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {pending.map((claim) => {
              const co = getCompany(claim as Record<string, unknown>)
              return (
                <div key={claim.id} style={{ background: C.panel, border: `1px solid ${C.gold}`, borderRadius: 14, overflow: 'hidden' }}>
                  {/* Header */}
                  <div style={{ padding: '16px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: 11, color: C.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>Claim Request — Awaiting Approval</p>
                      <p style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: 0 }}>{co?.company_name as string ?? 'Unknown business'}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <form action={approveClaim.bind(null, claim.id, claim.company_id)}>
                        <button type='submit' style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Approve</button>
                      </form>
                      <form action={rejectClaim.bind(null, claim.id)}>
                        <button type='submit' style={{ background: 'transparent', color: C.danger, border: `1px solid ${C.danger}`, borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Reject</button>
                      </form>
                    </div>
                  </div>
                  {/* Two column grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                    {/* Claimant details */}
                    <div style={{ padding: '20px 24px', borderRight: `1px solid ${C.border}` }}>
                      <p style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>Claimant Information</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div>
                          <p style={{ fontSize: 10, color: C.faint, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Full name</p>
                          <p style={{ fontSize: 13, color: C.text, margin: 0, fontWeight: 600 }}>{claim.claimant_name}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: 10, color: C.faint, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Email address</p>
                          <p style={{ fontSize: 13, color: C.blue, margin: 0 }}>{claim.claimant_email}</p>
                        </div>
                        {claim.claimant_phone && (
                          <div>
                            <p style={{ fontSize: 10, color: C.faint, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Phone</p>
                            <p style={{ fontSize: 13, color: C.text, margin: 0 }}>{claim.claimant_phone}</p>
                          </div>
                        )}
                        <div>
                          <p style={{ fontSize: 10, color: C.faint, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Relationship to business</p>
                          <p style={{ fontSize: 13, color: C.text, margin: 0, fontWeight: 600 }}>{(claim as Record<string, unknown>).relationship as string || 'Not provided'}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: 10, color: C.faint, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Submitted</p>
                          <p style={{ fontSize: 13, color: C.text, margin: 0 }}>{new Date(claim.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: 10, color: C.faint, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>IP address</p>
                          <p style={{ fontSize: 13, color: C.faint, margin: 0 }}>{claim.ip_address || 'Unknown'}</p>
                        </div>
                      </div>
                    </div>
                    {/* Business details */}
                    <div style={{ padding: '20px 24px' }}>
                      <p style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 12px' }}>Business Information (from {co?.source === 'admin_import' ? 'Google' : 'User submission'})</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {co?.address && (
                          <div>
                            <p style={{ fontSize: 10, color: C.faint, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Address</p>
                            <p style={{ fontSize: 13, color: C.text, margin: 0 }}>{co.address as string}</p>
                          </div>
                        )}
                        {co?.trading_address_city && (
                          <div>
                            <p style={{ fontSize: 10, color: C.faint, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>City</p>
                            <p style={{ fontSize: 13, color: C.text, margin: 0 }}>{co.trading_address_city as string}</p>
                          </div>
                        )}
                        {co?.phone && (
                          <div>
                            <p style={{ fontSize: 10, color: C.faint, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Business phone (verified source)</p>
                            <p style={{ fontSize: 13, color: C.green, margin: 0, fontWeight: 600 }}>{co.phone as string}</p>
                          </div>
                        )}
                        {co?.website && (
                          <div>
                            <p style={{ fontSize: 10, color: C.faint, margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Business website (verified source)</p>
                            <a href={co.website as string} target='_blank' rel='noopener noreferrer' style={{ fontSize: 13, color: C.blue, margin: 0, textDecoration: 'none' }}>{(co.website as string).replace(/^https?:\/\//, '')}</a>
                          </div>
                        )}
                      </div>
                      <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Link href={`/roodber8/businesses/${claim.company_id}`} style={{ fontSize: 12, color: C.text, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 12px', textDecoration: 'none', fontWeight: 600 }}>
                          View in admin →
                        </Link>
                        <a href={`/business/${claim.company_id}`} target='_blank' style={{ fontSize: 12, color: C.muted, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 12px', textDecoration: 'none' }}>
                          View public listing ↗
                        </a>
                        {co?.google_place_id && (
                          <a href={`https://www.google.com/maps/place/?q=place_id:${co.google_place_id as string}`} target='_blank' style={{ fontSize: 12, color: C.muted, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 12px', textDecoration: 'none' }}>
                            View on Google Maps ↗
                          </a>
                        )}
                      </div>
                      <div style={{ marginTop: 16, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: '10px 14px' }}>
                        <p style={{ fontSize: 11, color: C.blue, fontWeight: 700, margin: '0 0 4px' }}>Verification guidance</p>
                        <p style={{ fontSize: 11, color: C.muted, margin: 0, lineHeight: 1.5 }}>Check if claimant email matches the business website domain. If not, call the business on the verified phone number above to confirm ownership before approving.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>All Claims ({all.length})</h2>
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
          {all.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: C.faint, fontSize: 13 }}>No claims yet.</div>
          ) : all.map((claim, idx) => {
            const co = getCompany(claim as Record<string, unknown>)
            return (
              <div key={claim.id} style={{ padding: '14px 20px', borderBottom: idx < all.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>{co?.company_name as string ?? 'Unknown'}</p>
                  <p style={{ fontSize: 11, color: C.faint, margin: '2px 0 0' }}>
                    {claim.claimant_name} · {claim.claimant_email} · {(claim as Record<string, unknown>).relationship as string || 'No relationship stated'} · {new Date(claim.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 20, color: claim.status === 'approved' ? C.green : claim.status === 'rejected' ? C.danger : C.gold, background: claim.status === 'approved' ? 'rgba(28,124,76,0.12)' : claim.status === 'rejected' ? 'rgba(239,68,68,0.12)' : C.goldSoft }}>{claim.status}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
