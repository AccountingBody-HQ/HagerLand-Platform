import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SearchBox } from '@/components/SearchBox'
import { DirectorySearch } from '@/components/DirectorySearch'

export default async function BusinessPage() {
  const { data: businesses, error } = await supabase
    .from('companies')
    .select('id, company_name, sic_description, trading_address_city, phone, is_verified')
    .eq('profile_published', true)
    .order('company_name', { ascending: true })

  return (
    <main className="min-h-screen bg-bg">
      <SiteNav />

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-ink tracking-tight">
          Ethiopian-owned businesses
        </h1>
        <p className="text-muted text-base sm:text-lg mt-4">
          Discover and support businesses in the Ethiopian community.
        </p>
        <SearchBox className="mt-6 max-w-lg mx-auto" />
        <div className="flex flex-col sm:flex-row gap-3 mt-6 max-w-xs sm:max-w-none mx-auto justify-center">
          <Link href="/business/post" className="flex-1 bg-green hover:bg-green-dark text-white font-semibold rounded-full px-6 py-3 transition-colors text-center">
            List your business
          </Link>
        </div>
      </section>

      {error && (
        <p className="text-sm text-red-600 text-center pb-8">Error loading businesses: {error.message}</p>
      )}

      <DirectorySearch businesses={businesses ?? []} />
    </main>
  )
}
