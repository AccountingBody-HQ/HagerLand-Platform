import Link from 'next/link'

type Business = {
  id: string
  company_name: string
  sic_description: string | null
  trading_address_city: string | null
  phone: string | null
  is_verified: boolean
}

export function DirectorySearch({ businesses }: { businesses: Business[] }) {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">Featured listings</h2>
        <span className="text-sm text-muted">{businesses.length} businesses</span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {businesses.length > 0 ? (
          businesses.map((business) => (
            <Link
              key={business.id}
              href={`/business/${business.id}`}
              className="border border-border bg-white rounded-xl p-5 sm:p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 rounded-full bg-green-soft flex items-center justify-center font-bold text-green text-sm">
                  {business.company_name.charAt(0)}
                </div>
                {business.is_verified && (
                  <span className="bg-gold-soft text-gold text-xs font-semibold px-2.5 py-1 rounded-full">
                    Verified
                  </span>
                )}
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
  )
}
