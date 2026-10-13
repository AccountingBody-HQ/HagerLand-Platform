'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getServerSupabase } from '@/lib/supabase/server'
import { getActiveMembership, requireUser } from '@/lib/auth'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { sendEmail } from '@/lib/email/send'
import { adminNoticeEmail } from '@/lib/email/templates'
import { canonicalUrl } from '@/lib/site'

const schema = z.object({
  trade_licence: z.string().min(1, 'Upload your trade licence'),
  tin_certificate: z.string().min(1, 'Upload your TIN certificate'),
  contractor_licence: z.string().optional(),
  agent_licence: z.string().optional(),
})

export async function submitVerificationAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUser('/account/company/verification')
  const active = await getActiveMembership()
  if (!active || !['owner', 'admin'].includes(active.role)) return fail('Only owners and admins can request verification.')
  const parsed = schema.safeParse(Object.fromEntries(Array.from(formData.entries()).filter(([, v]) => v !== '')))
  if (!parsed.success) return fail('Please upload the required documents.', Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])))
  const prefix = `docs/verification/${active.org.id}/`
  const docs = Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v))
  if (Object.values(docs).some((p) => !String(p).startsWith(prefix))) return fail('Please upload your documents again.')
  const { error } = await getServerSupabase().from('verification_requests').insert({ org_id: active.org.id, submitted_by: user.id, documents: docs })
  if (error) return fail(error.code === '23505' ? 'You already have a verification request waiting for review.' : 'We could not submit your documents. Please try again.')
  if (process.env.ADMIN_DIGEST_EMAIL) {
    await sendEmail({ to: process.env.ADMIN_DIGEST_EMAIL, ...adminNoticeEmail({ subject: `Verification request: ${active.org.name}`, heading: 'Documents submitted for verification', lines: [['Business', active.org.name]], adminUrl: canonicalUrl('/roodber8/review?tab=verification') }) })
  }
  revalidatePath('/account/company/verification')
  return ok(undefined, "Thanks. We'll check your documents within 1–2 business days.")
}
