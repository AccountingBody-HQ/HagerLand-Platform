import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default async function HomePage() {
  const { data: businesses, error } = await supabase
    .from('companies')
    .select('*')
    .eq('profile_published', true)
    .order('company_name')

  if (error) {
    return <div style={{ padding: 40 }}>Error loading businesses: {error.message}</div>
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20, fontFamily: 'sans-serif' }}>
      <header style={{ textAlign: 'center', margin: '40px 0' }}>
        <h1 style={{ fontSize: 36, marginBottom: 8 }}>HagerLand</h1>
        <p style={{ color: '#666' }}>
          Find Ethiopian-owned businesses across the UK
        </p>
      </header>

      <div style={{ display: 'grid', gap: 16 }}>
        {businesses && businesses.length > 0 ? (
          businesses.map((business) => (
            <Link
              key={business.id}
              href={`/business/${business.id}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div
                style={{
                  border: '1px solid #e0e0e0',
                  borderRadius: 8,
                  padding: 20,
                  cursor: 'pointer',
                }}
              >
                <h2 style={{ margin: '0 0 8px 0', fontSize: 20 }}>
                  {business.company_name}
                </h2>
                <p style={{ color: '#666', margin: '0 0 4px 0' }}>
                  {business.sic_description} — {business.trading_address_city}
                </p>
                {business.phone && (
                  <p style={{ margin: '0 0 4px 0', fontSize: 14 }}>
                    📞 {business.phone}
                  </p>
                )}
                {business.website && (
                  <p style={{ margin: 0, fontSize: 14 }}>
                    🌐 {business.website}
                  </p>
                )}
              </div>
            </Link>
          ))
        ) : (
          <p style={{ textAlign: 'center', color: '#999' }}>
            No businesses found yet.
          </p>
        )}
      </div>
    </div>
  )
}
