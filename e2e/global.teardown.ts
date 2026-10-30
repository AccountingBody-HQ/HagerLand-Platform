import { assertLocalStack, db, setPillarModes } from './helpers'

/**
 * QC-1a: after every run, every known switch goes back to its default on the LOCAL copy, so a crashed test never
 * leaves a switch on for the next run (Jobs, Supply, the clean-up modes, site-wide Amharic, Our Developments).
 */
export const SWITCH_DEFAULTS: Record<string, unknown> = {
  amharic_enabled: false,
  home_business_row: false,
  imports_cleanup_mode: 'dry_run',
  jobs_amharic: false,
  jobs_callbacks: false,
  jobs_data_cleanup_mode: 'dry_run',
  jobs_phone_apply: false,
  jobs_private_client_posts: false,
  jobs_recruitment_desk: false,
  jobs_reports_enabled: true,
  jobs_worker_register: false,
  org_verification_expiry: false,
  supply_catalogue_ordering: false,
  supply_partner_registration: false,
  supply_payment_details: '',
  supply_trade_pricing: false,
}

export default async function globalTeardown(): Promise<void> {
  assertLocalStack()
  const d = db()
  for (const [key, value] of Object.entries(SWITCH_DEFAULTS)) {
    const { error } = await d.from('site_settings').update({ value }).eq('key', key)
    if (error) throw new Error(`Could not reset ${key}: ${error.message}`)
  }
  // QC-1a: a test that moved a legal page's date by a switch leaves no date behind.
  const { error } = await d.from('site_settings').delete().eq('key', 'legal_switch_changed')
  if (error) throw new Error(`Could not reset legal_switch_changed: ${error.message}`)
  // The launch modes: Jobs live (direct and aggregate), Our Developments interest only.
  await setPillarModes('jobs', { direct: true, aggregate: true, interest: true })
  await setPillarModes('our-developments', { direct: false, aggregate: false, interest: true }, { service: true })
}
