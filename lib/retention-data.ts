import 'server-only'
// F-5 keeping periods: the database side of the D3 clean-up kinds (rules in lib/retention.ts). Used by the shared
// daily clean-up (lib/jobs-cleanup-data.ts), so the same owner switch (Dry run → Live), run log and digest apply.
// Every read is complete (readAll / readAllIn, never more than 1,000 rows per request); a failed read throws (the
// failure rule). Every update is guarded by "personal_data_deleted_at is null", so a second run changes nothing.
// Files are deleted first, then the row is updated: a missing file is not an error, a failed delete leaves the row for
// tomorrow. Logs carry ids and counts only.
import { readAll, readAllIn, REPORT_MAX_ROWS } from '@/lib/admin/read-all'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { PRIVATE_BUCKET } from '@/lib/media'
import {
  DELETABLE_PREFIXES,
  FINISHED_ORDER,
  OPEN_BUILD_PROJECT,
  OPEN_PARTNER_APPLICATION,
  OPEN_SERVICE_REQUEST,
  auditKeep,
  clearedBuildProject,
  clearedCareRequest,
  clearedClaim,
  clearedDoNotContact,
  clearedDocument,
  clearedEnquiry,
  clearedInspection,
  clearedInvitation,
  clearedManagedProperty,
  clearedMatch,
  clearedOwnerMessage,
  clearedPartnerApplication,
  clearedPartnerDraft,
  clearedPartnerRegistration,
  CLEARED_DRAFT_STATUSES,
  partnerRegistrationDue,
  clearedQuoteItem,
  clearedQuoteRequest,
  clearedServiceRequest,
  clearedTradeAccount,
  latest,
  retentionCutoff,
  DELETE_BATCH,
  type RetentionKind,
} from '@/lib/retention'
import { REMOVED_NAME } from '@/lib/jobs-privacy'
import { ENDED_RELATIONSHIP } from '@/lib/supply/partner-rules'


const opts = { maxRows: REPORT_MAX_ROWS }
type Err = { message: string } | null
const check = <T extends { error: Err }>(r: T): T => {
  if (r.error) throw new Error(r.error.message)
  return r
}

/** Deletes private files by known prefix only; a file that is already gone is not an error. */
async function removeFiles(paths: (string | null | undefined)[], prefixes: string[]): Promise<void> {
  const mine = paths.filter((p): p is string => typeof p === 'string' && prefixes.some((pre) => p.startsWith(pre)))
  if (!mine.length) return
  const { error } = await getAdminSupabase().storage.from(PRIVATE_BUCKET).remove(mine)
  if (error) throw new Error(`files: ${error.message}`)
}

const M24 = { months: 24 }
const Y6 = { months: 72 }

/** Which records of one kind are due today (ids, all of them). Each kind is read on its own, so one unreadable table
 * never stops the others (the run records it as "could not be read"). */
export async function retentionDueKind(kind: RetentionKind, now: Date): Promise<string[]> {
  return DUE[kind](now)
}

const old = (cutoff: string) => (ts: string | null) => ts !== null && ts < cutoff

