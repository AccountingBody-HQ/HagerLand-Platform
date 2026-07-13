'use server'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import { requireAdminSession } from '@/lib/admin-auth'

export async function addBusiness(formData: FormData) {
  requireAdminSession()

  const companyName = formData.get('company_name') as string
  const tradingAddressCity = formData.get('trading_address_city') as string
  const phone = formData.get('phone') as string
  const website = formData.get('website') as string
  const sicDescription = formData.get('sic_description') as string

  const { data: country } = await supabaseAdmin
    .from('countries')
    .select('id')
    .eq('code', 'GB')
    .single()

  const { error } = await supabaseAdmin.from('companies').insert({
    company_name: companyName,
    company_number: `MANUAL-${Date.now()}`,
    country_id: country?.id,
    trading_address_city: tradingAddressCity,
    phone: phone || null,
    website: website || null,
    sic_description: sicDescription || null,
    status: 'active',
    tier_classification: 1,
    profile_published: true,
    profile_published_at: new Date().toISOString(),
  })

  if (error) {
    throw new Error(error.message)
  }

  redirect('/roodber8?success=true')
}
