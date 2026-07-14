import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { Breadcrumb } from '@/components/Breadcrumb'
import { ShareButton } from '@/components/ShareButton'
import { EnquireButton } from '@/components/EnquireButton'

type Props = { params: { id: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data } = await supabase
    .from('tutors')
    .select('name, subject, location')
    .eq('id', params.id)
    .eq('status', 'active')
    .single()
  if (!data) return { title: 'Tutor not found' }
  return {
    title: data.name,
    description: [data.subject, data.location].filter(Boolean).join(' · '),
  }
}

export default async function TutorDetailPage({ params }: Props) {
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
      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex-1 w-full">
        <Breadcrumb
          crumbs={[
            { href: '/', label: 'Home' },
            { href: '/tutors', label: 'Tutors' },
            { href: `/tutors/${params.id}`, label: tutor.name },
          ]}
        />
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">{tutor.name}</h1>
            <p className="text-muted text-base mt-1">
              {[tutor.subject, tutor.location].filter(Boolean).join(' · ')}
            </p>
          </div>
          <ShareButton title={tutor.name} />
        </div>
        {tutor.is_verified && (
          <div className="inline-flex items-center gap-1.5 bg-gold-soft text-gold text-sm font-semibold px-3 py-1.5 rounded-full mb-6">
            Verified tutor
          </div>
        )}
        {tutor.description && (
          <p className="text-base leading-relaxed text-ink/80 mb-8">{tutor.description}</p>
        )}
        <div className="border border-border rounded-xl overflow-hidden mb-8">
          {tutor.subject && (
            <div className="flex items-center gap-4 px-5 py-4 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Subject</span>
              <span className="text-sm text-ink">{tutor.subject}</span>
            </div>
          )}
          {tutor.rate && (
            <div className="flex items-center gap-4 px-5 py-4 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Rate</span>
              <span className="text-sm font-semibold text-ink">{tutor.rate}</span>
            </div>
          )}
          {tutor.delivery_mode && (
            <div className="flex items-center gap-4 px-5 py-4 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Delivery</span>
              <span className="text-sm text-ink">{tutor.delivery_mode}</span>
            </div>
          )}
          {tutor.location && (
            <div className="flex items-center gap-4 px-5 py-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Location</span>
              <span className="text-sm text-ink">{tutor.location}</span>
            </div>
          )}
        </div>
        {tutor.contact_email && (
          <div className="bg-section rounded-xl p-6">
            <p className="text-sm font-semibold text-ink mb-1">Book a session</p>
            <p className="text-sm text-muted mb-4">Click to reveal the contact email.</p>
            <EnquireButton
              email={tutor.contact_email}
              label="Get in touch"
              subject={`Tutoring enquiry via HagerLand — ${tutor.name}`}
            />
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  )
}
