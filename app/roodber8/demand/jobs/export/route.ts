import { NextResponse, type NextRequest } from 'next/server'
import { assertAdmin, audit } from '@/lib/admin/guard'
import { toCsv } from '@/lib/admin/csv'
import { jobsInsights } from '@/lib/jobs-insights-data'
import { isJobsCsvTable, jobsInsightsCsv } from '@/lib/jobs-insights-csv'
import { periodDays, periodSince } from '@/lib/jobs-insights'

/** Admin area this route belongs to (staff roles are checked against it, spec 26.15). */
const AREA = '/roodber8/demand/jobs'

export const dynamic = 'force-dynamic'

/** One table of Insights → Demand → Jobs as CSV (Owner and Operations): counts only, recorded in the audit log. */
export async function GET(request: NextRequest) {
  try {
    await assertAdmin(AREA)
  } catch {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  const sp = request.nextUrl.searchParams
  const table = sp.get('table')
  if (!isJobsCsvTable(table)) return new NextResponse('Unknown table', { status: 400 })
  const days = periodDays(sp.get('days') ?? undefined)
  const rows = jobsInsightsCsv(table, await jobsInsights(periodSince(days), null))
  await audit('jobs.insights.export', { type: 'jobs_insights', label: `${days} days ${table}` }, { days, table, rows: rows.length })
  return new NextResponse(toCsv(rows), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="jobs-insights-${days}-days-${table}.csv"` } })
}
