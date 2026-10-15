'use server'

/** Admin area these actions belong to (staff roles are checked against it, spec 26.15). */
const AREA = '/roodber8/verticals'

import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdmin, audit, changedFields } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { VERTICAL_KEYS } from '@/lib/verticals'
import { VERTICALS_TAG } from '@/lib/data/verticals'

type Msg = ActionResult<{ message: string }>

function refreshPublicSite() {
  revalidateTag(VERTICALS_TAG)
  revalidateTag('home')
  revalidateTag('sitemap')
  revalidatePath('/', 'layout')
}

/** One-click status switch for a vertical (spec 24.2), audit-logged. */
export async function setVerticalStatusAction(key: string, status: string): Promise<Msg> {
  await assertAdmin(AREA)
  const parsed = z.object({ key: z.enum(VERTICAL_KEYS), status: z.enum(['live', 'coming_soon', 'hidden']) }).safeParse({ key, status })
  if (!parsed.success) return fail('Invalid status.')
  const db = getAdminSupabase()
  const { data: before } = await db.from('verticals').select('name, status, controlled_by_pillar, controlled_by_service').eq('key', parsed.data.key).maybeSingle()
  if (!before) return fail('Not found.')
  if (before.controlled_by_pillar || before.controlled_by_service) return fail(`${before.name} follows its pillar's modes. Change it in Pillars and modes.`)
  if (before.status === parsed.data.status) return ok({ message: 'No change.' })
  const { error } = await db.from('verticals').update({ status: parsed.data.status }).eq('key', parsed.data.key)
  if (error) return fail('Could not change the status.')
  await audit('vertical.status', { type: 'vertical', label: before.name }, { key: parsed.data.key, status: { from: before.status, to: parsed.data.status } })
  refreshPublicSite()
  const label = parsed.data.status === 'coming_soon' ? 'Coming soon' : parsed.data.status === 'live' ? 'Live' : 'Hidden'
  return ok({ message: `${before.name} is now ${label}.` })
}

const textSchema = z.object({
  key: z.enum(VERTICAL_KEYS),
  name: z.string().trim().min(2).max(60),
  nav_label: z.string().trim().min(2).max(60),
  short_description: z.string().trim().max(200),
  intro: z.string().trim().max(1200),
  seo_title: z.string().trim().max(70),
  seo_description: z.string().trim().max(170),
  interest_enabled: z.boolean(),
  partner_signup_enabled: z.boolean(),
})

export async function saveVerticalAction(input: Omit<z.input<typeof textSchema>, 'key'> & { key: string }): Promise<Msg> {
  await assertAdmin(AREA)
  const parsed = textSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the fields.')
  const { key, ...d } = parsed.data
  const db = getAdminSupabase()
  const { data: before } = await db.from('verticals').select('name, nav_label, short_description, intro, seo_title, seo_description, interest_enabled, partner_signup_enabled').eq('key', key).maybeSingle()
  if (!before) return fail('Not found.')
  const next = { ...d, seo_title: d.seo_title || null, seo_description: d.seo_description || null }
  const { error } = await db.from('verticals').update(next).eq('key', key)
  if (error) return fail('Could not save.')
  await audit('vertical.update', { type: 'vertical', label: d.name }, changedFields(before, next))
  refreshPublicSite()
  return ok({ message: 'Saved.' })
}

const LEAD_TABLES = { interest: 'interest_registrations', partner: 'partner_applications' } as const
const LEAD_STATUSES = { interest: ['new', 'contacted', 'closed'], partner: ['new', 'reviewing', 'approved', 'declined'] } as const

/** Status and private notes for interest registrations and partner applications. */
export async function updateLeadAction(kind: 'interest' | 'partner', id: string, input: { status: string; admin_notes: string }): Promise<Msg> {
  await assertAdmin(AREA)
  const parsed = z
    .object({ id: z.uuid(), status: z.enum(LEAD_STATUSES[kind] as unknown as [string, ...string[]]), admin_notes: z.string().trim().max(4000) })
    .safeParse({ id, ...input })
  if (!parsed.success) return fail('Check the fields.')
  const db = getAdminSupabase()
  const table = LEAD_TABLES[kind]
  const { data: before } = await db.from(table).select('reference, status, admin_notes').eq('id', id).maybeSingle()
  if (!before) return fail('Not found.')
  const { error } = await db.from(table).update({ status: parsed.data.status, admin_notes: parsed.data.admin_notes || null }).eq('id', id)
  if (error) return fail('Could not save.')
  await audit(`${kind}.update`, { type: table, id, label: before.reference }, changedFields(before, { status: parsed.data.status, admin_notes: parsed.data.admin_notes || null }))
  revalidatePath(`/roodber8/${kind === 'interest' ? 'interest' : 'partners'}`)
  return ok({ message: 'Saved.' })
}