const DUE: Record<RetentionKind, (now: Date) => Promise<string[]>> = {
  // Enquiries: the latest of created, changed and first viewed.
  enquiries: async (now) => {
    const cutoff = retentionCutoff(now, M24)
    const { data } = await readAll(() => getAdminSupabase().from('enquiries').select('id, created_at, updated_at, first_viewed_at').is('personal_data_deleted_at', null).lt('updated_at', cutoff), opts)
    return data.filter((r) => old(cutoff)(latest(r.created_at, r.updated_at, r.first_viewed_at))).map((r) => r.id)
  },
  // Service requests: closed ones, after the latest of the request's and its matches' changes; never while a
  // recruitment assignment or a call-back on it is still open.
  service_requests: async (now) => {
    const db = getAdminSupabase()
    const cutoff = retentionCutoff(now, M24)
    const { data: srq } = await readAll(() => db.from('service_requests').select('id, updated_at, closed_at').is('personal_data_deleted_at', null).not('status', 'in', `(${OPEN_SERVICE_REQUEST.join(',')})`).lt('updated_at', cutoff), opts)
    const ids = srq.map((r) => r.id)
    const [{ data: matches }, { data: desk }, { data: calls }] = await Promise.all([
      readAllIn(ids, (part) => db.from('service_request_matches').select('id, request_id, updated_at').in('request_id', part), opts),
      readAllIn(ids, (part) => db.from('recruitment_assignments').select('id, service_request_id').in('service_request_id', part).is('closed_at', null), opts),
      readAllIn(ids, (part) => db.from('callback_requests').select('id, service_request_id').in('service_request_id', part).eq('status', 'open'), opts),
    ])
    const last = new Map<string, string | null>()
    for (const m of matches) last.set(m.request_id, latest(last.get(m.request_id), m.updated_at))
    const held = new Set([...desk.map((a) => a.service_request_id), ...calls.map((c) => c.service_request_id)])
    return srq.filter((r) => !held.has(r.id) && old(cutoff)(latest(r.updated_at, r.closed_at, last.get(r.id)))).map((r) => r.id)
  },
  // Quote requests: never while one of its orders is open (incl. disputed); after the latest of its and its orders' changes.
  quote_requests: async (now) => {
    const db = getAdminSupabase()
    const cutoff = retentionCutoff(now, M24)
    const { data: qr } = await readAll(() => db.from('quote_requests').select('id, updated_at, quoted_at').is('personal_data_deleted_at', null).lt('updated_at', cutoff), opts)
    const { data: orders } = await readAllIn(qr.map((r) => r.id), (part) => db.from('supply_orders').select('id, quote_request_id, status, updated_at').in('quote_request_id', part), opts)
    const held = new Set(orders.filter((o) => !FINISHED_ORDER.includes(o.status)).map((o) => o.quote_request_id))
    const last = new Map<string, string | null>()
    for (const o of orders) last.set(o.quote_request_id, latest(last.get(o.quote_request_id), o.updated_at))
    return qr.filter((r) => !held.has(r.id) && old(cutoff)(latest(r.updated_at, r.quoted_at, last.get(r.id)))).map((r) => r.id)
  },
  // Property Care enquiries: never while a property they led to is still managed.
  property_care: async (now) => {
    const db = getAdminSupabase()
    const cutoff = retentionCutoff(now, M24)
    const { data: pc } = await readAll(() => db.from('property_care_requests').select('id, updated_at').is('personal_data_deleted_at', null).lt('updated_at', cutoff), opts)
    const { data: managed } = await readAllIn(pc.map((r) => r.id), (part) => db.from('managed_properties').select('id, care_request_id, status').in('care_request_id', part).neq('status', 'ended'), opts)
    const held = new Set(managed.map((m) => m.care_request_id))
    return pc.filter((r) => !held.has(r.id)).map((r) => r.id)
  },
  // Managed properties: 24 months after the management ended (ended_at; before 0047 the last change).
  managed_properties: async (now) => {
    const cutoff = retentionCutoff(now, M24)
    const { data } = await readAll(() => getAdminSupabase().from('managed_properties').select('id, ended_at, updated_at').is('personal_data_deleted_at', null).eq('status', 'ended'), opts)
    return data.filter((r) => old(cutoff)(r.ended_at ?? r.updated_at)).map((r) => r.id)
  },
  // Building projects: not open, and no linked request still open; after the latest of its and its requests' changes.
  build_projects: async (now) => {
    const db = getAdminSupabase()
    const cutoff = retentionCutoff(now, M24)
    const { data: bp } = await readAll(() => db.from('build_projects').select('id, updated_at').is('personal_data_deleted_at', null).not('status', 'in', `(${OPEN_BUILD_PROJECT.join(',')})`).lt('updated_at', cutoff), opts)
    const ids = bp.map((r) => r.id)
    const [{ data: sr }, { data: qr }] = await Promise.all([
      readAllIn(ids, (part) => db.from('service_requests').select('id, project_id, status, updated_at').in('project_id', part), opts),
      readAllIn(ids, (part) => db.from('quote_requests').select('id, project_id, status, updated_at').in('project_id', part), opts),
    ])
    const held = new Set(sr.filter((r) => OPEN_SERVICE_REQUEST.includes(r.status)).map((r) => r.project_id))
    const last = new Map<string, string | null>()
    for (const r of [...sr, ...qr]) if (r.project_id) last.set(r.project_id, latest(last.get(r.project_id), r.updated_at))
    return bp.filter((r) => !held.has(r.id) && old(cutoff)(latest(r.updated_at, last.get(r.id)))).map((r) => r.id)
  },
  partner_applications: async (now) => {
    const cutoff = retentionCutoff(now, M24)
    const { data } = await readAll(() => getAdminSupabase().from('partner_applications').select('id').is('personal_data_deleted_at', null).not('status', 'in', `(${OPEN_PARTNER_APPLICATION.join(',')})`).lt('updated_at', cutoff), opts)
    return data.map((r) => r.id)
  },
  claims: async (now) => {
    const cutoff = retentionCutoff(now, M24)
    const { data } = await readAll(() => getAdminSupabase().from('claims').select('id, decided_at, updated_at').is('personal_data_deleted_at', null).neq('status', 'pending').lt('updated_at', cutoff), opts)
    return data.filter((r) => old(cutoff)(latest(r.decided_at, r.updated_at))).map((r) => r.id)
  },
  // Trade accounts: an approved account is kept while the person's account exists (deleting the account deletes it).
  trade_accounts: async (now) => {
    const cutoff = retentionCutoff(now, M24)
    const { data } = await readAll(() => getAdminSupabase().from('trade_accounts').select('id, decided_at, updated_at, status').is('personal_data_deleted_at', null).neq('status', 'approved').lt('updated_at', cutoff), opts)
    return data.filter((r) => old(cutoff)(latest(r.decided_at, r.updated_at))).map((r) => r.id)
  },
  // Supply contacts: 24 months after the last contact (or since added). Do-not-contact ones already cleared are done.
  supply_contacts: async (now) => {
    const cutoff = retentionCutoff(now, M24)
    const { data } = await readAll(() => getAdminSupabase().from('supply_contacts').select('id, last_contacted_at, created_at, do_not_contact, name, email, whatsapp, telegram, consent_note'), opts)
    return data
      .filter((r) => old(cutoff)(r.last_contacted_at ?? r.created_at))
      .filter((r) => !(r.do_not_contact && r.name === REMOVED_NAME && !r.email && !r.whatsapp && !r.telegram && !r.consent_note))
      .map((r) => r.id)
  },
  // S6-1 partner registrations: never while an approved partner's relationship is active (supply_partners).
  partner_registrations: async (now) => {
    const db = getAdminSupabase()
    const cutoff = retentionCutoff(now, M24)
    const { data: regs } = await readAll(() => db.from('partner_registrations').select('id, org_id, status, updated_at').is('personal_data_deleted_at', null).lt('updated_at', cutoff), opts)
    const { data: partners } = await readAllIn(Array.from(new Set(regs.map((r) => r.org_id))), (part) => db.from('supply_partners').select('org_id, relationship_status, status_changed_at, updated_at').in('org_id', part), opts)
    const rel = new Map(partners.map((p) => [p.org_id, p]))
    return regs
      .filter((r) => partnerRegistrationDue({ status: r.status, updated_at: r.updated_at, relationship_status: rel.get(r.org_id)?.relationship_status ?? null, relationship_changed_at: latest(rel.get(r.org_id)?.status_changed_at, rel.get(r.org_id)?.updated_at) }, cutoff, ENDED_RELATIONSHIP))
      .map((r) => r.id)
  },
  // S6-1 partner product drafts: declined or withdrawn, 24 months after the decision.
  partner_drafts: async (now) => {
    const cutoff = retentionCutoff(now, M24)
    const { data } = await readAll(() => getAdminSupabase().from('partner_product_drafts').select('id, decided_at, updated_at').is('personal_data_deleted_at', null).in('status', CLEARED_DRAFT_STATUSES).lt('updated_at', cutoff), opts)
    return data.filter((r) => old(cutoff)(r.decided_at ?? r.updated_at)).map((r) => r.id)
  },
  // Audit log: older than 24 months, and money / data-protection entries only after 6 years.
  audit_log: async (now) => {
    const cutoff = retentionCutoff(now, M24)
    const sixYears = retentionCutoff(now, Y6)
    const { data } = await readAll(() => getAdminSupabase().from('audit_log').select('id, action, created_at').lt('created_at', cutoff), opts)
    return data.filter((r) => (auditKeep(r.action) === 'two_years' ? true : r.created_at < sixYears)).map((r) => r.id)
  },
}

