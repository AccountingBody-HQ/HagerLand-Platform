'use server'

/** Admin area these actions belong to (staff roles are checked against it, spec 26.15). */
const AREA = '/roodber8/users'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdmin, audit } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { absoluteUrl } from '@/lib/site'
import { sendEmail } from '@/lib/email/send'
import { accountDeletedEmail } from '@/lib/email/templates'
import { log, maskEmail } from '@/lib/log'

type Msg = ActionResult<{ message: string }>
const idSchema = z.uuid()

/** Suspended users can still sign in and read, but every write is refused by the database (is_active_user()). */
export async function setSuspendedAction(userId: string, suspended: boolean): Promise<Msg> {
  await assertAdmin(AREA)
  if (!idSchema.safeParse(userId).success) return fail('Invalid user.')
  const { error } = await getAdminSupabase().from('profiles').update({ is_suspended: suspended }).eq('id', userId)
  if (error) return fail('Could not update the user.')
  await audit(suspended ? 'user.suspend' : 'user.unsuspend', { type: 'user', id: userId })
  revalidatePath(`/roodber8/users/${userId}`)
  revalidatePath('/roodber8/users')
  return ok({ message: suspended ? 'User suspended. They can no longer post or edit anything.' : 'Suspension lifted.' })
}

/** Sends Supabase's standard password reset email to the user's own address. */
export async function sendPasswordResetAction(userId: string): Promise<Msg> {
  await assertAdmin(AREA)
  if (!idSchema.safeParse(userId).success) return fail('Invalid user.')
  const db = getAdminSupabase()
  const { data } = await db.auth.admin.getUserById(userId)
  const email = data.user?.email
  if (!email) return fail('This user has no email address.')
  const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: absoluteUrl(`/auth/callback?next=${encodeURIComponent('/auth/update-password')}`) })
  if (error) {
    log.error('admin/users', 'password reset failed', error, { to: maskEmail(email) })
    return fail('Could not send the email. Try again in a minute.')
  }
  await audit('user.password_reset', { type: 'user', id: userId, label: maskEmail(email) })
  return ok({ message: `Password reset email sent to ${email}.` })
}

/**
 * Carries out a deletion request: takes down the user's private-owner listings, deletes the login
 * (the profile, memberships and saved items go with it), and emails a confirmation.
 * Records they sent or received elsewhere keep their contents but lose the link to the account.
 */
export async function deleteUserAction(userId: string, confirmEmail: string): Promise<Msg> {
  await assertAdmin(AREA)
  if (!idSchema.safeParse(userId).success) return fail('Invalid user.')
  const db = getAdminSupabase()
  const [{ data: auth }, { data: profile }, { data: owned }] = await Promise.all([
    db.auth.admin.getUserById(userId),
    db.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
    db.from('organisation_members').select('org_id, role').eq('user_id', userId).eq('role', 'owner'),
  ])
  const email = auth.user?.email ?? ''
  if (!auth.user) return fail('User not found.')
  if (confirmEmail.trim().toLowerCase() !== email.toLowerCase()) return fail('Type the user’s email address exactly to confirm.')
  for (const m of owned ?? []) {
    const { count } = await db.from('organisation_members').select('user_id', { count: 'exact', head: true }).eq('org_id', m.org_id).eq('role', 'owner').neq('user_id', userId)
    if (!count) return fail('This user is the only owner of a company. Add another owner to that company (or archive it) first.')
  }
  await db.from('properties').update({ status: 'removed' }).eq('lister_user_id', userId).is('lister_org_id', null).neq('status', 'removed')
  const { error } = await db.auth.admin.deleteUser(userId)
  if (error) {
    log.error('admin/users', 'delete failed', error)
    return fail('Could not delete the account.')
  }
  if (email) {
    const mail = accountDeletedEmail({ name: profile?.full_name?.split(' ')[0] || 'there' })
    await sendEmail({ to: email, ...mail })
  }
  await audit('user.delete', { type: 'user', id: userId, label: maskEmail(email) })
  revalidatePath('/roodber8/users')
  return ok({ message: 'Account deleted and confirmation sent.' })
}
