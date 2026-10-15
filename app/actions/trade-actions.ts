'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getActiveMembership, getProfile, requireUser } from '@/lib/auth'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { optionalText, phoneSchema, textSchema } from '@/lib/validation/common'
import { rateLimit } from '@/lib/rate-limit'
import { sendEmail } from '@/lib/email/send'
import { adminNoticeEmail, tradeApplicationEmail } from '@/lib/email/templates'
import { hagerlandInbox } from '@/lib/enquiries'
import { canonicalUrl } from '@/lib/site'
import { log } from '@/lib/log'

const schema = z.object({
  business_name: textSchema(160, { min: 2, label: 'Business name' }),
  trade_type: textSchema(80, { min: 2, label: 'Type of business' }),
  phone: phoneSchema,
  tin: optionalText(40, 'TIN'),
  expected_monthly_spend: optionalText(80, 'Monthly spend'),
  notes: optionalText(2000, 'Notes'),
})

/** A signed-in business applies for a trade account; HagerLand decides (spec 25.2e). */
export async function applyTradeAction(_prev: ActionResult<{ reference: string }> | null, formData: FormData): Promise<ActionResult<{ reference: string }>> {
  const user = await requireUser('/supplies/trade')
  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  if (!(await rateLimit(`trade-apply:${user.id}`, 5, 86_400)).allowed) return fail('Please try again tomorrow.')
  const db = getAdminSupabase()
  const { data: existing } = await db.from('trade_accounts').select('status').eq('user_id', user.id).maybeSingle()
  if (existing && existing.status !== 'rejected') return fail(existing.status === 'approved' ? 'Your trade account is already approved.' : 'Your application is already with us.')
  const active = await getActiveMembership()
  const d = parsed.data
  const values = { user_id: user.id, org_id: active?.org.id ?? null, business_name: d.business_name, trade_type: d.trade_type, phone: d.phone, tin: d.tin ?? null, expected_monthly_spend: d.expected_monthly_spend ?? null, notes: d.notes ?? null, status: 'pending', admin_note: null, decided_at: null }
  const { data, error } = existing
    ? await db.from('trade_accounts').update(values).eq('user_id', user.id).select('reference').single()
    : await db.from('trade_accounts').insert(values).select('reference').single()
  if (error || !data) {
    log.error('trade', 'application failed', error)
    return fail('We could not send your application. Please try again.')
  }
  const profile = await getProfile()
  const admins = Array.from(new Set([await hagerlandInbox('supply'), process.env.ADMIN_DIGEST_EMAIL].filter((x): x is string => Boolean(x))))
  await Promise.all([
    user.email ? sendEmail({ to: user.email, from: 'supply', ...tradeApplicationEmail({ name: (profile?.full_name ?? '').split(' ')[0] || 'there', reference: data.reference }) }) : Promise.resolve(false),
    admins.length ? sendEmail({ to: admins, ...adminNoticeEmail({ subject: `Trade account application: ${d.business_name}`, heading: 'A trade account application needs a decision', lines: [['Business', d.business_name], ['Type', d.trade_type], ['Reference', data.reference]], adminUrl: canonicalUrl('/roodber8/trade-accounts') }) }) : Promise.resolve(false),
  ])
  revalidatePath('/supplies/trade')
  return ok({ reference: data.reference }, 'Thanks. We will email you when your application has been decided.')
}
