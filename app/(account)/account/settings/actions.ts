'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getServerSupabase } from '@/lib/supabase/server'
import { requireUser, getProfile } from '@/lib/auth'
import { emailSchema, nameSchema, optionalPhoneSchema, preferredContactSchema, checkbox } from '@/lib/validation/common'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { absoluteUrl, canonicalUrl } from '@/lib/site'
import { sendEmail } from '@/lib/email/send'
import { adminNoticeEmail } from '@/lib/email/templates'
import { getAdminSupabase } from '@/lib/supabase/admin'

const profileSchema = z.object({
  full_name: nameSchema,
  phone: optionalPhoneSchema,
  preferred_contact: preferredContactSchema,
  marketing_opt_in: checkbox,
})

export async function updateProfileAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUser('/account/settings')
  const parsed = profileSchema.safeParse({ ...Object.fromEntries(formData), marketing_opt_in: formData.get('marketing_opt_in') ?? 'false' })
  if (!parsed.success) return invalid(parsed.error)
  const { error } = await getServerSupabase()
    .from('profiles')
    .update({ full_name: parsed.data.full_name, phone: parsed.data.phone ?? null, preferred_contact: parsed.data.preferred_contact ?? null, marketing_opt_in: parsed.data.marketing_opt_in })
    .eq('id', user.id)
  if (error) return fail('We could not save your details. Please try again.')
  revalidatePath('/account', 'layout')
  return ok(undefined, 'Your details have been saved.')
}

export async function changeEmailAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireUser('/account/settings')
  const parsed = z.object({ email: emailSchema }).safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const { error } = await getServerSupabase().auth.updateUser({ email: parsed.data.email }, { emailRedirectTo: absoluteUrl('/auth/callback?next=/account/settings') })
  if (error) return fail(error.code === 'email_exists' ? 'That email is already used by another account.' : 'We could not change your email. Please try again.')
  return ok(undefined, `We've sent a confirmation link to ${parsed.data.email}. Your email changes when you open it.`)
}

export async function requestDeletionAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUser('/account/settings')
  if (String(formData.get('confirm') ?? '').trim().toUpperCase() !== 'DELETE') return fail('Type DELETE to confirm.', { confirm: 'Type DELETE to confirm' })
  const profile = await getProfile()
  const { error } = await getServerSupabase().from('profiles').update({ deletion_requested_at: new Date().toISOString() }).eq('id', user.id)
  if (error) return fail('We could not send your request. Please contact us.')
  await getAdminSupabase().from('audit_log').insert({ actor: user.id, action: 'account.deletion_requested', entity_type: 'profile', entity_id: user.id, entity_label: profile?.full_name ?? user.email ?? null })
  const adminEmail = process.env.ADMIN_DIGEST_EMAIL
  if (adminEmail) {
    await sendEmail({
      to: adminEmail,
      ...adminNoticeEmail({ subject: 'Account deletion request', heading: 'A user asked to delete their account', lines: [['User', profile?.full_name ?? ''], ['Email', user.email ?? '']], adminUrl: canonicalUrl('/roodber8/users') }),
    })
  }
  return ok(undefined, 'We have received your request. We will delete your account and personal data within 30 days and email you when it is done.')
}
