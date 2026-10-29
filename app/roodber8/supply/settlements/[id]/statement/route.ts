import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { isAdminRequest } from '@/lib/admin-auth'
import { audit, isOwnerSession } from '@/lib/admin/guard'
import { statementData } from '@/lib/supply/settlements-data'
import { buildStatement, statementHtml } from '@/lib/supply/settlements'

export const dynamic = 'force-dynamic'

/**
 * S6-3: a partner's statement (owner only), a plain printable page in AB's approved wording; ?download=1 saves it as a
 * file. It holds HagerLand's supply order references and what HagerLand pays the partner, nothing about customers.
 */
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!(await isAdminRequest()) || !(await isOwnerSession())) return new NextResponse('Unauthorized', { status: 401 })
  const { id } = await props.params
  if (!z.uuid().safeParse(id).success) return new NextResponse('Not found', { status: 404 })
  const data = await statementData(id)
  if (!data) return new NextResponse('Not found', { status: 404 })
  const download = request.nextUrl.searchParams.get('download') === '1'
  await audit('supply.settlement.statement', { type: 'partner_settlement', id, label: data.reference }, { download })
  return new NextResponse(statementHtml(buildStatement(data)), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      ...(download ? { 'Content-Disposition': `attachment; filename="hagerland-supply-statement-${data.reference}.html"` } : {}),
    },
  })
}
