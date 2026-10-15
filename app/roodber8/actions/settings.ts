'use server'

/** Admin area these actions belong to (staff roles are checked against it, spec 26.15). */
const AREA = '/roodber8/settings'

import { revalidatePath } from 'next/cache'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdmin, audit, changedFields } from '@/lib/admin/guard'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { revalidateSettings } from '@/lib/revalidate'
import type { Json } from '@/lib/database.types'
import {
  announcementSchema,
  businessSchema,
  contactSchema,
  homepageSchema,
  languageSchema,
  legalDatesSchema,
  legalSchema,
  parsePickRefs,
  SETTINGS_SECTIONS,
  socialSchema,
  thresholdsSchema,
  type SettingsSection,
  licencesSchema,
  licencesInput,
  gatesSchema,
  agencySchema,
} from '@/lib/validation/settings'

type Msg = ActionResult<{ message: string }>

function claimsFrom(formData: FormData): { title: string; text: string }[] {
  const out: { title: string; text: string }[] = []
  for (let i = 0; i < 8; i++) {
    const title = formData.get(`claim_title_${i}`)
    const text = formData.get(`claim_text_${i}`)
    if (typeof title === 'string' || typeof text === 'string') out.push({ title: String(title ?? ''), text: String(text ?? '') })
  }
  return out
}

/** Saves one section of admin → Settings into site_settings. Empty values hide the matching element on the site. */
export async function saveSettingsAction(section: SettingsSection, _prev: Msg | null, formData: FormData): Promise<Msg> {
  await assertAdmin(AREA)
  if (!SETTINGS_SECTIONS.includes(section)) return fail('Unknown settings section.')
  const input = Object.fromEntries(formData)
  const rows: { key: string; value: NonNullable<Json> }[] = []
  switch (section) {
    case 'contact': {
      const p = contactSchema.safeParse(input)
      if (!p.success) return invalid(p.error)
      rows.push({ key: 'contact_details', value: p.data })
      break
    }
    case 'social': {
      const p = socialSchema.safeParse(input)
      if (!p.success) return invalid(p.error)
      rows.push({ key: 'social_links', value: Object.fromEntries(Object.entries(p.data).filter(([, v]) => v)) })
      break
    }
    case 'legal': {
      const p = legalSchema.safeParse(input)
      if (!p.success) return invalid(p.error)
      rows.push({ key: 'legal_entity', value: p.data })
      break
    }
    case 'business': {
      const p = businessSchema.safeParse({ ...input, claims: claimsFrom(formData) })
      if (!p.success) return invalid(p.error)
      rows.push({ key: 'free_listing_confirmed', value: p.data.free_listing_confirmed }, { key: 'delivery_area', value: p.data.delivery_area }, { key: 'quote_response_target', value: p.data.quote_response_target }, { key: 'property_care_pricing', value: p.data.property_care_pricing }, { key: 'developments_claims', value: p.data.claims })
      break
    }
    case 'announcement': {
      const p = announcementSchema.safeParse(input)
      if (!p.success) return invalid(p.error)
      if (p.data.enabled && !p.data.text) return fail('Write the announcement text, or switch it off.', { text: 'Write the announcement text.' })
      rows.push({ key: 'announcement_bar', value: p.data })
      break
    }
    case 'thresholds': {
      const p = thresholdsSchema.safeParse(input)
      if (!p.success) return invalid(p.error)
      for (const [key, value] of Object.entries(p.data)) rows.push({ key, value })
      break
    }
    case 'legal_dates': {
      const p = legalDatesSchema.safeParse(input)
      if (!p.success) return invalid(p.error)
      rows.push({ key: 'legal_last_updated', value: Object.fromEntries(Object.entries(p.data).filter(([, v]) => v)) })
      break
    }
    case 'language': {
      const p = languageSchema.safeParse(input)
      if (!p.success) return invalid(p.error)
      rows.push({ key: 'amharic_enabled', value: p.data.amharic_enabled })
      break
    }
    case 'licences': {
      const p = licencesSchema.safeParse(licencesInput(input))
      if (!p.success) return invalid(p.error)
      rows.push({ key: 'licences', value: p.data })
      break
    }
    case 'gates': {
      const p = gatesSchema.safeParse(input)
      if (!p.success) return invalid(p.error)
      for (const [key, value] of Object.entries(p.data)) rows.push({ key, value })
      break
    }
    case 'agency': {
      const p = agencySchema.safeParse(input)
      if (!p.success) return invalid(p.error)
      for (const [key, value] of Object.entries(p.data)) rows.push({ key, value })
      break
    }
    case 'homepage': {
      const p = homepageSchema.safeParse(input)
      if (!p.success) return invalid(p.error)
      const refs = parsePickRefs(p.data.picks)
      const shortIds = refs.filter((r) => r.length === 8)
      const ids = refs.filter((r) => r.length !== 8)
      const db = getAdminSupabase()
      const [{ data: byShort }, { data: byId }] = await Promise.all([
        shortIds.length ? db.from('properties').select('id, short_id, status').in('short_id', shortIds) : Promise.resolve({ data: [] as { id: string; short_id: string; status: string }[] }),
        ids.length ? db.from('properties').select('id, short_id, status').in('id', ids) : Promise.resolve({ data: [] as { id: string; short_id: string; status: string }[] }),
      ])
      const found = [...(byShort ?? []), ...(byId ?? [])]
      const ordered = refs.map((r) => found.find((f) => f.short_id === r || f.id === r)).filter((f): f is NonNullable<typeof f> => Boolean(f))
      const missing = refs.length - ordered.length
      if (missing) return fail(`${missing} reference${missing === 1 ? ' was' : 's were'} not found. Use the 8-character reference shown on each property.`, { picks: 'Check the references.' })
      const notLive = ordered.filter((o) => o.status !== 'published')
      if (notLive.length) return fail(`Only live properties can be picked (${notLive.map((o) => o.short_id).join(', ')} ${notLive.length === 1 ? 'is' : 'are'} not live).`, { picks: 'Remove properties that are not live.' })
      rows.push({ key: 'homepage_featured_ids', value: Array.from(new Set(ordered.map((o) => o.id))) })
      break
    }
  }
  const db = getAdminSupabase()
  const { data: before } = await db.from('site_settings').select('key, value').in('key', rows.map((r) => r.key))
  const prev = Object.fromEntries((before ?? []).map((r) => [r.key, r.value]))
  const { error } = await db.from('site_settings').upsert(rows.map((r) => ({ key: r.key, value: r.value })))
  if (error) return fail('Could not save the settings.')
  await audit('settings.update', { type: 'settings', label: section }, changedFields(prev, Object.fromEntries(rows.map((r) => [r.key, r.value]))))
  revalidateSettings()
  revalidatePath('/', 'layout')
  return ok({ message: 'Saved. The website updates within a minute.' }, 'Saved. The website updates within a minute.')
}
