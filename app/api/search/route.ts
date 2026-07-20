export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

import { isRateLimited as checkRateLimit } from '@/lib/rate-limit'

// Relevance scoring: exact > starts-with > word-boundary > contains
function scoreResult(title: string, query: string): number {
  const t = title.toLowerCase()
  const q = query.toLowerCase()
  if (t === q) return 100
  if (t.startsWith(q)) return 80
  if (t.includes(' ' + q)) return 60
  if (t.includes(q)) return 40
  return 20
}

export async function GET(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return NextResponse.json([])

  const { supabase } = await import('@/lib/supabase')

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (await checkRateLimit(ip, 30, 1)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const query = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (query.length < 2) return NextResponse.json([])

  const like = `%${query}%`

  const [businesses, jobs, housing, cars, tutors, community, events, money] =
    await Promise.all([
      supabase
        .from('companies')
        .select('id, company_name, sic_description, trading_address_city')
        .eq('status', 'active')
        .or(`company_name.ilike.${like},sic_description.ilike.${like},trading_address_city.ilike.${like}`)
        .limit(8),
      supabase
        .from('jobs')
        .select('id, title, company_name, location')
        .eq('status', 'active')
        .or(`title.ilike.${like},company_name.ilike.${like},location.ilike.${like}`)
        .limit(8),
      supabase
        .from('housing')
        .select('id, title, listing_type, location')
        .eq('status', 'active')
        .or(`title.ilike.${like},location.ilike.${like}`)
        .limit(8),
      supabase
        .from('cars')
        .select('id, title, listing_type, location')
        .eq('status', 'active')
        .or(`title.ilike.${like},listing_type.ilike.${like},location.ilike.${like}`)
        .limit(8),
      supabase
        .from('tutors')
        .select('id, name, subject, location')
        .eq('status', 'active')
        .or(`name.ilike.${like},subject.ilike.${like},location.ilike.${like}`)
        .limit(8),
      supabase
        .from('community')
        .select('id, name, category, location')
        .eq('status', 'active')
        .or(`name.ilike.${like},category.ilike.${like},location.ilike.${like}`)
        .limit(8),
      supabase
        .from('events')
        .select('id, title, category, location')
        .eq('status', 'active')
        .or(`title.ilike.${like},category.ilike.${like},location.ilike.${like}`)
        .limit(8),
      supabase
        .from('money')
        .select('id, title, service_type, location')
        .eq('status', 'active')
        .or(`title.ilike.${like},service_type.ilike.${like},location.ilike.${like}`)
        .limit(8),
    ])

  const results = [
    ...(businesses.data ?? []).map((b) => ({
      id: b.id,
      type: 'business' as const,
      title: b.company_name,
      subtitle: [b.sic_description, b.trading_address_city].filter(Boolean).join(' · '),
      url: `/business/${b.id}`,
      score: scoreResult(b.company_name, query),
    })),
    ...(jobs.data ?? []).map((j) => ({
      id: j.id,
      type: 'job' as const,
      title: j.title,
      subtitle: [j.company_name, j.location].filter(Boolean).join(' · '),
      url: `/jobs/${j.id}`,
      score: scoreResult(j.title, query),
    })),
    ...(housing.data ?? []).map((h) => ({
      id: h.id,
      type: 'housing' as const,
      title: h.title,
      subtitle: [h.listing_type, h.location].filter(Boolean).join(' · '),
      url: `/housing/${h.id}`,
      score: scoreResult(h.title, query),
    })),
    ...(cars.data ?? []).map((c) => ({
      id: c.id,
      type: 'car' as const,
      title: c.title,
      subtitle: [c.listing_type, c.location].filter(Boolean).join(' · '),
      url: `/cars/${c.id}`,
      score: scoreResult(c.title, query),
    })),
    ...(tutors.data ?? []).map((t) => ({
      id: t.id,
      type: 'tutor' as const,
      title: t.name,
      subtitle: [t.subject, t.location].filter(Boolean).join(' · '),
      url: `/tutors/${t.id}`,
      score: scoreResult(t.name, query),
    })),
    ...(community.data ?? []).map((c) => ({
      id: c.id,
      type: 'community' as const,
      title: c.name,
      subtitle: [c.category, c.location].filter(Boolean).join(' · '),
      url: `/community/${c.id}`,
      score: scoreResult(c.name, query),
    })),
    ...(money.data ?? []).map((m) => ({
      id: m.id,
      type: 'money' as const,
      title: m.title,
      subtitle: [m.service_type, m.location].filter(Boolean).join(' · '),
      url: `/money/${m.id}`,
      score: scoreResult(m.title, query),
    })),
    ...(events.data ?? []).map((e) => ({
      id: e.id,
      type: 'event' as const,
      title: e.title,
      subtitle: [e.category, e.location].filter(Boolean).join(' · '),
      url: `/events/${e.id}`,
      score: scoreResult(e.title, query),
    })),
  ]

  results.sort((a, b) => b.score - a.score)
  return NextResponse.json(results.map((r) => ({ id: r.id, type: r.type, title: r.title, subtitle: r.subtitle, url: r.url })))
}
