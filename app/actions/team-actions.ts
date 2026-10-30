'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getServerSupabase } from '@/lib/supabase/server'
import { getActiveMembership, getProfile, getUser, requireUser } from '@/lib/auth'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { emailSchema } from '@/lib/validation/common'
import { hashRequestToken, isWellFormedToken, newRequestToken } from '@/lib/service-requests/token'
import { rateLimit } from '@/lib/rate-limit'
import { sendEmail } from '@/lib/email/send'
import { teamInvitationEmail } from '@/lib/email/templates'
import { canonicalUrl } from '@/lib/site'
import { log } from '@/lib/log'
import { revalidateEntity } from '@/lib/revalidate'
import { accountConsentRefusal } from '@/lib/data-transfer-server'

type Done = ActionResult<{ message: string }>
const LAST_OWNER = 'This is the only owner. Make someone else an owner first.'

/** The active organisation, when the signed-in user is one of its owners or admins. */
async function managing() {
  await requireUser('/account/company/team')
  const active = await getActiveMembership()
  return active && (active.role === 'owner' || active.role === 'admin') ? active : null
}

/** Invite someone by email (spec 25.2i). Only owners can invite admins. */
export async function inviteMemberAction(_prev: Done | null, formData: FormData): Promise<Done> {
  const m = await managing()
  if (!m) return fail('Only owners and admins can invite people.')
  const parsed = z.object({ email: emailSchema, role: z.enum(['admin', 'member']) }).safeParse({ email: formData.get('email'), role: formData.get('role') })
  if (!parsed.success) return fail('Enter a valid email address.', { email: 'Enter a valid email address' })
  if (parsed.data.role === 'admin' && m.role !== 'owner') return fail('Only owners can invite admins.')
  if (!(await rateLimit(`team-invite:${m.org.id}`, 30, 86_400)).allowed) return fail('You have sent a lot of invitations today. Please try again tomorrow.')
  const db = getAdminSupabase()
  const user = await getUser()
  if (parsed.data.email === user?.email?.toLowerCase()) return fail('You are already in this team.')
  const { data: members } = await db.from('organisation_members').select('user_id').eq('org_id', m.org.id)
  for (const member of members ?? []) {
    const { data } = await db.auth.admin.getUserById(member.user_id)
    if (data.user?.email?.toLowerCase() === parsed.data.email) return fail('That person is already in your team.')
  }
  // A new invitation replaces any open one for the same email.
  await db.from('org_invitations').update({ revoked_at: new Date().toISOString() }).eq('org_id', m.org.id).eq('email', parsed.data.email).is('accepted_at', null).is('revoked_at', null)
  const t = newRequestToken()
  const { error } = await db.from('org_invitations').insert({ org_id: m.org.id, email: parsed.data.email, role: parsed.data.role, token_hash: t.hash, invited_by: user?.id ?? null })
  if (error) {
    log.error('team', 'invite failed', error)
    return fail('We could not create the invitation. Please try again.')
  }
  const profile = await getProfile()
  await sendEmail({ to: parsed.data.email, ...teamInvitationEmail({ orgName: m.org.name, inviterName: profile?.full_name ?? 'A colleague', role: parsed.data.role, link: canonicalUrl(`/invite/${t.token}`) }) })
  revalidatePath('/account/company/team')
  return ok({ message: `Invitation sent to ${parsed.data.email}.` })
}

export async function revokeInvitationAction(id: string): Promise<Done> {
  const m = await managing()
  if (!m || !z.uuid().safeParse(id).success) return fail('Not allowed.')
  const { data } = await getAdminSupabase().from('org_invitations').update({ revoked_at: new Date().toISOString() }).eq('id', id).eq('org_id', m.org.id).is('accepted_at', null).select('id').maybeSingle()
  if (!data) return fail('That invitation has already been used or cancelled.')
  revalidatePath('/account/company/team')
  return ok({ message: 'Invitation cancelled.' })
}

/** Change a member's role. Only owners can make or unmake owners and admins; the last owner is protected. */
export async function changeRoleAction(userId: string, role: 'owner' | 'admin' | 'member'): Promise<Done> {
  const m = await managing()
  const parsed = z.object({ userId: z.uuid(), role: z.enum(['owner', 'admin', 'member']) }).safeParse({ userId, role })
  if (!m || !parsed.success) return fail('Not allowed.')
  const db = getAdminSupabase()
  const { data: target } = await db.from('organisation_members').select('role').eq('org_id', m.org.id).eq('user_id', parsed.data.userId).maybeSingle()
  if (!target) return fail('That person is not in your team.')
  if (m.role !== 'owner' && (target.role !== 'member' || parsed.data.role !== 'member')) return fail('Only owners can change owners and admins.')
  const { error } = await db.from('organisation_members').update({ role: parsed.data.role }).eq('org_id', m.org.id).eq('user_id', parsed.data.userId)
  if (error) return fail(error.message.includes('at least one owner') ? LAST_OWNER : 'We could not change the role.')
  revalidatePath('/account/company/team')
  return ok({ message: 'Role updated.' })
}

