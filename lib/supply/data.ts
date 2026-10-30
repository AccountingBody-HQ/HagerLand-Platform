import 'server-only'
// Supply partners (admin): reads for the organisation panel and the partner list. Service role only: the tables
// have no grants, so nothing here is reachable by visitors, customers or suppliers.
import { readAll, readAllIn, REPORT_MAX_ROWS } from '@/lib/admin/read-all'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { escapeLikePattern } from '@/lib/security'
import { signedDocumentUrl } from '@/lib/storage'
import type { Database } from '@/lib/database.types'
import { normaliseSupplyPhone } from './phone'
import { businessNameKey, NAME_MATCH_THRESHOLD, nameSimilarity } from './partners'
import { todayInAddis } from '@/lib/supply/shortlist'

export type SupplyPartnerRow = Database['public']['Tables']['supply_partners']['Row']
export type SupplyContactRow = Database['public']['Tables']['supply_contacts']['Row']

export async function getSupplyPartner(orgId: string): Promise<{ partner: SupplyPartnerRow | null; contacts: SupplyContactRow[]; evidence: { path: string; url: string | null }[] }> {
  const db = getAdminSupabase()
  const [{ data: partner }, { data: contacts }] = await Promise.all([
    db.from('supply_partners').select('*').eq('org_id', orgId).maybeSingle(),
    db.from('supply_contacts').select('*').eq('org_id', orgId).order('created_at'),
  ])
  const evidence = await Promise.all((partner?.evidence_paths ?? []).map(async (path) => ({ path, url: await signedDocumentUrl(path) })))
  return { partner, contacts: contacts ?? [], evidence }
}

/** QC-1b: which of these organisations are private supply partners (a partner record, or named on a partner registration). */
export async function supplyPartnerOrgIds(orgIds: readonly string[]): Promise<Set<string>> {
  const db = getAdminSupabase()
  const [partners, registrations] = await Promise.all([
    readAllIn(orgIds, (part) => db.from('supply_partners').select('org_id').in('org_id', part), { maxRows: REPORT_MAX_ROWS, key: 'org_id' }),
    readAllIn(orgIds, (part) => db.from('partner_registrations').select('id, org_id').in('org_id', part), { maxRows: REPORT_MAX_ROWS }),
  ])
  return new Set([...partners.data, ...registrations.data].map((r) => r.org_id))
}

export interface PossibleDuplicate {
  id: string
  name: string
  status: string
  reason: string
}

/**
 * Organisations that may be the same business: the same phone (any normalised form) or a very similar name.
 * `id` is left out when checking a business that is not created yet.
 */
export async function findPossibleDuplicates(org: { id?: string; name: string; phone: string | null; whatsapp: string | null; telegram: string | null }): Promise<PossibleDuplicate[]> {
  const db = getAdminSupabase()
  const phones = Array.from(new Set([org.phone, org.whatsapp, org.telegram].map((p) => (p ? normaliseSupplyPhone(p) : null)).filter((p): p is string => Boolean(p))))
  const found = new Map<string, PossibleDuplicate>()
  const add = (o: { id: string; name: string; status: string }, reason: string) => {
    if (o.id !== org.id && !found.has(o.id)) found.set(o.id, { id: o.id, name: o.name, status: o.status, reason })
  }

  if (phones.length) {
    const [byPhone, byWhatsapp, byTelegram, contacts] = await Promise.all([
      db.from('organisations').select('id, name, status').in('phone', phones).limit(20),
      db.from('organisations').select('id, name, status').in('whatsapp', phones).limit(20),
      db.from('organisations').select('id, name, status').in('telegram', phones).limit(20),
      db.from('supply_contacts').select('org_id').in('phone_normalised', phones).limit(20),
    ])
    for (const o of [...(byPhone.data ?? []), ...(byWhatsapp.data ?? []), ...(byTelegram.data ?? [])]) add(o, 'Same phone number')
    const contactOrgs = Array.from(new Set((contacts.data ?? []).map((c) => c.org_id)))
    if (contactOrgs.length) {
      const { data } = await db.from('organisations').select('id, name, status').in('id', contactOrgs)
      for (const o of data ?? []) add(o, 'A contact there has the same phone number')
    }
  }

  // The longest distinctive word narrows the candidates; trigram similarity on the cleaned names decides.
  const word = businessNameKey(org.name).split(' ').sort((a, b) => b.length - a.length)[0]
  if (word && word.length >= 3) {
    const { data } = await db.from('organisations').select('id, name, status').ilike('name', `%${escapeLikePattern(word)}%`).limit(200)
    for (const o of data ?? []) if (nameSimilarity(org.name, o.name) >= NAME_MATCH_THRESHOLD) add(o, 'Similar name')
  }
  return Array.from(found.values()).slice(0, 20)
}

