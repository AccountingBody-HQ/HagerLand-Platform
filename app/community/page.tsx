import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { SectionHeader } from '@/components/SectionHeader'
import { SubmissionBanner } from '@/components/SubmissionBanner'

export const metadata = {
  title: 'Ethiopian community organisations',
  description: 'Churches, associations, Edir groups, and support networks for the Ethiopian diaspora.',
}

const PAGE_SIZE = 20

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: { category?: string; page?: string }
}) {
  const category = searchParams.category
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('community')
    .select('*', { count: 'exact' })
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range(from, to)

  if (category) query = query.eq('category', category)

  const { data: orgs, count, error } = await query

  const { data: catRows } = await supabase
    .from('community')
    .select('category')
    .eq('status', 'active')
    .not('category', 'is', null)

  const categories = Array.from(
    new Set((catRows ?? []).map((r) => r.category).filter(Boolean) as string[])
  ).sort()

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  function pageUrl(p: number) {
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    params.set('page', String(p))
    return `/community?${params.toString()}`
  }

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />
      <SectionHeader
        title="Community organisations"
        description="Churches, associations, and support networks for the Ethiopian diaspora."
        actions={[{ href: '/community/post', label: 'List an organisation' }]}
      />
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-16 flex-1 w-full">
        <SubmissionBanner />
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <Link
              href="/community"
              className={`text-sm px-3.5 py-1.5 rounded-full border transition-colors ${
                !category ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-border hover:border-ink'
              }`}
            >
              All categories
            </Link>
            {categories.map((c) => (
              <Link
                key={c}
                href={`/community?category=${encodeURIComponent(c)}`}
                className={`text-sm px-3.5 py-1.5 rounded-full border transition-colors ${
                  category === c ? 'bg-ink text-white border-ink' : 'bg-white text-ink border-border hover:border-ink'
                }`}
              >
                {c}
              </Link>
            ))}
          </div>
        )}
        {error && <p className="text-sm text-red-600 text-center mb-4">Error loading organisations.</p>}
        <div className="grid gap-4">
          {orgs && orgs.length > 0 ? (
            orgs.map((org) => (
              <Link
                key={org.id}
                href={`/community/${org.id}`}
                className="block border border-border bg-white rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h3 className="font-bold text-ink text-lg">{org.name}</h3>
                  {org.category && (
                    <span className="bg-green-soft text-green text-xs font-semibold px-2.5 py-1 rounded-full shrink-0">{org.category}</span>
                  )}
                </div>
                <p className="text-sm text-muted mb-3">{org.location}</p>
                {org.description && <p className="text-sm text-ink/80 line-clamp-2">{org.description}</p>}
              </Link>
            ))
          ) : (
            <p className="text-muted text-center py-12">No organisations listed yet.</p>
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
