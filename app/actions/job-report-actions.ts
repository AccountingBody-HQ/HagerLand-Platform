'use server'

import { headers } from 'next/headers'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getUser } from '@/lib/auth'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { getClientIp, hashIp } from '@/lib/security'
import { rateLimit } from '@/lib/rate-limit'
import { isHoneypotFilled, verifyTurnstileToken } from '@/lib/turnstile'
import { readJobsSwitches } from '@/lib/jobs-switches'
import { REPORT_LIMITS, REPORT_MESSAGES, jobReportSchema } from '@/lib/job-reports'
import { storeJobReport } from '@/lib/job-reports-data'
import { getJobsI18n } from '@/lib/i18n/server'
import { translateResult } from '@/lib/i18n/translate'

/**
 * "Report this job" (Jobs Phase 4): anyone, signed in or not. Turnstile, honeypot and limits (5 an hour, 20 a day per
 * connection). A repeat report on the same job gets the same thanks without being stored again. Messages are neutral
 * (AB's approved wording W17–W18): they never say whether the job, the report or a reporter exists.
 */
async function submitJobReportActionImpl(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (isHoneypotFilled(formData)) return ok(undefined, REPORT_MESSAGES.thanks)
  if (!(await readJobsSwitches()).reportsEnabled) return fail(REPORT_MESSAGES.failed)
  const parsed = jobReportSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const ip = getClientIp(await headers())
  const ipHash = hashIp(ip)
  const [hour, day] = await Promise.all([rateLimit(`jobreport:h:${ipHash}`, REPORT_LIMITS.hour, 3600), rateLimit(`jobreport:d:${ipHash}`, REPORT_LIMITS.day, 86_400)])
  if (!hour.allowed || !day.allowed) return fail(REPORT_MESSAGES.tooMany)
  if (!(await verifyTurnstileToken(formData.get('cf-turnstile-response') as string | null, ip))) return fail(REPORT_MESSAGES.security)
  const d = parsed.data
  // Only jobs that are on the board can be reported (private-client jobs only while that switch is on).
  const { data: job } = await getAdminSupabase().from('jobs_public').select('id').eq('id', d.job_id).maybeSingle()
  if (!job) return fail(REPORT_MESSAGES.failed)
  const user = await getUser()
  const res = await storeJobReport({ jobId: d.job_id, reason: d.reason, details: d.details ?? null, contact: d.contact ?? null, userId: user?.id ?? null, ipHash })
  if (res === 'failed') return fail(REPORT_MESSAGES.failed)
  return ok(undefined, REPORT_MESSAGES.thanks)
}

// Jobs Phase 5: the messages in the visitor's language (Amharic for Jobs: only native-reviewed text; English unchanged).
export async function submitJobReportAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return translateResult(await submitJobReportActionImpl(_prev, formData), (await getJobsI18n()).t)
}
