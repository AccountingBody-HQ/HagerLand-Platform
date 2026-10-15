'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdmin, audit } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { sendEmail } from '@/lib/email/send'
import { quoteIssuedEmail } from '@/lib/email/templates'
import { QUOTE_VALID_DAYS } from '@/lib/listing-rules'

type Msg = ActionResult<{ message: string }>

const ENQUIRY_STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost', 'spam'] as const
const QUOTE_STATUSES = ['submitted', 'in_review', 'quoted', 'accepted', 'declined', 'expired', 'cancelled'] as const

export async function setEnquiryStatusAction(id: string, status: string): Promise<Msg> {
  await assertAdmin()
  const parsed = z.object({ id: z.uuid(), status: z.enum(ENQUIRY_STATUSES) }).safeParse({ id, status })
  if (!parsed.success) return fail('Invalid status.')
  const db = getAdminSupabase()
  const { data: before } = await db.from('enquiries').select('status, reference').eq('id', id).maybeSingle()
  if (!before) return fail('Not found.')
  const { error } = await db.from('enquiries').update({ status: parsed.data.status }).eq('id', id)
  if (error) return fail('Could not change the status.')
  await audit('enquiry.status', { type: 'enquiry', id, label: before.reference }, { status: { from: before.status, to: parsed.data.status } })
  revalidatePath('/roodber8', 'layout')
  return ok({ message: `Marked as ${parsed.data.status}.` })
}

export async function setQuoteStatusAction(id: string, status: string): Promise<Msg> {
  await assertAdmin()
  const parsed = z.object({ id: z.uuid(), status: z.enum(QUOTE_STATUSES) }).safeParse({ id, status })
  if (!parsed.success) return fail('Invalid status.')
  const db = getAdminSupabase()
  const { data: before } = await db.from('quote_requests').select('status, reference').eq('id', id).maybeSingle()
  if (!before) return fail('Not found.')
  const { error } = await db.from('quote_requests').update({ status: parsed.data.status }).eq('id', id)
  if (error) return fail('Could not change the status.')
  await audit('quote.status', { type: 'quote', id, label: before.reference }, { status: { from: before.status, to: parsed.data.status } })
  revalidatePath('/roodber8', 'layout')
  return ok({ message: `Marked as ${parsed.data.status.replace('_', ' ')}.` })
}

export async function saveQuoteInternalAction(id: string, input: { assigned_to: string; internal_notes: string }): Promise<Msg> {
  await assertAdmin()
  const parsed = z
    .object({ id: z.uuid(), assigned_to: z.string().trim().max(80), internal_notes: z.string().trim().max(4000) })
    .safeParse({ id, ...input })
  if (!parsed.success) return fail('Check the fields and try again.')
  const { error } = await getAdminSupabase()
    .from('quote_requests')
    .update({ assigned_to: parsed.data.assigned_to || null, internal_notes: parsed.data.internal_notes || null })
    .eq('id', id)
  if (error) return fail('Could not save.')
  await audit('quote.internal', { type: 'quote', id })
  revalidatePath(`/roodber8/quotes/${id}`)
  return ok({ message: 'Saved.' })
}

const issueSchema = z.object({
  id: z.uuid(),
  total_etb: z.coerce.number().positive('Enter the quote total.').max(10_000_000_000),
  document_path: z
    .string()
    .max(300)
    .regex(/^docs\/quote\//, 'Invalid document.')
    .nullable(),
  notify: z.boolean(),
})

/**
 * Issues the quote: stores the total and (optionally) the PDF, marks it quoted and emails the customer.
 * The quote expires after QUOTE_VALID_DAYS (daily job).
 */
export async function issueQuoteAction(input: { id: string; total_etb: string; document_path: string | null; notify: boolean }): Promise<Msg> {
  await assertAdmin()
  const parsed = issueSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the fields.')
  const d = parsed.data
  const db = getAdminSupabase()
  const { data: q } = await db.from('quote_requests').select('id, reference, name, email, status, quote_document_path').eq('id', d.id).maybeSingle()
  if (!q) return fail('Not found.')
  if (d.document_path && !d.document_path.startsWith(`docs/quote/${d.id}/`)) return fail('Invalid document.')
  const totalCents = Math.round(d.total_etb * 100)
  const { error } = await db
    .from('quote_requests')
    .update({ quoted_total_etb_cents: totalCents, quote_document_path: d.document_path ?? q.quote_document_path, status: 'quoted', quoted_at: new Date().toISOString() })
    .eq('id', d.id)
  if (error) return fail('Could not save the quote.')
  let emailed = false
  if (d.notify && q.email) {
    const mail = quoteIssuedEmail({ name: q.name.split(' ')[0] || q.name, reference: q.reference, totalCents, hasDocument: Boolean(d.document_path ?? q.quote_document_path), validDays: QUOTE_VALID_DAYS })
    emailed = await sendEmail({ to: q.email, ...mail, from: 'supply' })
  }
  await audit('quote.issue', { type: 'quote', id: d.id, label: q.reference }, { total_etb_cents: totalCents, document: Boolean(d.document_path), emailed })
  revalidatePath('/roodber8', 'layout')
  return ok({ message: emailed ? 'Quote issued and emailed to the customer.' : q.email && d.notify ? 'Quote saved, but the email could not be sent. Call the customer.' : 'Quote saved. The customer has no email: call them.' })
}
