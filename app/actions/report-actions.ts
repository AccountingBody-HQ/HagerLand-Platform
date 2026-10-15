'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { getClientIp, hashIp } from '@/lib/security'
import { rateLimit } from '@/lib/rate-limit'
import { isHoneypotFilled, verifyTurnstileToken } from '@/lib/turnstile'
import { optionalText } from '@/lib/validation/common'

const schema = z.object({
  entity_type: z.enum(['property', 'development', 'organisation', 'product']),
  entity_id: z.uuid(),
  reason: z.enum(['fraud', 'wrong_info', 'duplicate', 'offensive', 'already_sold', 'other'], { error: 'Choose a reason' }),
  details: optionalText(2000, 'Details'),
  reporter_contact: optionalText(254, 'Contact'),
})

export async function submitReportAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (isHoneypotFilled(formData)) return ok(undefined)
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const ip = getClientIp(await headers())
  const ipHash = hashIp(ip)
  if (!(await rateLimit(`report:${ipHash}`, 10, 3600)).allowed) return fail('Too many reports. Please try again later.')
  if (!(await verifyTurnstileToken(formData.get('cf-turnstile-response') as string | null, ip))) return fail('Please complete the security check and try again.')
  const { error } = await getAdminSupabase().from('reports').insert({ ...parsed.data, details: parsed.data.details ?? null, reporter_contact: parsed.data.reporter_contact ?? null, ip_hash: ipHash })
  if (error) return fail('We could not send your report. Please try again.')
  return ok(undefined, 'Thank you. Our team will look into it.')
}