/** Clears one record (kinds cleared row by row). */
export async function clearRetention(kind: RetentionKind, id: string, at: string): Promise<void> {
  const db = getAdminSupabase()
  switch (kind) {
    case 'enquiries':
      check(await db.from('enquiries').update(clearedEnquiry(at)).eq('id', id).is('personal_data_deleted_at', null))
      return
    case 'service_requests': {
      const { data: r } = check(await db.from('service_requests').select('attachment_paths').eq('id', id).is('personal_data_deleted_at', null).maybeSingle())
      if (!r) return
      const { data: matches } = check(await db.from('service_request_matches').select('id, status, quote_document_path').eq('request_id', id))
      await removeFiles(r.attachment_paths ?? [], [DELETABLE_PREFIXES.request])
      await removeFiles((matches ?? []).filter((m) => m.status !== 'won').map((m) => m.quote_document_path), [DELETABLE_PREFIXES.match])
      for (const m of matches ?? []) check(await db.from('service_request_matches').update(clearedMatch(m.status === 'won')).eq('id', m.id))
      check(await db.from('service_requests').update(clearedServiceRequest(at)).eq('id', id).is('personal_data_deleted_at', null))
      return
    }
    case 'quote_requests': {
      const { data: q } = check(await db.from('quote_requests').select('materials_file_path, materials_file_paths, quote_document_path').eq('id', id).is('personal_data_deleted_at', null).maybeSingle())
      if (!q) return
      const { count: orders } = check(await db.from('supply_orders').select('id', { count: 'exact', head: true }).eq('quote_request_id', id))
      const keepQuote = (orders ?? 0) > 0
      await removeFiles([q.materials_file_path, ...(q.materials_file_paths ?? []), ...(keepQuote ? [] : [q.quote_document_path])], [DELETABLE_PREFIXES.materials, DELETABLE_PREFIXES.quote])
      check(await db.from('quote_request_items').update(clearedQuoteItem).eq('quote_request_id', id))
      check(await db.from('quote_requests').update(clearedQuoteRequest(at, keepQuote)).eq('id', id).is('personal_data_deleted_at', null))
      return
    }
    case 'property_care':
      check(await db.from('property_care_requests').update(clearedCareRequest(at)).eq('id', id).is('personal_data_deleted_at', null))
      return
    case 'managed_properties': {
      const { data: p } = check(await db.from('managed_properties').select('id').eq('id', id).is('personal_data_deleted_at', null).maybeSingle())
      if (!p) return
      const { data: inspections } = check(await db.from('property_inspections').select('id, photo_paths').eq('managed_property_id', id))
      const { data: documents } = check(await db.from('managed_property_documents').select('id, storage_path').eq('managed_property_id', id))
      await removeFiles((inspections ?? []).flatMap((i) => i.photo_paths ?? []), [DELETABLE_PREFIXES.inspection])
      await removeFiles((documents ?? []).map((d) => d.storage_path), [DELETABLE_PREFIXES.agency])
      if ((inspections ?? []).length) check(await db.from('property_inspections').update(clearedInspection).eq('managed_property_id', id))
      if ((documents ?? []).length) check(await db.from('managed_property_documents').update(clearedDocument).eq('managed_property_id', id))
      check(await db.from('owner_messages').update(clearedOwnerMessage).eq('managed_property_id', id))
      check(await db.from('managed_properties').update(clearedManagedProperty(at)).eq('id', id).is('personal_data_deleted_at', null))
      return
    }
    case 'build_projects':
      check(await db.from('build_projects').update(clearedBuildProject(at)).eq('id', id).is('personal_data_deleted_at', null))
      return
    case 'partner_applications':
      check(await db.from('partner_applications').update(clearedPartnerApplication(at)).eq('id', id).is('personal_data_deleted_at', null))
      return
    case 'claims': {
      const { data: c } = check(await db.from('claims').select('evidence_paths').eq('id', id).is('personal_data_deleted_at', null).maybeSingle())
      if (!c) return
      await removeFiles(c.evidence_paths ?? [], [DELETABLE_PREFIXES.claim])
      check(await db.from('claims').update(clearedClaim(at)).eq('id', id).is('personal_data_deleted_at', null))
      return
    }
    case 'trade_accounts':
      check(await db.from('trade_accounts').update(clearedTradeAccount(at)).eq('id', id).is('personal_data_deleted_at', null))
      return
    case 'partner_registrations':
      check(await db.from('partner_registrations').update(clearedPartnerRegistration(at)).eq('id', id).is('personal_data_deleted_at', null))
      return
    case 'partner_drafts': {
      const { data: d } = check(await db.from('partner_product_drafts').select('photo_paths').eq('id', id).is('personal_data_deleted_at', null).in('status', CLEARED_DRAFT_STATUSES).maybeSingle())
      if (!d) return
      await removeFiles(d.photo_paths ?? [], [DELETABLE_PREFIXES.partner])
      check(await db.from('partner_product_drafts').update(clearedPartnerDraft(at)).eq('id', id).is('personal_data_deleted_at', null).in('status', CLEARED_DRAFT_STATUSES))
      return
    }
    case 'supply_contacts':
    case 'audit_log':
      await clearRetentionBatch(kind, [id])
      return
  }
}

