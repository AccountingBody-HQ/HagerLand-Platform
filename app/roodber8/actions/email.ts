'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdmin, audit } from '@/lib/admin/guard'
import { deliverEmail } from '@/lib/email/send'

type Done = { ok: true; data: { message: string } } | { ok: false; error: string }

/** Try one undelivered email again now. */
export async function retryEmailAction(id: string): Promise<Done> {
  await assertAdmin()
  if (!z.uuid().safeParse(id).success) return { ok: false, error: 'Invalid.' }
  const db = getAdminSupabase()
  const { data: m } = await db.from('email_outbox').select('*').eq('id', id).maybeSingle()
  if (!m || m.status === 'sent') return { ok: false, error: 'Already sent.' }
  const res = await deliverEmail({ to: m.to_addresses, subject: m.subject, html: m.html, text: m.text_body, replyTo: m.reply_to ?? undefined, from: m.sender === 'supply' ? 'supply' : 'default', headers: (m.headers as Record<string, string>) ?? undefined })
  await db.from('email_outbox').update(res.ok ? { status: 'sent', attempts: m.attempts + 1, sent_at: new Date().toISOString() } : { attempts: m.attempts + 1, last_error: res.error.slice(0, 500) }).eq('id', id)
  await audit('email.retry', { type: 'email', id, label: m.subject }, { ok: res.ok })
  revalidatePath('/roodber8/email-problems')
  return res.ok ? { ok: true, data: { message: 'Sent.' } } : { ok: false, error: `Still failing: ${res.error}` }
}

/** Stop retrying an email (for example a wrong address). */
export async function discardEmailAction(id: string): Promise<Done> {
  await assertAdmin()
  if (!z.uuid().safeParse(id).success) return { ok: false, error: 'Invalid.' }
  const { error } = await getAdminSupabase().from('email_outbox').update({ status: 'gave_up' }).eq('id', id)
  if (error) return { ok: false, error: 'Please try again.' }
  await audit('email.discard', { type: 'email', id })
  revalidatePath('/roodber8/email-problems')
  return { ok: true, data: { message: 'Will not be retried.' } }
}
