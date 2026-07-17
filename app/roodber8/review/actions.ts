'use server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { requireAdminSession, verifySessionToken, SESSION_COOKIE } from '@/lib/admin-auth'

const TABLES = ['jobs', 'housing', 'cars', 'tutors', 'community', 'events', 'companies', 'money'] as const
type TableName = (typeof TABLES)[number]

function isValidTable(table: string): table is TableName {
  return (TABLES as readonly string[]).includes(table)
}

function revalidateAll() {
  revalidatePath('/roodber8')
  revalidatePath('/roodber8/review')
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
  const { error } = await supabaseAdmin.from(table).update({ status: 'active', is_verified: true }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidateAll()
}

export async function rejectListing(table: string, id: string) {
  requireAdminSession()
  if (!isValidTable(table)) throw new Error('Invalid table')
  const { error } = await supabaseAdmin.from(table).update({ status: 'rejected' }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidateAll()
}

export async function deleteListing(table: string, id: string) {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!verifySessionToken(token)) throw new Error('Unauthorized')
  if (!isValidTable(table)) throw new Error('Invalid table')
  const { error } = await supabaseAdmin.from(table).delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidateAll()
}

export async function deactivateListing(table: string, id: string) {
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!verifySessionToken(token)) throw new Error('Unauthorized')
  if (!isValidTable(table)) throw new Error('Invalid table')
  const { error } = await supabaseAdmin.from(table).update({ status: 'pending' }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidateAll()
}

export async function approveClaim(claimId: string, companyId: string) {
  requireAdminSession()
  const { error: claimError } = await supabaseAdmin.from('business_claims').update({ status: 'approved' }).eq('id', claimId)
  if (claimError) throw new Error(claimError.message)
  const { error: companyError } = await supabaseAdmin.from('companies').update({ is_verified: true, is_claimed: true }).eq('id', companyId)
  if (companyError) throw new Error(companyError.message)
  revalidateAll()
}

export async function rejectClaim(claimId: string) {
  requireAdminSession()
  const { error } = await supabaseAdmin.from('business_claims').update({ status: 'rejected' }).eq('id', claimId)
  if (error) throw new Error(error.message)
  revalidateAll()
}