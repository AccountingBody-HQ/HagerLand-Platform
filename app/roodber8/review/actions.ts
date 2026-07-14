'use server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'
import { requireAdminSession } from '@/lib/admin-auth'

const TABLES = ['jobs', 'housing', 'cars', 'tutors', 'community', 'events', 'companies'] as const
type TableName = (typeof TABLES)[number]

function isValidTable(table: string): table is TableName {
  return (TABLES as readonly string[]).includes(table)
}

export async function approveListing(table: string, id: string) {
  requireAdminSession()
  if (!isValidTable(table)) throw new Error('Invalid table')
  const { error } = await supabaseAdmin.from(table).update({ status: 'active' }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/roodber8/review')
}

export async function rejectListing(table: string, id: string) {
  requireAdminSession()
  if (!isValidTable(table)) throw new Error('Invalid table')
  const { error } = await supabaseAdmin.from(table).update({ status: 'rejected' }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/roodber8/review')
}

export async function approveClaim(claimId: string, companyId: string) {
  requireAdminSession()
  const { error: claimError } = await supabaseAdmin
    .from('business_claims')
    .update({ status: 'approved' })
    .eq('id', claimId)
  if (claimError) throw new Error(claimError.message)
  const { error: companyError } = await supabaseAdmin
    .from('companies')
    .update({ is_verified: true, is_claimed: true })
    .eq('id', companyId)
  if (companyError) throw new Error(companyError.message)
  revalidatePath('/roodber8/review')
}

export async function rejectClaim(claimId: string) {
  requireAdminSession()
  const { error } = await supabaseAdmin
    .from('business_claims')
    .update({ status: 'rejected' })
    .eq('id', claimId)
  if (error) throw new Error(error.message)
  revalidatePath('/roodber8/review')
}
