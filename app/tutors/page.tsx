import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Logo } from '@/components/Logo'

export default async function TutorsPage() {
  const { data: tutors, error } = await supabase
    .from('tutors')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-bg">
      <nav className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="w-7 h-7 sm:w-8 sm:h-8" />
            <span className="font-bold text-lg sm:text-xl text-ink">HagerLand</span>
          </Link>
          <Link href="/" className="text-sm font-medium text-ink hover:text-muted transition-colors">
            ← Directory
          </Link>
        </div>
      </nav>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-ink tracking-tight">
          Tutors in the Ethiopian community
        </h1>
        <p className="text-muted text-base sm:text-lg mt-4">
          Find trusted tutors, or offer your own teaching services.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-8 max-w-xs sm:max-w-none mx-auto justify-center">
          <button className="flex-1 bg-green hover:bg-green-dark text-white font-semibold rounded-full px-6 py-3 transition-colors">
            Offer tutoring
          </button>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        {error && (
          <p className="text-sm text-red-600 text-center">Error loading tutors: {error.message}</p>
        )}

        <div className="grid gap-4">
          {tutors && tutors.length > 0 ? (
            tutors.map((tutor) => (
              <div
                key={tutor.id}
                className="border border-border bg-white rounded-xl p-5 sm:p-6"
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
              </div>
            ))
          ) : (
            <p className="text-muted text-center py-12">No tutors listed yet.</p>
          )}
        </div>
      </section>
    </main>
  )
}
