import 'server-only'
// Imports compliance (admin, service role): loads imported businesses with where each field came from, runs the
// clean-up (dry run unless the owner switched it to live), and records confirmations with the business. Never deletes
// a row; never touches a public or claimed business automatically. Rules: lib/imports/compliance.ts.
import { readAll, readAllIn, REPORT_MAX_ROWS } from '@/lib/admin/read-all'
import { getAdminSupabase } from '@/lib/supabase/admin'
import type { TablesUpdate } from '@/lib/database.types'
import { shortId } from '@/lib/slug'
import { todayInAddis } from '@/lib/supply/shortlist'
import { must } from '@/lib/supply/insights-data'
import { compliance, UNCONFIRMED_NAME, type Compliance, type ConfirmMethod, type FieldSource, type FieldSourceRow, type TrackedField } from './compliance'

export type CleanupMode = 'dry_run' | 'live'
export const MODE_KEY = 'imports_cleanup_mode'
export const MODE_LABEL: Record<CleanupMode, string> = { dry_run: 'Dry run — report only', live: 'Live — clear expired Google data' }

export interface ImportedRow {
  id: string
  name: string
  kind: string
  status: string
  claimed: boolean
  placeId: string | null
  importedAt: string
  supplyPartner: boolean
  sources: FieldSourceRow[]
  c: Compliance
}

/** Organisation columns behind each tracked field (what clearing empties). */
const COLUMNS: Record<TrackedField, TablesUpdate<'organisations'>> = {
  name: {},
  phone: { phone: null },
  address_line: { address_line: null },
  website: { website: null },
  description: { description: null },
  lat_lng: { lat: null, lng: null },
}

/** The columns to write to clear these fields; the name becomes the lead placeholder and the slug loses Google's name. */
export function clearingPatch(fields: TrackedField[]): TablesUpdate<'organisations'> {
  const patch: TablesUpdate<'organisations'> = {}
  for (const f of fields) Object.assign(patch, COLUMNS[f])
  if (fields.includes('name')) {
    patch.name = UNCONFIRMED_NAME
    patch.slug = `unconfirmed-lead-${shortId(6)}`
  }
  return patch
}

export async function getCleanupMode(): Promise<CleanupMode> {
  const { data } = must(await getAdminSupabase().from('site_settings').select('value').eq('key', MODE_KEY).maybeSingle())
  return data?.value === 'live' ? 'live' : 'dry_run'
}

/** Every business imported from Google (or with a field recorded as Google data), with its compliance state. */
export async function loadImported(today = todayInAddis()): Promise<ImportedRow[]> {
  const db = getAdminSupabase()
  const [{ data: orgs }, { data: rows }] = must(
    await Promise.all([
      readAll(() => db.from('organisations').select('id, name, kind, status, claimed_at, google_place_id, created_at, source').eq('source', 'import'), { maxRows: REPORT_MAX_ROWS }),
      readAll(() => db.from('org_field_sources').select('org_id, field, source, fetched_at, confirmed_at, cleared_at').eq('is_current', true), { maxRows: REPORT_MAX_ROWS }),
    ]),
  )
  const byOrg = new Map<string, FieldSourceRow[]>()
  for (const r of rows ?? []) byOrg.set(r.org_id, [...(byOrg.get(r.org_id) ?? []), { field: r.field as TrackedField, source: r.source as FieldSource, fetchedAt: r.fetched_at, confirmedAt: r.confirmed_at, clearedAt: r.cleared_at }])
  const imported = new Set((orgs ?? []).map((o) => o.id))
  const extraIds = Array.from(byOrg.keys()).filter((id) => !imported.has(id))
  // Fix F-1: long id lists in parts of 50, each read page by page (never one request with every imported business).
  const { data: extra } = await readAllIn(extraIds, (part) => db.from('organisations').select('id, name, kind, status, claimed_at, google_place_id, created_at, source').in('id', part), { maxRows: REPORT_MAX_ROWS })
  const all = [...(orgs ?? []), ...(extra ?? [])]
  const { data: partners } = await readAllIn(all.map((o) => o.id), (part) => db.from('supply_partners').select('org_id').in('org_id', part), { maxRows: REPORT_MAX_ROWS, key: 'org_id' })
  const supply = new Set((partners ?? []).map((p) => p.org_id))
  return all.map((o) => {
    const sources = byOrg.get(o.id) ?? []
    return {
      id: o.id,
      name: o.name,
      kind: o.kind,
      status: o.status,
      claimed: Boolean(o.claimed_at),
      placeId: o.google_place_id,
      importedAt: o.created_at,
      supplyPartner: supply.has(o.id),
      sources,
      c: compliance({ id: o.id, status: o.status, claimed: Boolean(o.claimed_at), sources }, today),
    }
  })
}

