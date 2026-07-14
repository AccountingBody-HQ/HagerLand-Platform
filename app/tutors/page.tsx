import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { SectionHeader } from '@/components/SectionHeader'
import { SubmissionBanner } from '@/components/SubmissionBanner'

export const metadata = {
  title: 'Tutors in the Ethiopian community',
  description: 'Find trusted tutors from the Ethiopian community, or offer your own teaching services.',
}

const PAGE_SIZE = 20

export default async function TutorsPage({
  searchParams,
}: {
  searchParams: { mode?: string; page?: string }
}) {
  const deliveryMode = searchParams.mode
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('tutors')
    .select('*', { count: 'exact' })
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (deliveryMode) query = query.eq('delivery_mode', deliveryMode)

  const { data: tutors, count, error } = await query

  const { data: modeRows } = await supabase
    .from('tutors')
    .select('delivery_mode')
    .eq('status', 'active')
    .not('delivery_mode', 'is', null)

  const modes = Array.from(
    new Set((modeRows ?? []).map((r) => r.delivery_mode).filter(Boolean) as string[])
  ).sort()

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  function pageUrl(p: number) {
    const params = new URLSearchParams()
    if (deliveryMode) params.set('mode', deliveryMode)
    params.set('page', String(p))
    return `/tutors?${params.toString()}`
  }

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />
      <SectionHeader
        title="Tutors in the Ethiopian community"
        description="Find trusted tutors, or offer your own teaching services."
        actions={[{ href: '/tutors/post', label: 'Offer tutoring' }]}
      />
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 flex-1 w-full">
        <SubmissionBanner />
        {modes.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <Link
              href="/tutors"
              className={`text-sm px-3.5 py-1.5 rounded-full border transition-colors ${
                !deliveryMode ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-border hover:border-ink'
              }`}
            >
              All modes
            </Link>
            {modes.map((m) => (
              <Link
                key={m}
                href={`/tutors?mode=${encodeURIComponent(m)}`}
                className={`text-sm px-3.5 py-1.5 rounded-full border transition-colors ${
                  deliveryMode === m ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-border hover:border-ink'
                }`}
              >
                {m}
              </Link>
            ))}
          </div>
        )}
        {error && <p className="text-sm text-red-600 text-center mb-4">Error loading tutors.</p>}
        <div className="grid gap-4">
          {tutors && tutors.length > 0 ? (
            tutors.map((tutor) => (
              <Link
                key={tutor.id}
                href={`/tutors/${tutor.id}`}
                className="block border border-border bg-white rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className="font-bold text-ink text-lg">{tutor.name}</h3>
                  {tutor.delivery_mode && (
                    <span className="bg-green-soft text-green text-xs font-semibold px-2.5 py-1 rounded-full shrink-0">{tutor.delivery_mode}</span>
                  )}
                </div>
                <p className="text-sm text-muted mb-3">
                  {[tutor.subject, tutor.location].filter(Boolean).join(' · ')}
                </p>
                {tutor.description && <p className="text-sm text-ink/80 mb-3 line-clamp-2">{tutor.description}</p>}
                {tutor.rate && <p className="text-sm font-semibold text-ink">{tutor.rate}</p>}
              </Link>
            ))
          ) : (
            <p className="text-muted text-center py-12">No tutors listed yet.</p>
          )}
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            {page > 1 && (
              <Link href={pageUrl(page - 1)} className="border border-border rounded-full px-5 py-2 text-sm hover:bg-section transition-colors">Previous</Link>
            )}
            <span className="text-sm text-muted">Page {page} of {totalPages}</span>
            {page < totalPages && (
              <Link href={pageUrl(page + 1)} className="border border-border rounded-full px-5 py-2 text-sm hover:bg-section transition-colors">Next</Link>
            )}
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  )
}
