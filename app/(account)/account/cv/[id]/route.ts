import { NextResponse, type NextRequest } from 'next/server'
import { getUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { signedDocumentUrl } from '@/lib/storage'

export const dynamic = 'force-dynamic'

/**
 * Opens a CV through a 10-minute private link (spec 24.9: CVs are never public).
 * "profile" is the signed-in candidate's own CV; otherwise the id is an application, which only the
 * applicant and the employer's members can read (row level security decides).
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUser()
  if (!user) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(request.nextUrl.pathname)}`, request.url))
  const supabase = getServerSupabase()
  let path: string | null = null
  let name = 'cv'
  if (params.id === 'profile') {
    const { data } = await supabase.from('candidate_profiles').select('cv_path, full_name').eq('user_id', user.id).maybeSingle()
    path = data?.cv_path ?? null
    name = data?.full_name ?? name
  } else if (/^[0-9a-f-]{36}$/.test(params.id)) {
    const { data } = await supabase.from('job_applications').select('id, cv_path, name, status, applicant_user_id').eq('id', params.id).maybeSingle()
    path = data?.cv_path ?? null
    name = data?.name ?? name
    // The employer opening a new application marks it as viewed.
    if (data && data.applicant_user_id !== user.id && data.status === 'submitted') await supabase.from('job_applications').update({ status: 'viewed' }).eq('id', data.id)
  }
  if (!path) return new NextResponse('Not found', { status: 404 })
  const ext = path.endsWith('.docx') ? 'docx' : 'pdf'
  const url = await signedDocumentUrl(path, `CV - ${name.replace(/[^A-Za-z0-9\u1200-\u137F .-]/g, '').slice(0, 60)}.${ext}`)
  if (!url) return new NextResponse('The CV is not available right now.', { status: 503 })
  return NextResponse.redirect(url, { headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } })
}
