import { NextResponse, type NextRequest } from 'next/server'
import { getDevelopmentBySlug } from '@/lib/data/developments'
import { signedDocumentUrl } from '@/lib/storage'

/** Brochures live in private storage; published developments get a short-lived download link. */
export async function GET(_request: NextRequest, { params }: { params: { slug: string } }) {
  const d = await getDevelopmentBySlug(params.slug)
  if (!d?.brochure_path) return new NextResponse('Not found', { status: 404 })
  const url = await signedDocumentUrl(d.brochure_path, `${params.slug}-brochure.pdf`)
  if (!url) return new NextResponse('Unavailable', { status: 503 })
  return NextResponse.redirect(url, { headers: { 'Cache-Control': 'no-store' } })
}