export interface PartnerListFilters {
  status?: string
  role?: string
  due?: boolean
  q?: string
}

export interface PartnerListRow {
  orgId: string
  name: string
  kind: string
  orgStatus: string
  location: string | null
  phone: string | null
  roles: string[]
  aka: string[]
  status: string
  statusChangedAt: string | null
  reverifyBy: string | null
}

/**
 * Supply partners for the admin list. Status, role and re-verification filters run in the database; the search
 * (name, other names, or any phone in normalised form) runs here, which suits the expected hundreds of partners.
 */
export async function listSupplyPartners(f: PartnerListFilters): Promise<PartnerListRow[]> {
  const db = getAdminSupabase()
  // Fix F-1: every partner, page by page (the search below runs here and must see them all).
  const { data } = await readAll(() => {
    let query = db
      .from('supply_partners')
      .select('org_id, roles, aka, relationship_status, status_changed_at, reverify_by, org:organisations!inner(name, kind, status, phone, whatsapp, telegram, location:locations(display_name))')
      .order('status_changed_at', { ascending: false, nullsFirst: false })
    if (f.status) query = query.eq('relationship_status', f.status)
    if (f.role) query = query.contains('roles', [f.role])
    if (f.due) query = query.lte('reverify_by', todayInAddis())
    return query
  }, { maxRows: REPORT_MAX_ROWS, key: 'org_id' })
  const phonesByOrg = new Map<string, string[]>()
  const rows: PartnerListRow[] = (data ?? []).map((r) => {
    const org = r.org as unknown as { name: string; kind: string; status: string; phone: string | null; whatsapp: string | null; telegram: string | null; location: { display_name: string } | null }
    phonesByOrg.set(r.org_id, [org.phone, org.whatsapp, org.telegram].map((p) => (p ? normaliseSupplyPhone(p) : null)).filter((p): p is string => Boolean(p)))
    return {
      orgId: r.org_id,
      name: org.name,
      kind: org.kind,
      orgStatus: org.status,
      location: org.location?.display_name ?? null,
      phone: org.phone ?? org.whatsapp,
      roles: r.roles,
      aka: r.aka,
      status: r.relationship_status,
      statusChangedAt: r.status_changed_at,
      reverifyBy: r.reverify_by,
    }
  })
  const q = f.q?.trim()
  if (!q) return rows

  const phone = /\d{6}/.test(q.replace(/\D/g, '')) ? normaliseSupplyPhone(q) : null
  if (phone) {
    const { data: contacts } = await readAll(() => db.from('supply_contacts').select('org_id').eq('phone_normalised', phone), { maxRows: REPORT_MAX_ROWS })
    const viaContacts = new Set((contacts ?? []).map((c) => c.org_id))
    return rows.filter((r) => viaContacts.has(r.orgId) || (phonesByOrg.get(r.orgId) ?? []).includes(phone))
  }
  const key = businessNameKey(q) || q.toLowerCase()
  return rows.filter((r) => [r.name, ...r.aka].some((n) => businessNameKey(n).includes(key) || n.toLowerCase().includes(q.toLowerCase())))
}
