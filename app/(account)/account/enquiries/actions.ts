'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getServerSupabase } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth'
import { fail, ok, type ActionResult } from '@/lib/action-result'

const schema = z.object({
  id: z.uuid(),
  status: z.enum(['new', 'contacted', 'qualified', 'won', 'lost', 'spam']),
  recipient_notes: z.string().max(4000).optional(),
})

/** Recipients track each lead's progress and keep private notes (spec 12). */
export async function updateEnquiryAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireUser('/account/enquiries')
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return fail('Please check the form.')
  const { id, status, recipient_notes } = parsed.data
  const { data, error } = await getServerSupabase()
    .from('enquiries')
    .update({ status, recipient_notes: recipient_notes?.trim() || null })
    .eq('id', id)
    .select('id')
  if (error || !data?.length) return fail('We could not save this. Please try again.')
  revalidatePath('/account/enquiries')
  revalidatePath(`/account/enquiries/${id}`)
  return ok(undefined, 'Saved.')
}
