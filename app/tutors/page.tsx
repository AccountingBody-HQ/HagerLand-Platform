import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SearchBox } from '@/components/SearchBox'

export default async function TutorsPage() {
  const { data: tutors, error } = await supabase
    .from('tutors')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-bg">
      <SiteNav />

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-ink tracking-tight">
          Tutors in the Ethiopian community
        </h1>
        <p className="text-muted text-base sm:text-lg mt-4">
          Find trusted tutors, or offer your own teaching services.
        </p>
        <SearchBox className="mt-6 max-w-lg mx-auto" />
        <div className="flex flex-col sm:flex-row gap-3 mt-6 max-w-xs sm:max-w-none mx-auto justify-center">
          <Link href="/tutors/post" className="flex-1 bg-green hover:bg-green-dark text-white font-semibold rounded-full px-6 py-3 transition-colors text-center">
            Offer tutoring
          </Link>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        {error && (
          <p className="text-sm text-red-600 text-center">Error loading tutors: {error.message}</p>
        )}

        <div className="grid gap-4">
          {tutors && tutors.length > 0 ? (
            tutors.map((tutor) => (
              <Link
                key={tutor.id}
                href={`/tutors/${tutor.id}`}
                className="block border border-border bg-white rounded-xl p-5 sm:p-6 hover:border-green/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className="font-bold text-ink text-lg">{tutor.name}</h3>
                  {tutor.delivery_mode && (
                    <span className="bg-green-soft text-green text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
                      {tutor.delivery_mode}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted mb-3">
                  {tutor.subject} &middot; {tutor.location}
                </p>
                {tutor.description && (
                  <p className="text-sm text-ink/80 mb-3">{tutor.description}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                  {tutor.rate && <span className="font-semibold text-ink">{tutor.rate}</span>}
                  {tutor.contact_email && <span>{tutor.contact_email}</span>}
                </div>
              </Link>
            ))
          ) : (
            <p className="text-muted text-center py-12">No tutors listed yet.</p>
          )}
        </div>
      </section>
    </main>
  )
}
