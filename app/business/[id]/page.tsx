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
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 20, fontFamily: 'sans-serif' }}>
      <Link href="/" style={{ color: '#666', textDecoration: 'none', fontSize: 14 }}>
        ← Back to directory
      </Link>

      <div
        style={{
          border: '1px solid #e0e0e0',
          borderRadius: 8,
          padding: 30,
          marginTop: 20,
        }}
      >
        <h1 style={{ margin: '0 0 8px 0' }}>{business.company_name}</h1>
        <p style={{ color: '#666', margin: '0 0 20px 0', fontSize: 16 }}>
          {business.sic_description} — {business.trading_address_city}
        </p>

        {business.ai_description && (
          <p style={{ lineHeight: 1.6, marginBottom: 20 }}>
            {business.ai_description}
          </p>
        )}

        <div style={{ display: 'grid', gap: 10, marginTop: 20 }}>
          {business.phone && (
            <p style={{ margin: 0 }}>📞 {business.phone}</p>
          )}
          {business.website && (
            <p style={{ margin: 0 }}>🌐 {business.website}</p>
          )}
          {business.email && (
            <p style={{ margin: 0 }}>✉️ {business.email}</p>
          )}
        </div>

        <p style={{ marginTop: 30, fontSize: 13, color: '#999' }}>
          Unclaimed listing — are you the owner?
        </p>
      </div>
    </div>
  )
}
