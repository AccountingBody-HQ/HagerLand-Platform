import { NextResponse, type NextRequest } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { audit, isOwnerSession } from '@/lib/admin/guard'
import { toCsv } from '@/lib/admin/csv'
import { jobsInsights } from '@/lib/jobs-insights-data'
import { jobsFeeReport } from '@/lib/jobs-fee-report-data'
import { isJobsCsvTable, jobsInsightsCsv } from '@/lib/jobs-insights-csv'
import { feeCsv, isFeeCsvTable } from '@/lib/jobs-fee-csv'
import { monthRange } from '@/lib/jobs-insights'

export const dynamic = 'force-dynamic'

/** One table of the monthly Jobs report as CSV: owner only, recorded in the audit log. */
export async function GET(request: NextRequest) {
  if (!(await isAdminRequest()) || !(await isOwnerSession())) return new NextResponse('Unauthorized', { status: 401 })
  const sp = request.nextUrl.searchParams
  const range = monthRange(sp.get('month'))
  const table = sp.get('table')
  let rows: Record<string, unknown>[]
  if (isFeeCsvTable(table)) rows = feeCsv(table, await jobsFeeReport(range), range.asOf)
  else if (isJobsCsvTable(table)) rows = jobsInsightsCsv(table, await jobsInsights(range.startTs, range.nextTs))
  else return new NextResponse('Unknown table', { status: 400 })
  await audit('jobs.report.export', { type: 'jobs_report', label: `${range.month} ${table}` }, { month: range.month, table, rows: rows.length })
  return new NextResponse(toCsv(rows), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="jobs-report-${range.month}-${table}.csv"` } })
}
