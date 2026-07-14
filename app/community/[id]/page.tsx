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
    .from('community')
    .select('name, category, location')
    .eq('id', params.id)
    .eq('status', 'active')
    .single()
  if (!data) return { title: 'Organisation not found' }
  return {
    title: data.name,
    description: [data.category, data.location].filter(Boolean).join(' · '),
  }
}

export default async function CommunityDetailPage({ params }: Props) {
  const { data: org, error } = await supabase
    .from('community')
    .select('*')
    .eq('id', params.id)
    .eq('status', 'active')
    .single()

  if (error || !org) notFound()

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />
      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex-1 w-full">
        <Breadcrumb
          crumbs={[
            { href: '/', label: 'Home' },
            { href: '/community', label: 'Community' },
            { href: `/community/${params.id}`, label: org.name },
          ]}
        />
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">{org.name}</h1>
            <p className="text-muted text-base mt-1">
              {[org.category, org.location].filter(Boolean).join(' · ')}
            </p>
          </div>
          <ShareButton title={org.name} />
        </div>
        {org.is_verified && (
          <div className="inline-flex items-center gap-1.5 bg-gold-soft text-gold text-sm font-semibold px-3 py-1.5 rounded-full mb-6">
            Verified organisation
          </div>
        )}
        {org.description && (
          <p className="text-base leading-relaxed text-ink/80 mb-8">{org.description}</p>
        )}
        <div className="border border-border rounded-xl overflow-hidden mb-8">
          {org.category && (
            <div className="flex items-center gap-4 px-5 py-4 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Category</span>
              <span className="text-sm text-ink">{org.category}</span>
            </div>
          )}
          {org.location && (
            <div className="flex items-center gap-4 px-5 py-4 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Location</span>
              <span className="text-sm text-ink">{org.location}</span>
            </div>
          )}
          {org.website && (
            <div className="flex items-center gap-4 px-5 py-4 border-b border-border">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Website</span>
              <a
                href={org.website.startsWith('http') ? org.website : 'https://' + org.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-green hover:underline truncate"
              >
                {org.website.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
          {org.contact_name && (
            <div className="flex items-center gap-4 px-5 py-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted w-24 shrink-0">Contact</span>
              <span className="text-sm text-ink">{org.contact_name}</span>
            </div>
          )}
        </div>
        {org.contact_email && (
          <div className="bg-section rounded-xl p-6">
            <p className="text-sm font-semibold text-ink mb-1">Get in touch</p>
            <p className="text-sm text-muted mb-4">Click to reveal the contact email.</p>
            <EnquireButton
              email={org.contact_email}
              label="Show contact email"
              subject={`Enquiry via HagerLand — ${org.name}`}
            />
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  )
}
