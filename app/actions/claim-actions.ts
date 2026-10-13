'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getProfile, isEmailConfirmed, requireUser } from '@/lib/auth'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { emailSchema, phoneSchema, optionalText } from '@/lib/validation/common'
import { getClientIp } from '@/lib/security'
import { isHoneypotFilled, verifyTurnstileToken } from '@/lib/turnstile'
import { sendEmail } from '@/lib/email/send'
import { adminNoticeEmail, claimSubmittedEmail } from '@/lib/email/templates'
import { canonicalUrl } from '@/lib/site'

const schema = z.object({
  org_id: z.uuid(),
  relationship: z.enum(['owner', 'manager', 'employee'], { error: 'Tell us your role at the business' }),
  claimant_phone: phoneSchema,
  claimant_email: emailSchema,
  message: optionalText(2000, 'Message'),
  evidence_paths: z.array(z.string().max(300)).max(5),
})

export async function submitClaimAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUser()
  if (!isEmailConfirmed(user)) return fail('Please confirm your email address first.')
  if (isHoneypotFilled(formData)) return ok(undefined)
  const parsed = schema.safeParse({ ...Object.fromEntries(formData), evidence_paths: formData.getAll('evidence_paths') })
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  if (!(await verifyTurnstileToken(formData.get('cf-turnstile-response') as string | null, getClientIp(headers())))) return fail('Please complete the security check and try again.')
  if (d.evidence_paths.some((p) => !p.startsWith(`docs/claim/${d.org_id}/`))) return fail('Please upload your documents again.')

  const admin = getAdminSupabase()
  const { data: org } = await admin.from('organisations').select('id, name, status, verification_level').eq('id', d.org_id).maybeSingle()
  if (!org || org.status !== 'published') return fail('This business is not available to claim.')
  const { count: members } = await admin.from('organisation_members').select('user_id', { count: 'exact', head: true }).eq('org_id', d.org_id)
  if ((members ?? 0) > 0) return fail('This business is already managed by someone. If you think that is wrong, contact us.')

  const profile = await getProfile()
  const { error } = await getServerSupabase()
    .from('claims')
    .insert({ org_id: d.org_id, user_id: user.id, claimant_name: profile?.full_name ?? user.email ?? 'Unknown', claimant_phone: d.claimant_phone, claimant_email: d.claimant_email, relationship: d.relationship, message: d.message ?? null, evidence_paths: d.evidence_paths })
  if (error) return fail(error.code === '23505' ? 'You already have a claim waiting for review for this business.' : 'We could not send your claim. Please try again.')

  await sendEmail({ to: d.claimant_email, ...claimSubmittedEmail({ name: profile?.full_name?.split(' ')[0] ?? 'there', orgName: org.name }) })
  if (process.env.ADMIN_DIGEST_EMAIL) {
    await sendEmail({ to: process.env.ADMIN_DIGEST_EMAIL, ...adminNoticeEmail({ subject: `New claim: ${org.name}`, heading: 'A business claim needs review', lines: [['Business', org.name], ['Role', d.relationship]], adminUrl: canonicalUrl('/roodber8/review?tab=claims') }) })
  }
  return ok(undefined, "Thanks. We'll check your claim within 1–2 business days and email you.")
}
