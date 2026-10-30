'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getProfile, requireUser } from '@/lib/auth'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { rateLimit } from '@/lib/rate-limit'
import { textSchema } from '@/lib/validation/common'
import { serviceOn } from '@/lib/pillars'
import { getPillars } from '@/lib/data/pillars'
import { hagerlandInbox } from '@/lib/enquiries'
import { sendEmail } from '@/lib/email/send'
import { adminNoticeEmail } from '@/lib/email/templates'
import { canonicalUrl } from '@/lib/site'
import { accountConsentRefusal } from '@/lib/data-transfer-server'

type Msg = ActionResult<{ message: string }>

/** A message from the owner of a managed property to HagerLand (spec 26.7). */
export async function sendOwnerMessageAction(propertyId: string, _prev: Msg | null, formData: FormData): Promise<Msg> {
  const user = await requireUser('/owner')
  // QC-2: signed-in forms rely on the account's data-transfer notice (confirmed at the top of the account pages).
  const consentRefusal = await accountConsentRefusal(user.id)
  if (consentRefusal) return fail(consentRefusal)
  if (!serviceOn(await getPillars(), 'manage', 'owner-portal')) return fail('The owner portal is not available at the moment.')
  if (!z.uuid().safeParse(propertyId).success) return fail('Not found.')
  const p = z.object({ body: textSchema(4000, { min: 2, label: 'Message' }) }).safeParse(Object.fromEntries(formData))
  if (!p.success) return invalid(p.error)
  if (!(await rateLimit(`owner-msg:${user.id}`, 30, 86_400)).allowed) return fail('You have sent several messages today. Please call us if it is urgent.')
  const db = getAdminSupabase()
  const { data: mp } = await db.from('managed_properties').select('id, reference, title, owner_user_id, status').eq('id', propertyId).maybeSingle()
  if (!mp || mp.owner_user_id !== user.id || mp.status === 'ended') return fail('Not found.')
  const name = (await getProfile())?.full_name ?? user.email ?? 'Owner'
  const { error } = await db.from('owner_messages').insert({ managed_property_id: mp.id, sender: 'owner', sender_name: name.slice(0, 120), body: p.data.body })
  if (error) return fail('We could not send your message. Please try again.')
  const to = Array.from(new Set([await hagerlandInbox('general'), process.env.ADMIN_DIGEST_EMAIL].filter((x): x is string => Boolean(x))))
  if (to.length) await sendEmail({ to, ...(user.email ? { replyTo: user.email } : {}), ...adminNoticeEmail({ subject: `Owner message: ${mp.title} (${mp.reference})`, heading: 'New message from a Property Care owner', lines: [['Property', `${mp.reference} · ${mp.title}`], ['From', name]], adminUrl: canonicalUrl(`/roodber8/managed-properties/${mp.id}`) }) })
  revalidatePath(`/owner/${mp.id}`)
  return ok({ message: 'Message sent. We will reply here and by email.' })
}
