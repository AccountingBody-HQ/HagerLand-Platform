import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { isSupabaseConfigured } from '@/lib/env'

const COOKIE = 'hl_seen'
const schema = z.object({ entity_type: z.enum(['property', 'development', 'product', 'organisation']), id: z.uuid() })

/** Counts a page view once per browser session per record. */
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success || !isSupabaseConfigured()) return new NextResponse(null, { status: 204 })
  const seen = (request.cookies.get(COOKIE)?.value ?? '').split('.').filter(Boolean)
  const key = parsed.data.id.slice(0, 8)
  const res = new NextResponse(null, { status: 204 })
  if (seen.includes(key)) return res
  await getAdminSupabase().rpc('increment_view', { p_entity_type: parsed.data.entity_type, p_id: parsed.data.id })
  res.cookies.set(COOKIE, [key, ...seen].slice(0, 60).join('.'), { httpOnly: true, sameSite: 'lax', secure: true, path: '/' })
  return res
}