/**
 * Batch kinds: supply contacts (deleted, except do-not-contact ones, which are cleared but kept) and audit entries
 * (deleted), in id batches of at most 500. Returns how many were deleted or cleared.
 */
export async function clearRetentionBatch(kind: 'supply_contacts' | 'audit_log', ids: string[]): Promise<number> {
  const db = getAdminSupabase()
  let done = 0
  for (let i = 0; i < ids.length; i += DELETE_BATCH) {
    const part = ids.slice(i, i + DELETE_BATCH)
    if (kind === 'audit_log') {
      const { data } = check(await db.from('audit_log').delete().in('id', part).select('id'))
      done += data?.length ?? 0
      continue
    }
    const { data: rows } = check(await db.from('supply_contacts').select('id, do_not_contact').in('id', part))
    const keep = (rows ?? []).filter((r) => r.do_not_contact).map((r) => r.id)
    const drop = (rows ?? []).filter((r) => !r.do_not_contact).map((r) => r.id)
    if (drop.length) done += (check(await db.from('supply_contacts').delete().in('id', drop).select('id')).data ?? []).length
    if (keep.length) done += (check(await db.from('supply_contacts').update(clearedDoNotContact).in('id', keep).select('id')).data ?? []).length
  }
  return done
}

export interface AlwaysOnResult {
  errorsDeleted: number
  invitationsDeleted: number
  invitationsCleared: number
}

