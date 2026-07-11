import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { HeroGraphic } from '@/components/HeroGraphic'

export default async function HomePage() {
  const { data: businesses, error } = await supabase
    .from('companies')
    .select('*')
    .eq('profile_published', true)
    .order('company_name')

  const count = businesses?.length ?? 0

  return (
    <main className="min-h-screen bg-bg">
      <nav className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo className="w-8 h-8" />
            <span className="font-bold text-xl text-ink">HagerLand</span>
          </div>
          <div className="hidden lg:flex items-center gap-7 text-sm font-medium text-ink">
            <span>Directory</span>
            <span>Events</span>
            <span>Jobs</span>
            <span>Housing</span>
            <span>Tutors</span>
            <span>Community</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-sm font-medium text-ink">Log in</span>
            <button className="bg-green hover:bg-green-dark text-white text-sm font-semibold rounded-full px-5 py-2.5 transition-colors">
              List your business
            </button>
          </div>
        </div>
      </nav>

      <section className="max-w-6xl mx-auto px-6 py-16 sm:py-24 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-4xl sm:text-5xl font-bold text-ink leading-tight tracking-tight">
            Welcome to the home of Ethiopian business worldwide
          </h1>
          <p className="text-muted text-lg mt-6 max-w-md">
            Find verified Ethiopian-owned businesses across the diaspora, or list yours for free.
          </p>
          <div className="flex flex-wrap gap-4 mt-8">
            <button className="bg-green hover:bg-green-dark text-white font-semibold rounded-full px-6 py-3 transition-colors">
              Explore the directory
            </button>
            <button className="border border-ink text-ink font-semibold rounded-full px-6 py-3 hover:bg-ink hover:text-white transition-colors">
              List your business
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <HeroGraphic />
        </div>
      </section>

      <section className="bg-section py-16">
        <div className="max-w-6xl mx-auto px-6 grid sm:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 border border-border">
            <p className="font-bold text-lg text-ink mb-2">Verified owners</p>
            <p className="text-sm text-muted">Every listing is confirmed, so you know exactly who you're supporting.</p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-border">
            <p className="font-bold text-lg text-ink mb-2">Every industry</p>
            <p className="text-sm text-muted">From restaurants to accountants, find any Ethiopian-owned service.</p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-border">
            <p className="font-bold text-lg text-ink mb-2">Every diaspora city</p>
            <p className="text-sm text-muted">Built for the whole community, wherever in the world you are.</p>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-ink">Featured listings</h2>
          <span className="text-sm text-muted">{count} businesses</span>
        </div>

        {error && (
          <p className="text-sm text-red-600">Error loading businesses: {error.message}</p>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {businesses && businesses.length > 0 ? (
            businesses.map((business) => (
              <Link
                key={business.id}
                href={`/business/${business.id}`}
                className="border border-border bg-white rounded-xl p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-9 rounded-full bg-green-soft flex items-center justify-center font-bold text-green text-sm">
                    {business.company_name.charAt(0)}
                  </div>
                  <span className="flex items-center gap-1 bg-gold-soft text-gold text-xs font-semibold px-2.5 py-1 rounded-full">
                    Verified
                  </span>
                </div>
                <h3 className="font-bold text-ink mb-1">{business.company_name}</h3>
                <p className="text-sm text-muted mb-3">
                  {business.sic_description} &middot; {business.trading_address_city}
                </p>
                {business.phone && (
                  <p className="text-sm text-muted">{business.phone}</p>
                )}
              </Link>
            ))
          ) : (
            <p className="text-muted col-span-full text-center py-12">
              No businesses listed yet.
            </p>
          )}
        </div>
      </section>
    </main>
  )
}
