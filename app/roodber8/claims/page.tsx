export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import { approveClaim, rejectClaim } from '@/app/roodber8/review/actions'
import Link from 'next/link'

const C = {
  bg: '#080d1a', panel: '#0d1424', border: '#1a2238',
  text: '#ffffff', muted: '#94a3b8', faint: '#475569',
  green: '#1C7C4C', gold: '#B8862E', goldSoft: 'rgba(184,138,46,0.12)',
  danger: '#ef4444',
}

export default async function AdminClaimsPage() {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!verifySessionToken(token)) redirect('/roodber8-login')

  const { data: claims } = await supabaseAdmin
    .from('business_claims')
    .select('id, company_id, claimant_name, claimant_email, status, created_at, companies(company_name)')
    .order('created_at', { ascending: false })
    .limit(100)

  const all = claims ?? []
  const pending = all.filter(c => c.status === 'verified')

  return (
    <div style={{ padding: 32, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <Link href='/roodber8' style={{ color: C.faint, fontSize: 12, textDecoration: 'none' }}>← Command Centre</Link>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: '8px 0 4px' }}>Business Claims</h1>
        <p style={{ fontSize: 13, color: C.faint, margin: 0 }}>{pending.length} awaiting approval · {all.length} total</p>
      </div>

      {pending.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: C.gold, marginBottom: 12 }}>Awaiting Approval ({pending.length})</h2>
          <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
            {pending.map((claim, idx) => (
              <div key={claim.id} style={{ padding: '14px 20px', borderBottom: idx < pending.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>
                    {(Array.isArray(claim.companies) ? claim.companies[0]?.company_name : (claim.companies as { company_name: string } | null)?.company_name) ?? 'Unknown business'}
                  </p>
                  <p style={{ fontSize: 11, color: C.faint, margin: '2px 0 0' }}>{claim.claimant_name} · {claim.claimant_email}</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <form action={approveClaim.bind(null, claim.id, claim.company_id)}>
                    <button type='submit' style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Approve</button>
                  </form>
                  <form action={rejectClaim.bind(null, claim.id)}>
                    <button type='submit' style={{ background: 'transparent', color: C.danger, border: `1px solid ${C.danger}`, borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Reject</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 12 }}>All Claims ({all.length})</h2>
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden' }}>
          {all.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: C.faint, fontSize: 13 }}>No claims yet.</div>
          ) : all.map((claim, idx) => (
            <div key={claim.id} style={{ padding: '13px 20px', borderBottom: idx < all.length - 1 ? `1px solid ${C.border}` : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: 0 }}>
                  {(Array.isArray(claim.companies) ? claim.companies[0]?.company_name : (claim.companies as { company_name: string } | null)?.company_name) ?? 'Unknown'}
                </p>
                <p style={{ fontSize: 11, color: C.faint, margin: '2px 0 0' }}>{claim.claimant_name} · {claim.claimant_email} · {new Date(claim.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 20, color: C.gold, background: C.goldSoft }}>claim</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}