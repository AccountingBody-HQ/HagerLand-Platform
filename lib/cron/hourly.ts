import 'server-only'
// S6-2 hourly job (vercel.json; the same CRON_SECRET as the daily job): ends reservations whose time has passed and
// tells each customer once; sends any missed "delivered" email. Does nothing while catalogue ordering is off. Each step
// runs on its own (one failing never stops the other) and every run is recorded in the audit log ("cron.hourly").
import { getAdminSupabase } from '@/lib/supabase/admin'
import { readSupplySwitches } from '@/lib/supply/partner-switches'
import { expireDueOrderRequests, sendMissedDeliveredEmails } from '@/lib/supply/order-requests-data'
import { log } from '@/lib/log'

export const HOURLY_RUN_ACTION = 'cron.hourly'

export interface HourlySummary {
  ordering: boolean
  expired: number
  deliveredEmails: number
  failedSteps: string[]
}

export async function runHourly(now = Date.now()): Promise<HourlySummary> {
  const summary: HourlySummary = { ordering: false, expired: 0, deliveredEmails: 0, failedSteps: [] }
  summary.ordering = (await readSupplySwitches()).catalogueOrdering
  if (summary.ordering) {
    try {
      summary.expired = await expireDueOrderRequests('hourly job')
    } catch (err) {
      log.error('cron', 'hourly: order request expiry failed', err)
      summary.failedSteps.push('order request expiry')
    }
    try {
      summary.deliveredEmails = await sendMissedDeliveredEmails()
    } catch (err) {
      log.error('cron', 'hourly: delivered emails failed', err)
      summary.failedSteps.push('delivered emails')
    }
  }
  const { error } = await getAdminSupabase()
    .from('audit_log')
    .insert({
      actor: 'hourly job',
      action: HOURLY_RUN_ACTION,
      entity_type: 'cron',
      entity_label: summary.ordering ? `${summary.expired} reservations ended, ${summary.failedSteps.length} failed` : 'Catalogue ordering is off: nothing to do',
      diff: { started_at: new Date(now).toISOString(), ...summary },
    })
  if (error) log.error('cron', 'hourly run could not be recorded', error)
  return summary
}