export interface FieldSourceDetail extends FieldSourceRow {
  confirmedBy: string | null
  method: string | null
  note: string | null
}

/** The current record of each field of one business (for its "Google data" panel). */
export async function orgFieldSources(orgId: string): Promise<FieldSourceDetail[]> {
  const { data } = must(await getAdminSupabase().from('org_field_sources').select('field, source, fetched_at, confirmed_at, cleared_at, confirmed_by, confirm_method, note').eq('org_id', orgId).eq('is_current', true))
  return (data ?? []).map((r) => ({ field: r.field as TrackedField, source: r.source as FieldSource, fetchedAt: r.fetched_at, confirmedAt: r.confirmed_at, clearedAt: r.cleared_at, confirmedBy: r.confirmed_by, method: r.confirm_method, note: r.note }))
}

/** Why an imported business cannot be published yet (null: it can, or it is not an import). For every publish path. */
export async function importPublishBlock(orgIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  if (!orgIds.length) return out
  const db = getAdminSupabase()
  const [{ data: orgs }, { data: rows }] = must(
    await Promise.all([
      readAllIn(orgIds, (part) => db.from('organisations').select('id, status, claimed_at, source').in('id', part).eq('source', 'import'), { maxRows: REPORT_MAX_ROWS }),
      readAllIn(orgIds, (part) => db.from('org_field_sources').select('org_id, field, source, fetched_at, confirmed_at, cleared_at').in('org_id', part).eq('is_current', true), { maxRows: REPORT_MAX_ROWS }),
    ]),
  )
  for (const o of orgs ?? []) {
    const sources = (rows ?? []).filter((r) => r.org_id === o.id).map((r) => ({ field: r.field as TrackedField, source: r.source as FieldSource, fetchedAt: r.fetched_at, confirmedAt: r.confirmed_at, clearedAt: r.cleared_at }))
    const block = compliance({ id: o.id, status: o.status, claimed: Boolean(o.claimed_at), sources }, todayInAddis()).publishBlock
    if (block) out.set(o.id, block)
  }
  return out
}

/**
 * Records that fields now hold HagerLand's own data (confirmed with the business, or edited by HagerLand): the old
 * record stays as history, the new one is current. `onlyTracked`: only fields already recorded (an edit of any other
 * organisation leaves no trace here).
 */
export async function recordFieldSources(
  orgId: string,
  fields: TrackedField[],
  meta: { source: Exclude<FieldSource, 'google_places'>; actor: string; method?: ConfirmMethod | null; confirmedAt?: string; note?: string | null; onlyTracked?: boolean },
): Promise<void> {
  if (!fields.length) return
  const db = getAdminSupabase()
  const [{ data: org }, { data: current }] = must(
    await Promise.all([
      db.from('organisations').select('google_place_id').eq('id', orgId).maybeSingle(),
      db.from('org_field_sources').select('id, field').eq('org_id', orgId).eq('is_current', true).in('field', fields),
    ]),
  )
  const targets = meta.onlyTracked ? fields.filter((f) => (current ?? []).some((c) => c.field === f)) : fields
  if (!targets.length) return
  const old = (current ?? []).filter((c) => targets.includes(c.field as TrackedField)).map((c) => c.id)
  if (old.length) must(await db.from('org_field_sources').update({ is_current: false }).in('id', old))
  must(
    await db.from('org_field_sources').insert(
      targets.map((field) => ({
        org_id: orgId,
        field,
        source: meta.source,
        place_id: org?.google_place_id ?? null,
        confirmed_at: meta.confirmedAt ?? new Date().toISOString(),
        confirmed_by: meta.actor.slice(0, 120),
        confirm_method: meta.method ?? null,
        note: meta.note?.slice(0, 500) ?? null,
      })),
    ),
  )
}

/**
 * Empties Google-sourced fields of one business and marks them cleared. `privateOnly`: only while it is private and
 * not claimed (the automatic clean-up). Returns false when nothing was changed (it became public or claimed).
 */
