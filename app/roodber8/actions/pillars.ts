'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { adminActor, assertAdmin, audit, changedFields } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { PILLAR_KEYS } from '@/lib/pillars'
import { PILLARS_TAG } from '@/lib/data/pillars'
import { VERTICALS_TAG } from '@/lib/data/verticals'

type Msg = ActionResult<{ message: string }>

function refreshPublicSite() {
  revalidateTag(PILLARS_TAG)
  revalidateTag(VERTICALS_TAG)
  revalidateTag('home')
  revalidateTag('sitemap')
  revalidatePath('/', 'layout')
}

const gateSchema = z.object({
  capability_confirmed: z.literal(true, { error: 'Confirm that HagerLand (or its partners) can deliver this.' }),
  owner_name: z.string().trim().min(2, 'Name the person responsible.').max(120),
  regulatory_confirmed: z.literal(true, { error: 'Confirm regulatory clearance.' }),
  regulatory_note: z.string().trim().min(2, 'Add a note about the clearance.').max(500),
  regulatory_date: z.iso.date('Enter the date of the clearance.'),
  terms_pricing_set: z.boolean(),
  terms_note: z.string().trim().max(500),
})
export type GateInput = z.input<typeof gateSchema>

const modeSchema = z.object({
  pillar: z.enum(PILLAR_KEYS),
  service: z.string().regex(/^[a-z]+(-[a-z]+)*$/).nullable(),
  mode: z.enum(['direct', 'aggregate', 'interest']),
  on: z.boolean(),
})

/** Minimum verified providers or partners before Aggregate can be switched on (admin → Settings). */
async function minProviders(): Promise<number> {
  const { data } = await getAdminSupabase().from('site_settings').select('value').eq('key', 'stage_gate_min_providers').maybeSingle()
  const n = Number(data?.value)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 3
}

/**
 * Switches one mode of a pillar or sub-service (spec 26.3). Switching Direct or Aggregate ON requires the stage-gate
 * checklist (recorded in pillar_gate_checks and the audit log); switching any mode off needs no gate.
 */
export async function setPillarModeAction(input: { pillar: string; service: string | null; mode: string; on: boolean }, gate: GateInput | null): Promise<Msg> {
  await assertAdmin()
  const parsed = modeSchema.safeParse(input)
  if (!parsed.success) return fail('Invalid change.')
  const { pillar, service, mode, on } = parsed.data
  const db = getAdminSupabase()
  const column = (`${mode}_enabled`) as 'direct_enabled' | 'aggregate_enabled' | 'interest_enabled'
  const patch = mode === 'direct' ? { direct_enabled: on } : mode === 'aggregate' ? { aggregate_enabled: on } : { interest_enabled: on }
  const before = service
    ? (await db.from('pillar_services').select('name, pillar_key, direct_enabled, aggregate_enabled, interest_enabled').eq('key', service).maybeSingle()).data
    : (await db.from('pillars').select('name, direct_enabled, aggregate_enabled, interest_enabled').eq('key', pillar).maybeSingle()).data
  if (!before || (service && 'pillar_key' in before && before.pillar_key !== pillar)) return fail('Not found.')
  if (before[column] === on) return ok({ message: 'No change.' })

  let answers: Record<string, unknown> | null = null
  if (on && mode !== 'interest') {
    const g = gateSchema.safeParse(gate)
    if (!g.success) return fail(g.error.issues[0]?.message ?? 'Complete the checklist.')
    const required = mode === 'aggregate' ? await minProviders() : 0
    const { data: count } = mode === 'aggregate' ? await db.rpc('pillar_active_providers', { p_pillar: pillar }) : { data: 0 }
    const active = typeof count === 'number' ? count : 0
    if (mode === 'aggregate' && active < required) {
      return fail(`Aggregate needs at least ${required} verified, live provider${required === 1 ? '' : 's'} or partner${required === 1 ? '' : 's'} for this pillar. There ${active === 1 ? 'is' : 'are'} ${active} now.`)
    }
    const row = { pillar_key: pillar, service_key: service, mode, ...g.data, terms_note: g.data.terms_note || null, providers_required: required, providers_active: active, actor: await adminActor() }
    const { error } = await db.from('pillar_gate_checks').insert(row)
    if (error) return fail('Could not record the checklist.')
    answers = row
  }

  const { error } = service ? await db.from('pillar_services').update(patch).eq('key', service) : await db.from('pillars').update(patch).eq('key', pillar)
  if (error) return fail(error.code === '42501' ? 'Complete the stage-gate checklist first.' : 'Could not change the mode.')
  await audit(`pillar.mode.${on ? 'on' : 'off'}`, { type: service ? 'pillar_service' : 'pillar', label: before.name }, { pillar, service, mode, on, gate: answers })
  refreshPublicSite()
  const label = mode === 'direct' ? 'Direct' : mode === 'aggregate' ? 'Aggregate' : 'Interest capture'
  return ok({ message: `${label} is now ${on ? 'on' : 'off'} for ${before.name}.` })
}

const textSchema = z.object({
  key: z.enum(PILLAR_KEYS),
  name: z.string().trim().min(2).max(60),
  nav_label: z.string().trim().min(2).max(40),
  tagline: z.string().trim().max(120),
  description: z.string().trim().max(1200),
  direct_owner: z.string().trim().max(120),
  seo_title: z.string().trim().max(70),
  seo_description: z.string().trim().max(170),
})

/** Editable pillar text (hub intro, menu label, search fields). */
export async function savePillarAction(input: z.input<typeof textSchema>): Promise<Msg> {
  await assertAdmin()
  const parsed = textSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the fields.')
  const { key, ...d } = parsed.data
  const db = getAdminSupabase()
  const { data: before } = await db.from('pillars').select('name, nav_label, tagline, description, direct_owner, seo_title, seo_description').eq('key', key).maybeSingle()
  if (!before) return fail('Not found.')
  const next = { ...d, direct_owner: d.direct_owner || null, seo_title: d.seo_title || null, seo_description: d.seo_description || null }
  const { error } = await db.from('pillars').update(next).eq('key', key)
  if (error) return fail('Could not save.')
  await audit('pillar.update', { type: 'pillar', label: d.name }, changedFields(before, next))
  refreshPublicSite()
  return ok({ message: 'Saved.' })
}
