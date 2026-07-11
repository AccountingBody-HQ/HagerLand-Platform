import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export default async function BusinessProfilePage({
  params,
}: {
  params: { id: string }
}) {
  const { data: business, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error || !business) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-bg">
      <nav className="sticky top-0 z-10 bg-bg/90 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-display text-xl tracking-tight">
            HagerLand
          </Link>
          <Link
            href="/"
            className="text-sm text-muted hover:text-ink transition-colors"
          >
            ← Directory
          </Link>
        </div>
      </nav>

      <section className="max-w-2xl mx-auto px-6 py-16">
        <div className="w-14 h-14 rounded-full bg-green-soft flex items-center justify-center font-display text-green text-xl mb-6">
          {business.company_name.charAt(0)}
        </div>

        <h1 className="font-display font-light text-3xl sm:text-4xl tracking-tight mb-2">
          {business.company_name}
        </h1>
        <p className="font-mono text-xs tracking-widest uppercase text-muted mb-8">
          {business.sic_description} &middot; {business.trading_address_city}
        </p>

        {business.ai_description && (
          <p className="text-base leading-relaxed text-ink/80 mb-8">
            {business.ai_description}
          </p>
        )}

        <div className="border-t border-border pt-6 space-y-3">
          {business.phone && (
            <div className="flex items-center gap-3 text-sm">
              <span className="font-mono text-[11px] tracking-widest uppercase text-muted w-20">
                Phone
              </span>
              <span>{business.phone}</span>
            </div>
          )}
          {business.website && (
            <div className="flex items-center gap-3 text-sm">
              <span className="font-mono text-[11px] tracking-widest uppercase text-muted w-20">
                Website
              </span>
              <span>{business.website}</span>
            </div>
          )}
          {business.email && (
            <div className="flex items-center gap-3 text-sm">
              <span className="font-mono text-[11px] tracking-widest uppercase text-muted w-20">
                Email
              </span>
              <span>{business.email}</span>
            </div>
          )}
        </div>

        <div className="mt-10 pt-6 border-t border-border">
          <p className="text-sm text-muted mb-3">
            Unclaimed listing. Are you the owner?
          </p>
          <button className="text-sm font-medium border border-ink rounded-full px-5 py-2 hover:bg-ink hover:text-bg transition-colors">
            Claim this business
          </button>
        </div>
      </section>
    </main>
  )
}