export async function clearGoogleFields(orgId: string, fields: TrackedField[], opts: { privateOnly: boolean; actor: string; reason: string }): Promise<boolean> {
  if (!fields.length) return false
  const db = getAdminSupabase()
  let q = db.from('organisations').update(clearingPatch(fields)).eq('id', orgId)
  if (opts.privateOnly) q = q.neq('status', 'published').is('claimed_at', null)
  const { data: changed } = must(await q.select('id'))
  if (!changed?.length) return false
  const now = new Date().toISOString()
  must(await db.from('org_field_sources').update({ cleared_at: now }).eq('org_id', orgId).eq('is_current', true).eq('source', 'google_places').is('cleared_at', null).in('field', fields))
  // Field names only: the audit log never receives the Google values.
  must(await db.from('audit_log').insert({ actor: opts.actor.slice(0, 80), action: 'imports.google_cleared', entity_type: 'organisation', entity_id: orgId, entity_label: 'Imported business', diff: { fields, reason: opts.reason } }))
  return true
}

export interface CleanupSummary {
  mode: CleanupMode
  orgsToClear: number
  fieldsToClear: number
  orgsCleared: number
  fieldsCleared: number
  publicDecisions: number
  importLogNames: number
  importLogNamesCleared: number
}

/**
 * The clean-up (daily job, or "Run a dry run now"). Dry run: works out what would be cleared and records it. Live
 * (only when the owner set the mode to live, and never when `forceDryRun`): clears expired Google fields of private,
 * unclaimed businesses and the business names copied into import_log. Public or claimed ones are only listed.
 */
export async function runImportsCleanup(opts: { runBy: string; forceDryRun?: boolean; now?: number }): Promise<CleanupSummary> {
  const started = new Date(opts.now ?? Date.now()).toISOString()
  const mode: CleanupMode = opts.forceDryRun ? 'dry_run' : await getCleanupMode()
  const db = getAdminSupabase()
  const rows = await loadImported(todayInAddis(new Date(opts.now ?? Date.now())))
  const toClear = rows.filter((r) => r.c.plan.action === 'clear')
  const decisions = rows.filter((r) => r.c.plan.action === 'decision')
  const { count: logNames } = must(await db.from('import_log').select('google_place_id', { count: 'exact', head: true }).neq('listing_name', '').not('listing_name', 'is', null))
  const summary: CleanupSummary = {
    mode,
    orgsToClear: toClear.length,
    fieldsToClear: toClear.reduce((n, r) => n + r.c.plan.fields.length, 0),
    orgsCleared: 0,
    fieldsCleared: 0,
    publicDecisions: decisions.length,
    importLogNames: logNames ?? 0,
    importLogNamesCleared: 0,
  }
  const details: { orgId: string; action: string; fields: TrackedField[]; done: boolean }[] = []
  for (const r of toClear) {
    const done = mode === 'live' ? await clearGoogleFields(r.id, r.c.plan.fields, { privateOnly: true, actor: `system:${opts.runBy}`, reason: 'expired (30 days), clean-up run' }) : false
    if (done) {
      summary.orgsCleared++
      summary.fieldsCleared += r.c.plan.fields.length
    }
    details.push({ orgId: r.id, action: 'clear', fields: r.c.plan.fields, done })
  }
  for (const r of decisions) details.push({ orgId: r.id, action: r.c.isPublic ? 'public_decision' : 'claimed_decision', fields: r.c.plan.fields, done: false })
  if (mode === 'live' && summary.importLogNames) {
    // import_log (pre-existing table) keeps its rows; only the copied Google business names are emptied, as AB asked.
    const { data: cleared } = must(await db.from('import_log').update({ listing_name: '' }).neq('listing_name', '').not('listing_name', 'is', null).select('google_place_id'))
    summary.importLogNamesCleared = cleared?.length ?? 0
  }
  must(await db.from('import_cleanup_runs').insert({ mode, started_at: started, counts: summary as unknown as Record<string, number>, details, run_by: opts.runBy.slice(0, 120) }))
  return summary
}

/** Counts only, for the admin digest. */
export function importsDigestCounts(s: CleanupSummary | null): [string, number][] {
  if (!s) return []
  return s.mode === 'live'
    ? [
        ['Imports: businesses with Google data cleared today', s.orgsCleared],
        ['Imports: Google business names cleared from the import history', s.importLogNamesCleared],
        ['Imports: public businesses needing your decision', s.publicDecisions],
      ]
    : [
        ['Imports (dry run): businesses whose Google data would be cleared', s.orgsToClear],
        ['Imports (dry run): Google business names in the import history', s.importLogNames],
        ['Imports: public businesses needing your decision', s.publicDecisions],
      ]
}
