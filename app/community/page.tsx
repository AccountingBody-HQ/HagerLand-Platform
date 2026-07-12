import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SearchBox } from '@/components/SearchBox'

export default async function CommunityPage() {
  const { data: orgs, error } = await supabase
    .from('community')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-bg">
      <SiteNav />

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-ink tracking-tight">
          Community organisations
        </h1>
        <p className="text-muted text-base sm:text-lg mt-4">
          Churches, associations, and support networks for the Ethiopian community.
        </p>
        <SearchBox className="mt-6 max-w-lg mx-auto" />
        <div className="flex flex-col sm:flex-row gap-3 mt-6 max-w-xs sm:max-w-none mx-auto justify-center">
          <Link href="/community/post" className="flex-1 bg-green hover:bg-green-dark text-white font-semibold rounded-full px-6 py-3 transition-colors text-center">
            List an organisation
          </Link>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        {error && (
          <p className="text-sm text-red-600 text-center">Error loading organisations: {error.message}</p>
        )}

        <div className="grid gap-4">
          {orgs && orgs.length > 0 ? (
            orgs.map((org) => (
              <div
                key={org.id}
                className="border border-border bg-white rounded-xl p-5 sm:p-6"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className="font-bold text-ink text-lg">{org.name}</h3>
                  {org.category && (
                    <span className="bg-green-soft text-green text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap">
                      {org.category}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted mb-3">{org.location}</p>
                {org.description && (
                  <p className="text-sm text-ink/80 mb-3">{org.description}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                  {org.contact_name && <span>{org.contact_name}</span>}
                  {org.contact_email && <span>{org.contact_email}</span>}
                </div>
              </div>
            ))
          ) : (
            <p className="text-muted text-center py-12">No organisations listed yet.</p>
          )}
        </div>
      </section>
    </main>
  )
}
