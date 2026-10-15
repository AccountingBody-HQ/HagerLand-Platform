import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { getUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { signedDocumentUrl } from '@/lib/storage'

export const dynamic = 'force-dynamic'

/** Lets a signed-in customer download the quote PDF for their own quote request (row security checks ownership). */
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  if (!z.uuid().safeParse(params.id).success) return new NextResponse('Not found', { status: 404 })
  const user = await getUser()
  if (!user) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent('/account/quotes')}`, request.url))
  const { data } = await getServerSupabase().from('quote_requests').select('reference, quote_document_path').eq('id', params.id).eq('requester_user_id', user.id).maybeSingle()
  if (!data?.quote_document_path) return new NextResponse('Not found', { status: 404 })
  const url = await signedDocumentUrl(data.quote_document_path, `HagerLand-quote-${data.reference}.${data.quote_document_path.split('.').pop() ?? 'pdf'}`)
  if (!url) return new NextResponse('Unavailable, please try again', { status: 503 })
  return NextResponse.redirect(url, { headers: { 'Cache-Control': 'no-store' } })
}
