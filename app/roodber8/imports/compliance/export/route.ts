import { NextResponse, type NextRequest } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { audit, isOwnerSession } from '@/lib/admin/guard'
import { toCsv } from '@/lib/admin/csv'
import { loadImported } from '@/lib/imports/compliance-data'
import { STATE_LABEL, type ComplianceState } from '@/lib/imports/compliance'

export const dynamic = 'force-dynamic'

/**
 * Imports compliance list as CSV: owner only, recorded in the audit log. Never exports Google's content: a name
 * appears only when it is HagerLand's own (confirmed, edited, or the lead placeholder).
 */
export async function GET(request: NextRequest) {
  if (!(await isAdminRequest()) || !(await isOwnerSession())) return new NextResponse('Unauthorized', { status: 401 })
  const sp = request.nextUrl.searchParams
  const state = sp.get('state') as ComplianceState | null
  const vis = sp.get('vis')
  const rows = (await loadImported())
    .filter((r) => (!state || r.c.state === state) && (!vis || (vis === 'public') === r.c.isPublic))
    .map((r) => {
      const nameFromGoogle = r.sources.some((s) => s.field === 'name' && s.source === 'google_places' && !s.clearedAt)
      return {
        organisation_id: r.id,
        name: nameFromGoogle ? '(from Google, not exported)' : r.name,
        visibility: r.c.isPublic ? 'public' : 'private',
        claimed: r.claimed ? 'yes' : 'no',
        supply_partner: r.supplyPartner ? 'yes' : 'no',
        state: STATE_LABEL[r.c.state],
        days_left: r.c.daysLeft ?? '',
        google_fields: r.c.googleFields.join(' '),
        would_be_cleared: r.c.plan.fields.join(' '),
        clean_up_action: r.c.plan.action,
        google_place_id: r.placeId ?? '',
        imported_on: r.importedAt.slice(0, 10),
      }
    })
  await audit('imports.compliance_export', { type: 'imports' }, { rows: rows.length, state, vis })
  return new NextResponse(toCsv(rows), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="imports-compliance.csv"', 'Cache-Control': 'no-store' } })
}