/** Ownership transfer: the new person becomes an owner and the current owner becomes an admin. */
export async function transferOwnershipAction(userId: string): Promise<Done> {
  const m = await managing()
  if (!m || m.role !== 'owner' || !z.uuid().safeParse(userId).success) return fail('Only an owner can transfer ownership.')
  const me = await getUser()
  if (!me || me.id === userId) return fail('Choose someone else.')
  const db = getAdminSupabase()
  const { data: target } = await db.from('organisation_members').select('role').eq('org_id', m.org.id).eq('user_id', userId).maybeSingle()
  if (!target) return fail('That person is not in your team.')
  const first = await db.from('organisation_members').update({ role: 'owner' }).eq('org_id', m.org.id).eq('user_id', userId)
  if (first.error) return fail('We could not transfer ownership.')
  const second = await db.from('organisation_members').update({ role: 'admin' }).eq('org_id', m.org.id).eq('user_id', me.id)
  if (second.error) return fail('We could not transfer ownership.')
  revalidatePath('/account/company/team')
  return ok({ message: 'Ownership transferred. You are now an admin.' })
}

/** Remove a member (owners and admins), or leave the organisation yourself. */
export async function removeMemberAction(userId: string): Promise<Done> {
  await requireUser('/account/company/team')
  const me = await getUser()
  const active = await getActiveMembership()
  if (!me || !active || !z.uuid().safeParse(userId).success) return fail('Not allowed.')
  const self = userId === me.id
  const db = getAdminSupabase()
  const { data: target } = await db.from('organisation_members').select('role').eq('org_id', active.org.id).eq('user_id', userId).maybeSingle()
  if (!target) return fail('That person is not in your team.')
  if (!self && !(active.role === 'owner' || (active.role === 'admin' && target.role === 'member'))) return fail('You cannot remove this person.')
  const { error } = await db.from('organisation_members').delete().eq('org_id', active.org.id).eq('user_id', userId)
  if (error) return fail(error.message.includes('at least one owner') ? LAST_OWNER : 'We could not remove this person.')
  if (self) redirect('/account')
  revalidatePath('/account/company/team')
  return ok({ message: 'Removed from the team.' })
}

/** Accept an invitation: only with the invited email address, before it expires. */
export async function acceptInvitationAction(token: string): Promise<Done> {
  const user = await requireUser(`/invite/${token}`)
  // QC-2: signed-in forms rely on the account's data-transfer notice (confirmed at the top of the account pages).
  const consentRefusal = await accountConsentRefusal(user.id)
  if (consentRefusal) return fail(consentRefusal)
  if (!isWellFormedToken(token)) return fail('This invitation link is not valid.')
  const db = getAdminSupabase()
  const { data: inv } = await db.from('org_invitations').select('id, org_id, email, role, expires_at, accepted_at, revoked_at').eq('token_hash', hashRequestToken(token)).maybeSingle()
  if (!inv || inv.revoked_at) return fail('This invitation is no longer valid. Ask for a new one.')
  if (inv.accepted_at) return fail('This invitation has already been used.')
  if (new Date(inv.expires_at).getTime() < Date.now()) return fail('This invitation has expired. Ask for a new one.')
  if (user.email?.toLowerCase() !== inv.email) return fail(`This invitation is for ${inv.email}. Sign in with that email address to accept it.`)
  const { error } = await db.from('organisation_members').upsert({ org_id: inv.org_id, user_id: user.id, role: inv.role }, { onConflict: 'org_id,user_id', ignoreDuplicates: true })
  if (error) return fail('We could not add you to the team. Please try again.')
  await db.from('org_invitations').update({ accepted_at: new Date().toISOString(), accepted_by: user.id }).eq('id', inv.id)
  await db.from('profiles').update({ account_type: 'business' }).eq('id', user.id)
  redirect(`/account?joined=${inv.org_id}`)
}

const branchSchema = z.object({
  id: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.uuid().optional()),
  name: z.string().trim().min(2, 'Enter the branch name').max(120),
  location_id: z.preprocess((v) => (v === '' || v === null ? null : v), z.uuid().nullable()),
  address_line: z.string().trim().max(200).transform((v) => v || null),
  opening_note: z.string().trim().max(200).transform((v) => v || null),
})

/** Add or edit a branch of the active organisation (spec 25.2i). Row level security limits this to owners and admins. */
export async function saveBranchAction(_prev: Done | null, formData: FormData): Promise<Done> {
  const m = await managing()
  if (!m) return fail('Only owners and admins can manage branches.')
  const parsed = branchSchema.safeParse({ id: formData.get('id'), name: formData.get('name'), location_id: formData.get('location_id'), address_line: formData.get('address_line') ?? '', opening_note: formData.get('opening_note') ?? '' })
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Please check the branch.')
  const { id, ...values } = parsed.data
  const supabase = getServerSupabase()
  const { error } = id ? await supabase.from('org_branches').update(values).eq('id', id).eq('org_id', m.org.id) : await supabase.from('org_branches').insert({ ...values, org_id: m.org.id })
  if (error) return fail('We could not save the branch.')
  revalidatePath('/account/company/branches')
  revalidateEntity('organisation', m.org.id)
  return ok({ message: id ? 'Branch updated.' : 'Branch added.' })
}

export async function deleteBranchAction(id: string): Promise<Done> {
  const m = await managing()
  if (!m || !z.uuid().safeParse(id).success) return fail('Not allowed.')
  const { error } = await getServerSupabase().from('org_branches').delete().eq('id', id).eq('org_id', m.org.id)
  if (error) return fail('We could not remove the branch.')
  revalidatePath('/account/company/branches')
  revalidateEntity('organisation', m.org.id)
  return ok({ message: 'Branch removed.' })
}
