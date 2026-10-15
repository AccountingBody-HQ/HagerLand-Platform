import 'server-only'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getAgencyAvailability } from '@/lib/data/pillars'
import type { ContactRole } from '@/lib/agency'
import { log } from '@/lib/log'

export type AgencyEntity = 'contact' | 'instruction' | 'valuation' | 'viewing' | 'offer' | 'application' | 'tenancy'

/** Adds a line to a record's activity timeline (spec 26.5). Never throws. */
export async function logActivity(entityType: AgencyEntity, entityId: string, kind: 'created' | 'status' | 'note' | 'email' | 'document' | 'task' | 'link', text: string, actor = 'admin'): Promise<void> {
  const { error } = await getAdminSupabase().from('agency_activity').insert({ entity_type: entityType, entity_id: entityId, kind, text: text.slice(0, 2000), actor })
  if (error) log.error('agency', 'activity write failed', error)
}

/**
 * Finds the agency contact for this email (or, without an email, this phone) and adds the role, or creates it. Marketing consent is
 * only ever switched on here (with its time and source), never off: withdrawing consent is an admin action on request.
 */
export async function upsertContact(c: { name: string; email: string | null; phone: string | null; role: ContactRole; userId: string | null; countryCode?: string; timeZone?: string | null; consent: boolean; consentSource: string }): Promise<string | null> {
  const db = getAdminSupabase()
  const byEmail = c.email ? (await db.from('agency_contacts').select('id, roles, marketing_consent, user_id').ilike('email', c.email.replace(/[\\%_]/g, (m) => `\\${m}`)).limit(1).maybeSingle()).data : null
  // Match by email when one is given (two people can share a phone); by phone only for contacts without email.
  const existing = c.email ? byEmail : c.phone ? (await db.from('agency_contacts').select('id, roles, marketing_consent, user_id').eq('phone', c.phone).is('email', null).limit(1).maybeSingle()).data : null
  const consent = c.consent ? { marketing_consent: true, consent_at: new Date().toISOString(), consent_source: c.consentSource } : {}
  if (existing) {
    const roles = Array.from(new Set([...(existing.roles ?? []), c.role]))
    const { error } = await db
      .from('agency_contacts')
      .update({ roles, user_id: existing.user_id ?? c.userId, ...(c.consent && !existing.marketing_consent ? consent : {}) })
      .eq('id', existing.id)
    if (error) log.error('agency', 'contact update failed', error)
    return existing.id
  }
  const { data, error } = await db
    .from('agency_contacts')
    .insert({ name: c.name, email: c.email, phone: c.phone, roles: [c.role], user_id: c.userId, country_code: c.countryCode ?? 'ET', time_zone: c.timeZone ?? null, ...consent })
    .select('id')
    .single()
  if (error || !data) {
    log.error('agency', 'contact insert failed', error)
    return null
  }
  await logActivity('contact', data.id, 'created', `Contact created from ${c.consentSource}.`, 'website')
  return data.id
}

export interface AgencyListing {
  id: string
  slug: string
  title: string
  purpose: 'sale' | 'rent'
  instructionId: string | null
}

/**
 * A live listing HagerLand markets itself, and its instruction, if agency features are on for its side (sales or
 * lettings). Anything else returns null, so other listings keep the normal enquiry flow (spec 26.5).
 */
export async function getAgencyListing(propertyId: string): Promise<AgencyListing | null> {
  const db = getAdminSupabase()
  const { data: p } = await db.from('properties').select('id, slug, title, purpose, lister_type, status, expires_at').eq('id', propertyId).maybeSingle()
  if (!p || p.status !== 'published' || p.lister_type !== 'hagerland' || (p.expires_at && new Date(p.expires_at) < new Date())) return null
  const agency = await getAgencyAvailability()
  if (p.purpose === 'sale' ? !agency.sales : !agency.lettings) return null
  const { data: ins } = await db.from('agency_instructions').select('id').eq('property_id', p.id).in('stage', ['live', 'under_offer', 'let_agreed']).order('updated_at', { ascending: false }).limit(1).maybeSingle()
  return { id: p.id, slug: p.slug, title: p.title, purpose: p.purpose, instructionId: ins?.id ?? null }
}
