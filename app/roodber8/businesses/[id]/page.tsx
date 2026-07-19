export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/admin-auth'
import { createClient } from '@supabase/supabase-js'
import { unstable_noStore as noStore } from 'next/cache'
import { redirect, notFound } from 'next/navigation'
import { approveListing, rejectListing, deleteListing, deactivateListing, updateCompany } from '@/app/roodber8/review/actions'
import Link from 'next/link'

const C = {
  bg: '#080d1a', panel: '#0d1424', border: '#1a2238',
  text: '#ffffff', muted: '#94a3b8', faint: '#475569',
  green: '#1C7C4C', gold: '#B8862E', goldSoft: 'rgba(184,138,46,0.12)',
  danger: '#ef4444', blue: '#3b82f6',
}

const inp: React.CSSProperties = {
  width: '100%', backgroundColor: '#111827', border: '1px solid #1a2238',
  borderRadius: 8, padding: '10px 12px', color: '#ffffff', fontSize: 13,
  outline: 'none', boxSizing: 'border-box', marginTop: 6,
}

export default async function AdminBusinessDetailPage({ params, searchParams }: { params: { id: string }; searchParams: { saved?: string } }) {
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

  return (
    <div style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>

      {/* Breadcrumb */}
      <div style={{ marginBottom: 24 }}>
        <Link href='/roodber8/businesses' style={{ color: C.faint, fontSize: 13, textDecoration: 'none' }}>← All Businesses</Link>
      </div>

      {searchParams.saved && (
        <div style={{ background: 'rgba(28,124,76,0.12)', border: '1px solid rgba(28,124,76,0.3)', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: C.green, fontSize: 13, fontWeight: 600 }}>
          ✓ Changes saved successfully.
        </div>
      )}

      {/* Pending changes diff panel */}
      {b.pending_changes && Object.keys(b.pending_changes).length > 0 && (
        <div style={{ background: 'rgba(184,138,46,0.08)', border: '1px solid rgba(184,138,46,0.3)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ background: C.gold, color: '#000', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 100, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Changes pending review</span>
            <span style={{ color: C.muted, fontSize: 12 }}>The business submitted edits — review below before approving</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', color: C.faint, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 12px 10px 0', width: '20%' }}>Field</th>
                <th style={{ textAlign: 'left', color: C.faint, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 12px 10px', width: '40%' }}>Current (live)</th>
                <th style={{ textAlign: 'left', color: C.faint, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '0 0 10px', width: '40%' }}>Proposed (new)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(b.pending_changes as Record<string, { old: string | null, new: string | null }>).map(([field, values]) => (
                <tr key={field} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: '10px 12px 10px 0', color: C.muted, fontWeight: 600, textTransform: 'capitalize' }}>
                    {field.replace(/_/g, ' ').replace('sic description', 'category').replace('trading address city', 'city')}
                  </td>
                  <td style={{ padding: '10px 12px', color: C.muted, background: 'rgba(239,68,68,0.05)', borderRadius: 4 }}>
                    {values.old || <span style={{ color: C.faint, fontStyle: 'italic' }}>empty</span>}
                  </td>
                  <td style={{ padding: '10px 0', color: '#4ade80', fontWeight: 600, background: 'rgba(74,222,128,0.05)', borderRadius: 4, paddingLeft: 12 }}>
                    {values.new || <span style={{ color: C.faint, fontStyle: 'italic' }}>empty</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, margin: '0 0 8px' }}>{b.company_name}</h1>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', padding: '4px 10px', borderRadius: 20, color: statusColor, background: `${statusColor}20` }}>{statusLabel}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {b.status === 'pending' && (
            <>
              <form action={approveListing.bind(null, 'companies', b.id)}>
                <button type='submit' style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>✓ Approve</button>
              </form>
              <form action={rejectListing.bind(null, 'companies', b.id)}>
                <button type='submit' style={{ background: 'transparent', color: C.danger, border: `1px solid ${C.danger}`, borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>✕ Reject</button>
              </form>
            </>
          )}
          {b.status === 'active' && (
            <form action={deactivateListing.bind(null, 'companies', b.id)}>
              <button type='submit' style={{ background: C.goldSoft, color: C.gold, border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Deactivate</button>
            </form>
          )}
          {b.status === 'rejected' && (
            <form action={approveListing.bind(null, 'companies', b.id)}>
              <button type='submit' style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Re-approve</button>
            </form>
          )}
          <form action={deleteListing.bind(null, 'companies', b.id)}>
            <button type='submit' style={{ background: 'rgba(239,68,68,0.1)', color: C.danger, border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
          </form>
          {b.website && (
            <a href={b.website.startsWith('http') ? b.website : 'https://' + b.website} target='_blank' rel='noopener noreferrer'
              style={{ background: `${C.blue}15`, color: C.blue, borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
              Visit Website ↗
            </a>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Submission info — read only */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px' }}>
          <h2 style={{ fontSize: 12, fontWeight: 700, color: C.faint, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>Submission Info</h2>
          {[
            { label: 'About / Description', value: b.ai_description },
            { label: 'Submitted by', value: b.submitter_name },
            { label: 'Contact email', value: b.contact_email },
            { label: 'Submitted', value: b.first_seen_at ? new Date(b.first_seen_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
            { label: 'Email verified', value: b.email_verified_at ? new Date(b.email_verified_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Not yet verified' },
            { label: 'Verified listing', value: b.is_verified ? '✓ Yes' : 'No' },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: C.faint, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 3px' }}>{label}</p>
              <p style={{ fontSize: 13, color: value ? C.text : C.faint, margin: 0 }}>{value || '—'}</p>
            </div>
          ))}
          {b.contact_email && (
            <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
              <a href={`mailto:${b.contact_email}`} style={{ fontSize: 12, fontWeight: 600, color: C.blue, background: `${C.blue}15`, padding: '6px 12px', borderRadius: 6, textDecoration: 'none' }}>✉ Email</a>
              {b.phone && <a href={`tel:${b.phone}`} style={{ fontSize: 12, fontWeight: 600, color: C.green, background: `${C.green}15`, padding: '6px 12px', borderRadius: 6, textDecoration: 'none' }}>✆ Call</a>}
            </div>
          )}
        </div>

        {/* Edit form */}
        <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 14, padding: '20px 24px' }}>
          <h2 style={{ fontSize: 12, fontWeight: 700, color: C.faint, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 16px' }}>Edit Business Details</h2>
          <form action={async (fd: FormData) => {
            'use server'
            await updateCompany(b.id, {
              company_name:         fd.get('company_name') as string,
              ai_description:       (fd.get('ai_description') as string) || null,
              trading_address_city: fd.get('trading_address_city') as string,
              phone: fd.get('phone') as string,
              website: fd.get('website') as string,
              sic_description: fd.get('sic_description') as string,
              submitter_name: fd.get('submitter_name') as string,
            })
            redirect(`/roodber8/businesses/${b.id}?saved=1`)
          }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.faint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>About / Description</label>
              <textarea name='ai_description' defaultValue={b.ai_description ?? ''} rows={3} style={{ ...inp, resize: 'none' }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.faint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Business name</label>
              <input name='company_name' defaultValue={b.company_name ?? ''} style={inp} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.faint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</label>
              <input name='sic_description' defaultValue={b.sic_description ?? ''} style={inp} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.faint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>City</label>
              <input name='trading_address_city' defaultValue={b.trading_address_city ?? ''} style={inp} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.faint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</label>
              <input name='phone' defaultValue={b.phone ?? ''} style={inp} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.faint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Website</label>
              <input name='website' defaultValue={b.website ?? ''} style={inp} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.faint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Submitted by</label>
              <input name='submitter_name' defaultValue={b.submitter_name ?? ''} style={inp} />
            </div>
            <button type='submit' style={{ width: '100%', background: C.green, color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Save Changes
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}