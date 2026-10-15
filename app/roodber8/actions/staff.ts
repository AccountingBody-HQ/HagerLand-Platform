'use server'

/** Admin area these actions belong to (staff roles are checked against it, spec 26.15). */
const AREA = '/roodber8/staff'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdmin, audit, adminActor } from '@/lib/admin/guard'
import { getAdminSession } from '@/lib/admin-auth'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { STAFF_ROLES, ROLE_LABEL } from '@/lib/admin/roles'
import { newInviteToken } from '@/lib/admin/staff-crypto'
import { sendEmail } from '@/lib/email/send'
import { renderEmail } from '@/lib/email/layout'
import { canonicalUrl } from '@/lib/site'

type Msg = ActionResult<{ message: string }>

/** Staff management is for the owner only: the master login or a staff member with the owner role (spec 26.15). */
async function assertOwner(): Promise<void> {
  await assertAdmin(AREA)
  const s = await getAdminSession()
  if (!s || (s.kind === 'staff' && s.role !== 'owner')) throw new Error('Unauthorized')
}

async function sendInvite(email: string, name: string, role: string, token: string) {
  await sendEmail({
    to: email,
    ...renderEmail({
      subject: 'You have been invited to HagerLand admin',
      preheader: 'Set your password and authenticator to start.',
      heading: 'Your HagerLand staff account',
      paragraphs: [`Hello ${name.split(' ')[0] || name},`, `You have been invited to HagerLand admin as: ${ROLE_LABEL[role as 'agent'] ?? role}. Set a password and connect an authenticator app (two-factor sign-in is required). The link works for 7 days.`, 'This is a staff account, separate from any HagerLand customer account.'],
      button: { label: 'Set up my account', href: canonicalUrl(`/roodber8-login/staff?token=${token}`) },
      reason: 'You are receiving this because the HagerLand owner invited you.',
    }),
  })
}

export async function inviteStaffAction(_prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertOwner()
  const p = z.object({ email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email')), name: z.string().trim().min(2, 'Enter their name').max(120), role: z.enum(STAFF_ROLES) }).safeParse(Object.fromEntries(formData))
  if (!p.success) return invalid(p.error)
  const db = getAdminSupabase()
  const { data: existing } = await db.from('staff_users').select('id').ilike('email', p.data.email.replace(/[\\%_]/g, (m) => `\\${m}`)).maybeSingle()
  if (existing) return fail('This email already has a staff account.')
  const t = newInviteToken()
  const { data, error } = await db.from('staff_users').insert({ email: p.data.email, name: p.data.name, role: p.data.role, invite_token_hash: t.hash, invite_expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString(), invited_by: await adminActor() }).select('id').single()
  if (error || !data) return fail('Could not create the invitation.')
  await sendInvite(p.data.email, p.data.name, p.data.role, t.token)
  await audit('staff.invite', { type: 'staff', id: data.id, label: p.data.email }, { role: p.data.role })
  revalidatePath('/roodber8/staff')
  return ok({ message: `Invitation sent to ${p.data.email}.` })
}

export async function setStaffRoleAction(id: string, role: string): Promise<Msg> {
  await assertOwner()
  const p = z.object({ id: z.uuid(), role: z.enum(STAFF_ROLES) }).safeParse({ id, role })
  if (!p.success) return fail('Invalid.')
  const db = getAdminSupabase()
  const { data: before } = await db.from('staff_users').select('email, role').eq('id', id).maybeSingle()
  if (!before) return fail('Not found.')
  await db.from('staff_users').update({ role: p.data.role }).eq('id', id)
  await audit('staff.role', { type: 'staff', id, label: before.email }, { role: { from: before.role, to: p.data.role } })
  revalidatePath('/roodber8/staff')
  return ok({ message: `Role changed. ${before.email} must sign in again.` })
}

/** Disabling ends the person's admin access at once (their next request is refused); enabling restores it. */
export async function setStaffDisabledAction(id: string, disabled: boolean): Promise<Msg> {
  await assertOwner()
  if (!z.uuid().safeParse(id).success) return fail('Invalid.')
  const s = await getAdminSession()
  if (s?.kind === 'staff' && s.id === id) return fail('You cannot disable your own account.')
  const db = getAdminSupabase()
  const { data: before } = await db.from('staff_users').select('email, status, totp_enrolled_at').eq('id', id).maybeSingle()
  if (!before) return fail('Not found.')
  const status = disabled ? 'disabled' : before.totp_enrolled_at ? 'active' : 'invited'
  await db.from('staff_users').update({ status, disabled_at: disabled ? new Date().toISOString() : null }).eq('id', id)
  await audit(disabled ? 'staff.disable' : 'staff.enable', { type: 'staff', id, label: before.email })
  revalidatePath('/roodber8/staff')
  return ok({ message: disabled ? `${before.email} can no longer sign in.` : `${before.email} is enabled again.` })
}

export async function resendStaffInviteAction(id: string): Promise<Msg> {
  await assertOwner()
  if (!z.uuid().safeParse(id).success) return fail('Invalid.')
  const db = getAdminSupabase()
  const { data: s } = await db.from('staff_users').select('email, name, role, status').eq('id', id).maybeSingle()
  if (!s || s.status !== 'invited') return fail('Only pending invitations can be sent again.')
  const t = newInviteToken()
  await db.from('staff_users').update({ invite_token_hash: t.hash, invite_expires_at: new Date(Date.now() + 7 * 86_400_000).toISOString() }).eq('id', id)
  await sendInvite(s.email, s.name, s.role, t.token)
  await audit('staff.invite_resend', { type: 'staff', id, label: s.email })
  return ok({ message: `Invitation sent again to ${s.email}.` })
}
