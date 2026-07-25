import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ADMIN_EMAIL = 'info@accountingbody.com'

const SECTIONS: { table: string; label: string; timeCol: string }[] = [
  { table: 'companies', label: 'Businesses', timeCol: 'first_seen_at' },
  { table: 'jobs', label: 'Jobs', timeCol: 'created_at' },
  { table: 'housing', label: 'Housing', timeCol: 'created_at' },
  { table: 'money', label: 'Money', timeCol: 'created_at' },
  { table: 'cars', label: 'Cars', timeCol: 'created_at' },
  { table: 'tutors', label: 'Tutors', timeCol: 'created_at' },
  { table: 'community', label: 'Community', timeCol: 'created_at' },
  { table: 'events', label: 'Events', timeCol: 'created_at' },
]

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== 'Bearer ' + process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const rows: { label: string; pending: number; newToday: number }[] = []
  for (const s of SECTIONS) {
    const { count: pending } = await supabase
      .from(s.table)
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
    const { count: newToday } = await supabase
      .from(s.table)
      .select('id', { count: 'exact', head: true })
      .gte(s.timeCol, since)
    rows.push({ label: s.label, pending: pending ?? 0, newToday: newToday ?? 0 })
  }

  const { count: claims } = await supabase
    .from('business_claims')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'verified')

  const { count: failedImports } = await supabase
    .from('import_log')
    .select('google_place_id', { count: 'exact', head: true })
    .eq('status', 'failed')
    .gte('imported_at', since)

  const totalPending = rows.reduce((sum, r) => sum + r.pending, 0)
  const totalNew = rows.reduce((sum, r) => sum + r.newToday, 0)
  const claimCount = claims ?? 0
  const failCount = failedImports ?? 0

  // Nothing to report — stay silent so the email means something when it arrives
  if (totalPending === 0 && totalNew === 0 && claimCount === 0 && failCount === 0) {
    return NextResponse.json({ sent: false, reason: 'nothing to report' })
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hagerland-platform.vercel.app'
  const GREEN = '#1C7C4C'
  const sectionRows = rows
    .filter((r) => r.pending > 0 || r.newToday > 0)
    .map(
      (r) =>
        '<tr><td style="padding:8px 0;color:#152238;font-size:14px;">' + r.label + '</td>' +
        '<td style="padding:8px 0;color:' + (r.pending > 0 ? '#B8862E' : '#9ca3af') + ';font-size:14px;text-align:right;font-weight:' + (r.pending > 0 ? '700' : '400') + ';">' + r.pending + ' pending</td>' +
        '<td style="padding:8px 0;color:#6B7280;font-size:14px;text-align:right;">' + r.newToday + ' new</td></tr>'
    )
    .join('')

  const extras: string[] = []
  if (claimCount > 0) extras.push('<strong style="color:#B8862E;">' + claimCount + ' ownership claim' + (claimCount !== 1 ? 's' : '') + '</strong> awaiting your decision')
  if (failCount > 0) extras.push('<strong style="color:#ef4444;">' + failCount + ' failed import' + (failCount !== 1 ? 's' : '') + '</strong> in the last 24 hours')
  const extrasHtml = extras.length > 0 ? '<p style="margin:16px 0 0;font-size:14px;color:#6B7280;line-height:1.6;">' + extras.join('<br>') + '</p>' : ''

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'HagerLand <info@accountingbody.com>',
      to: ADMIN_EMAIL,
      subject: 'HagerLand daily digest — ' + totalPending + ' pending, ' + totalNew + ' new' + (claimCount > 0 ? ', ' + claimCount + ' claims' : ''),
      html:
        '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>' +
        '<body style="margin:0;padding:0;background:#f4f5f3;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;">' +
        '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f3;padding:40px 16px;"><tr><td align="center">' +
        '<table width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">' +
        '<tr><td style="background:' + GREEN + ';border-radius:16px 16px 0 0;padding:32px 40px;">' +
        '<p style="margin:0 0 4px;color:rgba(255,255,255,0.6);font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;">HagerLand Admin</p>' +
        '<p style="margin:0;color:#fff;font-size:22px;font-weight:700;">Daily digest</p></td></tr>' +
        '<tr><td style="background:#ffffff;padding:40px;border-left:1px solid #e4e6e3;border-right:1px solid #e4e6e3;">' +
        '<table width="100%" cellpadding="0" cellspacing="0">' + sectionRows + '</table>' +
        extrasHtml +
        '<p style="margin:28px 0 0;"><a href="' + baseUrl + '/roodber8/review" style="display:inline-block;background:' + GREEN + ';color:#ffffff;font-weight:700;font-size:14px;padding:14px 32px;border-radius:100px;text-decoration:none;">Open review queue</a></p>' +
        '</td></tr>' +
        '<tr><td style="background:#f4f5f3;border-radius:0 0 16px 16px;padding:24px 40px;border:1px solid #e4e6e3;border-top:none;">' +
        '<p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">Sent daily at 8am UTC when there is something to report.</p>' +
        '</td></tr></table></td></tr></table></body></html>',
    })
  } catch (err) {
    console.error('admin-digest email failed:', err)
    return NextResponse.json({ sent: false, error: 'email failed' }, { status: 500 })
  }

  return NextResponse.json({ sent: true, totalPending, totalNew, claims: claimCount, failedImports: failCount })
}
