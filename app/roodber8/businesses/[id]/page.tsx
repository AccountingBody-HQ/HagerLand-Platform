export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'
import { unstable_noStore as noStore } from 'next/cache'
import { redirect, notFound } from 'next/navigation'
import { approveListing, rejectListing, deleteListing, deactivateListing } from '@/app/roodber8/review/actions'
import Link from 'next/link'

const C = {
  bg: '#080d1a', panel: '#0d1424', border: '#1a2238',
  text: '#ffffff', muted: '#94a3b8', faint: '#475569',
  green: '#1C7C4C', gold: '#B8862E', goldSoft: 'rgba(184,138,46,0.12)',
  danger: '#ef4444', blue: '#3b82f6',
}

export default async function AdminBusinessDetailPage({ params }: { params: { id: string } }) {
  noStore()
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!verifySessionToken(token)) redirect('/roodber8-login')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

  const { data: b, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !b) notFound()

  const statusColor = b.status === 'active' ? C.green : b.status === 'pending' ? C.gold : b.status === 'pending_verification' ? C.blue : C.danger
  const statusLabel = b.status === 'active' ? 'Active' : b.status === 'pending' ? 'Pending Review' : b.status === 'pending_verification' ? 'Awaiting Email Verification' : 'Rejected'

  function Field({ label, value }: { label: string; value: string | null | undefined }) {
    return (
      <div style={{ padding: '12px 0', borderBottom: `1px solid ${C.border}` }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: C.faint, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>{label}</p>
        <p style={{ fontSize: 14, color: value ? C.text : C.faint, margin: 0 }}>{value || '—'}</p>
      </div>
    )
  }

  return (
    <div style={{ padding: 32, maxWidth: 800, margin: '0 auto' }}>

      {/* Breadcrumb */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link href='/roodber8/businesses' style={{ color: C.faint, fontSize: 13, textDecoration: 'none' }}>← Businesses</Link>
      </div>

      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: '0 0 8px' }}>{b.company_name}</h1>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', padding: '4px 10px', borderRadius: 20, color: statusColor, background: `${statusColor}20` }}>{statusLabel}</span>
        </div>
        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {b.status === 'pending' && (
            <>
              <form action={approveListing.bind(null, 'companies', b.id)}>
                <button type='submit' style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Approve</button>
              </form>
              <form action={rejectListing.bind(null, 'companies', b.id)}>
                <button type='submit' style={{ background: 'transparent', color: C.danger, border: `1px solid ${C.danger}`, borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Reject</button>
              </form>
            </>
          )}
          {b.status === 'active' && (
            <form action={deactivateListing.bind(null, 'companies', b.id)}>
              <button type='submit' style={{ background: C.goldSoft, color: C.gold, border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Deactivate</button>
            </form>
          )}
          <form action={deleteListing.bind(null, 'companies', b.id)}>
            <button type='submit' style={{ background: 'rgba(239,68,68,0.1)', color: C.danger, border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
          </form>
          {b.website && (
            <a href={b.website} target='_blank' rel='noopener noreferrer' style={{ background: `${C.blue}15`, color: C.blue, border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>Visit Website ↗</a>
          )}
        </div>
      </div>

      {/* Details grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Business info */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px' }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Business Details</h2>
          <Field label='Business name' value={b.company_name} />
          <Field label='Category' value={b.sic_description} />
          <Field label='City' value={b.trading_address_city} />
          <Field label='Phone' value={b.phone} />
          <Field label='Website' value={b.website} />
          <Field label='Company number' value={b.company_number} />
        </div>

        {/* Submission info */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px' }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Submission Info</h2>
          <Field label='Submitted by' value={b.submitter_name} />
          <Field label='Contact email' value={b.contact_email} />
          <Field label='Submitted' value={b.first_seen_at ? new Date(b.first_seen_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'} />
          <Field label='Email verified' value={b.email_verified_at ? new Date(b.email_verified_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not yet verified'} />
          <Field label='Verified listing' value={b.is_verified ? 'Yes' : 'No'} />
          <Field label='Status' value={statusLabel} />
        </div>
      </div>

      {/* Contact actions */}
      {b.contact_email && (
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px' }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact</h2>
          <div style={{ display: 'flex', gap: 12 }}>
            <a href={`mailto:${b.contact_email}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${C.blue}15`, color: C.blue, borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              ✉ Email submitter
            </a>
            {b.phone && (
              <a href={`tel:${b.phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${C.green}15`, color: C.green, borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                ✆ Call
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}