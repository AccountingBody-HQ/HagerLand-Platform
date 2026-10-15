'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Database } from '@/lib/database.types'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdmin, audit, changedFields } from '@/lib/admin/guard'
import { developmentSchema } from '@/lib/validation/development'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { shortId, slugify } from '@/lib/slug'
import { revalidateEntity } from '@/lib/revalidate'
import { parseCsv } from '@/lib/admin/csv'
import { prepareImport, type ImportRow } from '@/lib/admin/dev-import'
import { isEthiopianLocation, NOT_IN_ETHIOPIA } from '@/lib/data/reference'
import { STALE_EDIT, isStaleEdit } from '@/lib/concurrency'

type DevUpdate = Database['public']['Tables']['developments']['Update']

/** Create or edit any development as HagerLand (changes apply immediately). */
export async function saveAdminDevelopmentAction(_prev: ActionResult<{ id: string }> | null, formData: FormData): Promise<ActionResult<{ id: string }>> {
  assertAdmin()
  const parsed = developmentSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  if (!(await isEthiopianLocation(parsed.data.location_id))) return fail(NOT_IN_ETHIOPIA, { location_id: 'Choose a place in Ethiopia' })
  const devId = z.preprocess((v) => (v === '' || v === null ? null : v), z.uuid().nullable()).safeParse(formData.get('developer_org_id'))
  if (!devId.success) return fail('Choose a valid developer.')
  const d = parsed.data
  if (d.id && (await isStaleEdit('developments', d.id, formData.get('expected_updated_at')))) return fail(STALE_EDIT)
  const db = getAdminSupabase()
  let isHagerland = false
  if (devId.data) {
    const { data: org } = await db.from('organisations').select('kind').eq('id', devId.data).maybeSingle()
    isHagerland = org?.kind === 'hagerland'
  }
  const values: DevUpdate = {
    name: d.name,
    kind: d.kind,
    summary: d.summary ?? null,
    description: d.description ?? null,
    location_id: d.location_id,
    address_line: d.address_line ?? null,
    completion_status: d.completion_status ?? null,
    expected_completion: d.expected_completion ?? null,
    completed_year: d.completed_year ?? null,
    total_units: d.total_units ?? null,
    floors_label: d.floors_label?.toUpperCase() ?? null,
    price_from_etb: d.price_from_etb ?? null,
    price_to_etb: d.price_to_etb ?? null,
    payment_plan: d.payment_plan ?? null,
    amenities: d.amenities,
    finishing_status: d.finishing_status ?? null,
    tenure: d.tenure ?? null,
    video_url: d.video_url ?? null,
    unit_types: d.unit_types as DevUpdate['unit_types'],
    brochure_path: d.brochure_path ?? null,
    developer_org_id: devId.data,
    is_hagerland: isHagerland,
  }
  if (!d.id) {
    const { data, error } = await db
      .from('developments')
      .insert({ ...values, name: d.name, slug: `${slugify(d.name, 60)}-${shortId(4)}`, status: 'draft' })
      .select('id')
      .single()
    if (error || !data) return fail('Could not create the development.')
    await audit('development.create', { type: 'development', id: data.id, label: d.name })
    redirect(`/roodber8/developments/${data.id}?created=1`)
  }
  const { data: before } = await db.from('developments').select('*').eq('id', d.id).maybeSingle()
  if (!before) return fail('Not found.')
  const { error } = await db.from('developments').update(values).eq('id', d.id)
  if (error) return fail('Could not save.')
  await audit('development.edit', { type: 'development', id: d.id, label: d.name }, changedFields(before as Record<string, unknown>, values as Record<string, unknown>))
  revalidateEntity('development', d.id)
  revalidatePath(`/roodber8/developments/${d.id}`)
  return ok({ id: d.id }, 'Saved. Changes are live now.')
}

async function importContext() {
  const db = getAdminSupabase()
  const [{ data: locations }, { data: developers }, { data: existing }] = await Promise.all([
    db.from('locations').select('id, parent_id, name, level'),
    db.from('organisations').select('id, name').in('kind', ['developer', 'hagerland']),
    db.from('developments').select('name, location_id').neq('status', 'removed'),
  ])
  return { locations: locations ?? [], developers: developers ?? [], existing: existing ?? [] }
}

export async function previewDevelopmentsCsvAction(csv: string): Promise<ActionResult<{ rows: ImportRow[] }>> {
  assertAdmin()
  if (csv.length > 2_000_000) return fail('That file is too large. Split it into smaller files.')
  const rows = parseCsv(csv)
  if (rows.length === 0) return fail('No rows found. Check the file has a header row.')
  if (rows.length > 1000) return fail('Import up to 1,000 rows at a time.')
  const ctx = await importContext()
  return ok({ rows: prepareImport(rows, ctx.locations, ctx.developers, ctx.existing) })
}

export async function importDevelopmentsCsvAction(csv: string, publish: boolean): Promise<ActionResult<{ message: string }>> {
  assertAdmin()
  const rows = parseCsv(csv)
  if (rows.length === 0 || rows.length > 1000) return fail('Check the file and try again.')
  const ctx = await importContext()
  const ready = prepareImport(rows, ctx.locations, ctx.developers, ctx.existing).filter((r) => r.errors.length === 0 && !r.duplicate)
  if (ready.length === 0) return fail('No new valid rows to import.')
  const db = getAdminSupabase()
  const { error } = await db.from('developments').insert(
    ready.map((r) => ({
      name: r.name,
      slug: `${slugify(r.name, 60)}-${shortId(4)}`,
      kind: r.kind as 'development',
      location_id: r.locationId,
      developer_org_id: r.developerOrgId,
      completion_status: r.completion as 'ready' | null,
      floors_label: r.floors,
      total_units: r.totalUnits,
      price_from_etb: r.priceFrom,
      description: r.description,
      status: publish ? ('published' as const) : ('draft' as const),
    })),
  )
  if (error) return fail(`Import failed: ${error.message}`)
  await audit('development.import', { type: 'development', label: `${ready.length} rows` }, { publish })
  revalidatePath('/roodber8/developments')
  revalidatePath('/developments')
  return ok({ message: `Imported ${ready.length} development${ready.length === 1 ? '' : 's'}${publish ? ' and published them' : ' as drafts'}.` })
}
