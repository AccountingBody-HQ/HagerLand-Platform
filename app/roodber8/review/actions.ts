'use server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { revalidatePath } from 'next/cache'

const TABLES = ['jobs', 'housing', 'cars', 'tutors', 'community', 'events'] as const
type TableName = (typeof TABLES)[number]

function isValidTable(table: string): table is TableName {
  return (TABLES as readonly string[]).includes(table)
}

export async function approveListing(table: string, id: string) {
  if (!isValidTable(table)) throw new Error('Invalid table')
  const { error } = await supabaseAdmin.from(table).update({ status: 'active' }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/roodber8/review')
}

export async function rejectListing(table: string, id: string) {
  if (!isValidTable(table)) throw new Error('Invalid table')
  const { error } = await supabaseAdmin.from(table).update({ status: 'rejected' }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/roodber8/review')
}