/**
 * Housekeeping that runs every day whatever the switch says (D4): error records 90 days after they were last seen;
 * invitations never accepted 30 days after they expired or were withdrawn; accepted ones lose their email and token
 * 24 months after acceptance.
 */
export async function runAlwaysOnCleanup(now: Date): Promise<AlwaysOnResult> {
  const db = getAdminSupabase()
  const ninety = retentionCutoff(now, { days: 90 })
  const thirty = retentionCutoff(now, { days: 30 })
  const twoYears = retentionCutoff(now, M24)
  const { data: errs } = await readAll(() => db.from('errors').select('id').lt('last_seen_at', ninety), opts)
  let errorsDeleted = 0
  for (let i = 0; i < errs.length; i += DELETE_BATCH) {
    errorsDeleted += (check(await db.from('errors').delete().in('id', errs.slice(i, i + DELETE_BATCH).map((e) => e.id)).select('id')).data ?? []).length
  }
  const { data: invites } = await readAll(() => db.from('org_invitations').select('id, expires_at, revoked_at, accepted_at, email'), opts)
  const unaccepted = invites.filter((r) => !r.accepted_at && (r.revoked_at ?? r.expires_at) < thirty).map((r) => r.id)
  let invitationsDeleted = 0
  for (let i = 0; i < unaccepted.length; i += DELETE_BATCH) {
    invitationsDeleted += (check(await db.from('org_invitations').delete().in('id', unaccepted.slice(i, i + DELETE_BATCH)).is('accepted_at', null).select('id')).data ?? []).length
  }
  // S6-1: partner-area invitations follow the same rules (they share the digest counts).
  const { data: partnerInvites } = await readAll(() => db.from('partner_invitations').select('id, expires_at, revoked_at, accepted_at, email'), opts)
  const partnerUnaccepted = partnerInvites.filter((r) => !r.accepted_at && (r.revoked_at ?? r.expires_at) < thirty).map((r) => r.id)
  for (let i = 0; i < partnerUnaccepted.length; i += DELETE_BATCH) {
    invitationsDeleted += (check(await db.from('partner_invitations').delete().in('id', partnerUnaccepted.slice(i, i + DELETE_BATCH)).is('accepted_at', null).select('id')).data ?? []).length
  }
  let invitationsCleared = 0
  for (const r of invites.filter((x) => x.accepted_at && x.accepted_at < twoYears && x.email !== '')) {
    check(await db.from('org_invitations').update(clearedInvitation(r.id)).eq('id', r.id).neq('email', ''))
    invitationsCleared++
  }
  for (const r of partnerInvites.filter((x) => x.accepted_at && x.accepted_at < twoYears && x.email !== '')) {
    check(await db.from('partner_invitations').update(clearedInvitation(r.id)).eq('id', r.id).neq('email', ''))
    invitationsCleared++
  }
  return { errorsDeleted, invitationsDeleted, invitationsCleared }
}
