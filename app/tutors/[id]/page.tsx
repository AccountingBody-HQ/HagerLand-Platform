import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

export default async function TutorDetailPage({ params }: { params: { id: string } }) {
  const { data: tutor, error } = await supabase
    .from('tutors')
    .select('*')
    .eq('id', params.id)
    .eq('status', 'active')
    .single()

  if (error || !tutor) notFound()

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />
      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="text-2xl sm:text-4xl font-bold text-ink tracking-tight">{tutor.name}</h1>
          {tutor.is_verified && (
            <span className="bg-gold-soft text-gold text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">Verified</span>
          )}
        </div>
        <p className="text-muted text-base mb-8">{tutor.subject} &middot; {tutor.location}</p>
        {tutor.description && <p className="text-base leading-relaxed text-ink/80 mb-8">{tutor.description}</p>}
        <div className="border-t border-border pt-6 space-y-3">
          {tutor.delivery_mode && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-xs font-semibold uppercase text-muted w-28">Delivery</span>
              <span>{tutor.delivery_mode}</span>
            </div>
          )}
          {tutor.rate && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-xs font-semibold uppercase text-muted w-28">Rate</span>
              <span className="font-semibold">{tutor.rate}</span>
            </div>
          )}
          {tutor.contact_email && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-xs font-semibold uppercase text-muted w-28">Email</span>
              <span>{tutor.contact_email}</span>
            </div>
          )}
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}
