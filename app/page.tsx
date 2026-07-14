import { supabase } from '@/lib/supabase'
import { HeroGraphic } from '@/components/HeroGraphic'
import { SiteNav } from '@/components/SiteNav'
import { DirectorySearch } from '@/components/DirectorySearch'
import { SearchBox } from '@/components/SearchBox'
import Link from 'next/link'
import { SiteFooter } from '@/components/SiteFooter'

export default async function HomePage() {
  const { data: businesses, error } = await supabase
    .from('companies')
    .select('*')
    .eq('status', 'active')
    .order('company_name')


  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-24 grid md:grid-cols-2 gap-10 md:gap-12 items-center">
        <div className="text-center md:text-left">
          <h1 className="text-3xl sm:text-5xl font-bold text-ink leading-tight tracking-tight">
            Welcome to the home of Ethiopian business worldwide
          </h1>
          <p className="text-muted text-base sm:text-lg mt-5 sm:mt-6 max-w-md mx-auto md:mx-0">
            Find verified Ethiopian-owned businesses across the diaspora, or list yours for free.
          </p>
          <SearchBox className="mt-6 max-w-md mx-auto md:mx-0" />
          <div className="flex flex-col sm:flex-row gap-3 mt-6 max-w-xs sm:max-w-none mx-auto md:mx-0">
            <Link href="/business" className="flex-1 bg-green hover:bg-green-dark text-white font-semibold rounded-full px-6 py-3 transition-colors text-center">
              Explore the directory
            </Link>
            <Link href="/business/post" className="flex-1 border border-ink text-ink font-semibold rounded-full px-6 py-3 hover:bg-ink hover:text-white transition-colors text-center">
              List your business
            </Link>
          </div>
        </div>

        <div className="flex items-center justify-center order-first md:order-last">
          <HeroGraphic />
        </div>
      </section>

      <section className="bg-section py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid sm:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-border text-center sm:text-left">
            <p className="font-bold text-lg text-ink mb-2">Verified owners</p>
            <p className="text-sm text-muted">Every listing is confirmed, so you know exactly who you&apos;re supporting.</p>
          </div>
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-border text-center sm:text-left">
            <p className="font-bold text-lg text-ink mb-2">Every industry</p>
            <p className="text-sm text-muted">From restaurants to accountants, find any Ethiopian-owned service.</p>
          </div>
          <div className="bg-white rounded-xl p-5 sm:p-6 border border-border text-center sm:text-left">
            <p className="font-bold text-lg text-ink mb-2">Every diaspora city</p>
            <p className="text-sm text-muted">Built for the whole community, wherever in the world you are.</p>
          </div>
        </div>
      </section>

      {error && (
        <p className="text-sm text-red-600 text-center">Error loading businesses: {error.message}</p>
      )}
      <DirectorySearch businesses={businesses ?? []} />
      <SiteFooter />
    </main>
  )
}
