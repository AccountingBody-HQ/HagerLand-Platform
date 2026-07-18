'use server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { requireAdminSession, verifySessionToken, SESSION_COOKIE } from '@/lib/admin-auth'

const TABLES = ['jobs', 'housing', 'cars', 'tutors', 'community', 'events', 'companies', 'money'] as const
type TableName = (typeof TABLES)[number]

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
}

function isValidTable(table: string): table is TableName {
  return (TABLES as readonly string[]).includes(table)
}

function revalidateAll() {
  revalidatePath('/roodber8')
  revalidatePath('/roodber8/review')
  revalidatePath('/roodber8/businesses')
  revalidatePath('/business')
  revalidatePath('/jobs')
  revalidatePath('/housing')
  revalidatePath('/money')
  revalidatePath('/cars')
  revalidatePath('/tutors')
  revalidatePath('/community')
  revalidatePath('/events')
}

export async function approveListing(table: string, id: string) {
  requireAdminSession()
  if (!isValidTable(table)) throw new Error('Invalid table')
  const supabase = getAdmin()
  const updateData: Record<string, unknown> = { status: 'active' }
  if (table === 'companies') updateData.is_verified = true
  const { error } = await supabase.from(table).update(updateData).eq('id', id)
  if (error) throw new Error(error.message)
  revalidateAll()
}

export async function rejectListing(table: string, id: string) {
  requireAdminSession()
  if (!isValidTable(table)) throw new Error('Invalid table')
  const supabase = getAdmin()
  const { error } = await supabase.from(table).update({ status: 'rejected' }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidateAll()
}

export async function deleteListing(table: string, id: string) {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!verifySessionToken(token)) throw new Error('Unauthorized')
  if (!isValidTable(table)) throw new Error('Invalid table')
  const supabase = getAdmin()
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidateAll()
}

export async function deactivateListing(table: string, id: string) {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!verifySessionToken(token)) throw new Error('Unauthorized')
  if (!isValidTable(table)) throw new Error('Invalid table')
  const supabase = getAdmin()
  const { error } = await supabase.from(table).update({ status: 'pending' }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidateAll()
}

export async function updateCompany(id: string, data: {
  company_name?: string
  trading_address_city?: string
  phone?: string
  website?: string
  sic_description?: string
  submitter_name?: string
  ai_description?: string | null
}) {
  requireAdminSession()
  const supabase = getAdmin()
  const { error } = await supabase.from('companies').update(data).eq('id', id)
  if (error) throw new Error(error.message)
  revalidateAll()
}

export async function approveClaim(claimId: string, companyId: string) {
  requireAdminSession()
  const supabase = getAdmin()
  const { error: claimError } = await supabase.from('business_claims').update({ status: 'approved' }).eq('id', claimId)
  if (claimError) throw new Error(claimError.message)
  const { error: companyError } = await supabase.from('companies').update({ is_verified: true }).eq('id', companyId)
  if (companyError) throw new Error(companyError.message)
  revalidateAll()
}

export async function rejectClaim(claimId: string) {
  requireAdminSession()
  const supabase = getAdmin()
  const { error } = await supabase.from('business_claims').update({ status: 'rejected' }).eq('id', claimId)
  if (error) throw new Error(error.message)
  revalidateAll()
}