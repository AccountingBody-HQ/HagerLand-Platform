'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { adminActor, assertAdmin, audit } from '@/lib/admin/guard'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { textSchema } from '@/lib/validation/common'
import { sendEmail } from '@/lib/email/send'
import { renderEmail } from '@/lib/email/layout'
import { canonicalUrl } from '@/lib/site'

type Msg = ActionResult<{ message: string }>

async function userIdByEmail(email: string): Promise<string | null> {
  const db = getAdminSupabase()
  for (let page = 1; page <= 20; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    const hit = data.users.find((u) => u.email?.toLowerCase() === email)
    if (hit) return hit.id
    if (data.users.length < 1000) break
  }
  return null
}

/** Links (or unlinks, with an empty email) the owner's account to a managed property, opening the owner portal to them. */
export async function linkOwnerAccountAction(id: string, _prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin()
  if (!z.uuid().safeParse(id).success) return fail('Not found.')
  const raw = String(formData.get('email') ?? '').trim().toLowerCase()
  if (raw && !z.email().safeParse(raw).success) return fail('Enter a valid email.', { email: 'Enter a valid email' })
  const db = getAdminSupabase()
  const { data: mp } = await db.from('managed_properties').select('reference, owner_user_id').eq('id', id).maybeSingle()
  if (!mp) return fail('Not found.')
  const userId = raw ? await userIdByEmail(raw) : null
  if (raw && !userId) return fail('No account uses that email. Ask the owner to sign up with it first.', { email: 'No account found' })
  await db.from('managed_properties').update({ owner_user_id: userId }).eq('id', id)
  await audit('managed_property.owner_link', { type: 'managed_property', id, label: mp.reference }, { owner: raw || null })
  revalidatePath(`/roodber8/managed-properties/${id}`)
  return ok({ message: userId ? `Linked: ${raw} can now see this property in the owner portal.` : 'Unlinked: the owner portal no longer shows this property.' })
}

/** Shares an uploaded private document (agency area) with the owner, or keeps it staff-only. */
export async function addManagedDocumentAction(id: string, path: string, label: string, visible: boolean): Promise<Msg> {
  await assertAdmin()
  const p = z.object({ id: z.uuid(), path: z.string().regex(/^docs\/agency\/[0-9a-f-]{36}\/[\w.-]+$/), label: z.string().trim().min(2).max(160) }).safeParse({ id, path, label })
  if (!p.success) return fail('Name the document and upload it again.')
  const { error } = await getAdminSupabase().from('managed_property_documents').insert({ managed_property_id: id, label: p.data.label, storage_path: p.data.path, visible_to_owner: visible, uploaded_by: await adminActor() })
  if (error) return fail('Could not save the document.')
  await audit('managed_property.document', { type: 'managed_property', id, label: p.data.label }, { visible_to_owner: visible })
  revalidatePath(`/roodber8/managed-properties/${id}`)
  return ok({ message: visible ? 'Document shared with the owner.' : 'Document saved (staff only).' })
}

/** HagerLand's reply in the owner's message thread; the owner is emailed a notice (no message text in email). */
export async function replyToOwnerAction(id: string, _prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin()
  if (!z.uuid().safeParse(id).success) return fail('Not found.')
  const p = z.object({ body: textSchema(4000, { min: 2, label: 'Reply' }), sender_name: textSchema(120, { min: 1, label: 'Your name' }) }).safeParse(Object.fromEntries(formData))
  if (!p.success) return invalid(p.error)
  const db = getAdminSupabase()
  const { data: mp } = await db.from('managed_properties').select('reference, title, owner_user_id, owner_name, owner_email').eq('id', id).maybeSingle()
  if (!mp) return fail('Not found.')
  const { error } = await db.from('owner_messages').insert({ managed_property_id: id, sender: 'hagerland', sender_name: p.data.sender_name, body: p.data.body })
  if (error) return fail('Could not send the reply.')
  await db.from('owner_messages').update({ read_by_staff_at: new Date().toISOString() }).eq('managed_property_id', id).eq('sender', 'owner').is('read_by_staff_at', null)
  let to = mp.owner_email
  if (mp.owner_user_id) to = (await db.auth.admin.getUserById(mp.owner_user_id)).data.user?.email ?? to
  if (to) {
    await sendEmail({
      to,
      ...renderEmail({
        subject: `New message about ${mp.title} (${mp.reference})`,
        preheader: 'HagerLand Property Care replied in your owner portal.',
        heading: 'You have a new message',
        paragraphs: [`Hello ${mp.owner_name.split(' ')[0] || mp.owner_name},`, 'HagerLand Property Care has replied to you in your owner portal. Sign in to read it.'],
        button: { label: 'Open the owner portal', href: canonicalUrl(`/owner/${id}`) },
        reason: 'You are receiving this because HagerLand manages a property for you.',
      }),
    })
  }
  await audit('managed_property.reply', { type: 'managed_property', id, label: mp.reference })
  revalidatePath(`/roodber8/managed-properties/${id}`)
  return ok({ message: to ? 'Reply sent and the owner emailed.' : 'Reply saved (the owner has no email on record).' })
}
