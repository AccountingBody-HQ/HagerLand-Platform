import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { SiteNav } from '@/components/SiteNav'

export default async function BusinessProfilePage({
  params,
}: {
  params: { id: string }
}) {
  const { data: business, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', params.id)
    .eq('status', 'active')
    .single()

  if (error || !business) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-bg">
      <SiteNav />

      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16 text-center sm:text-left">
        <div className="flex items-center justify-between mb-6">
          <div className="w-14 h-14 rounded-full bg-green-soft flex items-center justify-center font-bold text-green text-xl mx-auto sm:mx-0">
            {business.company_name.charAt(0)}
          </div>
        </div>

        <h1 className="text-2xl sm:text-4xl font-bold text-ink tracking-tight mb-2">
          {business.company_name}
        </h1>
        <div className="flex items-center justify-center sm:justify-start gap-2 mb-8">
          <span className="text-sm text-muted">
            {business.sic_description} &middot; {business.trading_address_city}
          </span>
          {business.is_verified && (
            <span className="bg-gold-soft text-gold text-xs font-semibold px-2.5 py-1 rounded-full">
              Verified
            </span>
          )}
        </div>

        {business.ai_description && (
          <p className="text-base leading-relaxed text-ink/80 mb-8 text-left">
            {business.ai_description}
          </p>
        )}

        <div className="border-t border-border pt-6 space-y-3 text-left">
          {business.phone && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-xs font-semibold uppercase text-muted w-20">
                Phone
              </span>
              <span>{business.phone}</span>
            </div>
          )}
          {business.website && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-xs font-semibold uppercase text-muted w-20">
                Website
              </span>
              <span>{business.website}</span>
            </div>
          )}
          {business.email && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-xs font-semibold uppercase text-muted w-20">
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
          <div className="flex flex-col sm:flex-row gap-3 max-w-xs mx-auto sm:mx-0 sm:max-w-none">
            <button className="flex-1 bg-green hover:bg-green-dark text-white font-semibold rounded-full px-6 py-3 transition-colors">
              Claim this business
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
