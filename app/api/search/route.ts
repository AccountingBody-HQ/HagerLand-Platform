import { supabase } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? ''

  if (query.length < 2) {
    return NextResponse.json([])
  }

  const like = `%${query}%`

  const [businesses, jobs, housing, cars, tutors, community, events] = await Promise.all([
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
  ])

  const results = [
    ...(businesses.data ?? []).map((b) => ({
      id: b.id,
      type: 'business' as const,
      title: b.company_name,
      subtitle: [b.sic_description, b.trading_address_city].filter(Boolean).join(' · '),
      url: `/business/${b.id}`,
    })),
    ...(jobs.data ?? []).map((j) => ({
      id: j.id,
      type: 'job' as const,
      title: j.title,
      subtitle: [j.company_name, j.location].filter(Boolean).join(' · '),
      url: `/jobs`,
    })),
    ...(housing.data ?? []).map((h) => ({
      id: h.id,
      type: 'housing' as const,
      title: h.title,
      subtitle: [h.listing_type, h.location].filter(Boolean).join(' · '),
      url: `/housing`,
    })),
    ...(cars.data ?? []).map((c) => ({
      id: c.id,
      type: 'car' as const,
      title: c.title,
      subtitle: [c.listing_type, c.location].filter(Boolean).join(' · '),
      url: `/cars`,
    })),
    ...(tutors.data ?? []).map((t) => ({
      id: t.id,
      type: 'tutor' as const,
      title: t.name,
      subtitle: [t.subject, t.location].filter(Boolean).join(' · '),
      url: `/tutors`,
    })),
    ...(community.data ?? []).map((c) => ({
      id: c.id,
      type: 'community' as const,
      title: c.name,
      subtitle: [c.category, c.location].filter(Boolean).join(' · '),
      url: `/community`,
    })),
    ...(events.data ?? []).map((e) => ({
      id: e.id,
      type: 'event' as const,
      title: e.title,
      subtitle: [e.category, e.location].filter(Boolean).join(' · '),
      url: `/events`,
    })),
  ]

  return NextResponse.json(results)
}
