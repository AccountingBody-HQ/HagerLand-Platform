'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase, getAdminSupabaseDynamic } from '@/lib/supabase/admin'
import { assertAdmin, audit, changedFields } from '@/lib/admin/guard'
import { categoryKind, categorySchema, childLevel, locationSchema, reorder } from '@/lib/validation/taxonomy'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { slugify } from '@/lib/slug'
import { revalidateReference } from '@/lib/revalidate'

type Msg = ActionResult<{ message: string }>
const CAT_TABLE = { product: 'product_categories', service: 'service_categories' } as const

function done(path: string, message: string): Msg {
  revalidateReference()
  revalidatePath(path)
  return ok({ message }, message)
}

/** Adds or edits a product or service category. The slug is fixed at creation so public URLs never change. */
export async function saveCategoryAction(kind: string, _prev: Msg | null, formData: FormData): Promise<Msg> {
  assertAdmin()
  const k = categoryKind.safeParse(kind)
  if (!k.success) return fail('Unknown category type.')
  const parsed = categorySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const { id, ...values } = parsed.data
  const db = getAdminSupabase()
  const table = CAT_TABLE[k.data]
  if (!id) {
    const slug = slugify(values.name, 60)
    if (!slug) return fail('Use letters or numbers in the name.')
    const { data: clash } = await db.from(table).select('id').eq('slug', slug).maybeSingle()
    const { data, error } = await db
      .from(table)
      .insert({ ...values, slug: clash ? `${slug}-${values.parent_id ? 'sub' : 'main'}-${Date.now().toString(36).slice(-4)}` : slug, is_active: true })
      .select('id')
      .single()
    if (error || !data) return fail('Could not add the category.')
    await audit(`${k.data}_category.create`, { type: `${k.data}_category`, id: data.id, label: values.name })
    return done('/roodber8/categories', `Added “${values.name}”.`)
  }
  if (values.parent_id === id) return fail('A category cannot be its own parent.')
  const { data: before } = await db.from(table).select('*').eq('id', id).maybeSingle()
  if (!before) return fail('Not found.')
  const { error } = await db.from(table).update(values).eq('id', id)
  if (error) return fail('Could not save.')
  await audit(`${k.data}_category.edit`, { type: `${k.data}_category`, id, label: values.name }, changedFields(before as Record<string, unknown>, values))
  return done('/roodber8/categories', 'Saved.')
}

export async function moveCategoryAction(kind: string, id: string, dir: 'up' | 'down'): Promise<Msg> {
  assertAdmin()
  const k = categoryKind.safeParse(kind)
  if (!k.success || !z.uuid().safeParse(id).success) return fail('Invalid request.')
  const db = getAdminSupabase()
  const table = CAT_TABLE[k.data]
  const { data: row } = await db.from(table).select('parent_id').eq('id', id).maybeSingle()
  if (!row) return fail('Not found.')
  const sib = row.parent_id ? db.from(table).select('id, sort').eq('parent_id', row.parent_id) : db.from(table).select('id, sort').is('parent_id', null)
  const { data: siblings } = await sib
  const changes = reorder(siblings ?? [], id, dir)
  for (const c of changes) await db.from(table).update({ sort: c.sort }).eq('id', c.id)
  if (changes.length) await audit('category.move', { type: `${k.data}_category`, id }, { dir })
  return done('/roodber8/categories', changes.length ? 'Moved.' : 'Already at the end.')
}

/** Adds or edits a location. New locations get their level from the parent. */
export async function saveLocationAction(_prev: Msg | null, formData: FormData): Promise<Msg> {
  assertAdmin()
  const parsed = locationSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const { id, name, name_am, parent_id, seo_intro_sale, seo_intro_rent, seo_intro_professionals, sort, is_active } = parsed.data
  const values = { name, name_am, parent_id, seo_intro_sale, seo_intro_rent, seo_intro_professionals, sort, is_active }
  const db = getAdminSupabase()
  if (!id) {
    const slug = slugify(values.name, 60)
    if (!slug) return fail('Use Latin letters or numbers in the English name.')
    let parentLevel: 'country' | 'region' | 'city' | 'sub_city' | 'area' | null = null
    if (values.parent_id) {
      const { data: parent } = await db.from('locations').select('level').eq('id', values.parent_id).maybeSingle()
      if (!parent) return fail('Choose a valid parent.')
      parentLevel = parent.level
    }
    const { data, error } = await db
      .from('locations')
      .insert({ ...values, slug, level: childLevel(parentLevel), path: slug, is_active: true })
      .select('id')
      .single()
    if (error || !data) return fail(error?.code === '23505' ? 'A location with this name already exists here.' : 'Could not add the location.')
    await audit('location.create', { type: 'location', id: data.id, label: values.name })
    return done('/roodber8/locations', `Added “${values.name}”.`)
  }
  const { data: before } = await db.from('locations').select('*').eq('id', id).maybeSingle()
  if (!before) return fail('Not found.')
  // The parent and slug never change here (they form the public URL); renaming changes only the display name.
  const update = { name, name_am, seo_intro_sale, seo_intro_rent, seo_intro_professionals, sort, is_active }
  const { error } = await db.from('locations').update(update).eq('id', id)
  if (error) return fail('Could not save.')
  await audit('location.edit', { type: 'location', id, label: values.name }, changedFields(before as Record<string, unknown>, update))
  return done('/roodber8/locations', 'Saved.')
}

export async function moveLocationAction(id: string, dir: 'up' | 'down'): Promise<Msg> {
  assertAdmin()
  if (!z.uuid().safeParse(id).success) return fail('Invalid request.')
  const db = getAdminSupabase()
  const { data: row } = await db.from('locations').select('parent_id').eq('id', id).maybeSingle()
  if (!row) return fail('Not found.')
  const { data: siblings } = row.parent_id ? await db.from('locations').select('id, sort').eq('parent_id', row.parent_id) : await db.from('locations').select('id, sort').is('parent_id', null)
  const changes = reorder(siblings ?? [], id, dir)
  for (const c of changes) await db.from('locations').update({ sort: c.sort }).eq('id', c.id)
  if (changes.length) await audit('location.move', { type: 'location', id }, { dir })
  return done('/roodber8/locations', changes.length ? 'Moved.' : 'Already at the end.')
}

const LOCATION_REFS = [
  ['properties', 'location_id'],
  ['organisations', 'location_id'],
  ['developments', 'location_id'],
  ['portfolio_projects', 'location_id'],
  ['quote_requests', 'delivery_location_id'],
] as const

/**
 * Merges a duplicate location into another: every listing, company, development, project and quote
 * pointing at it moves to the target, and the duplicate is switched off (never deleted, so old links keep resolving).
 */
export async function mergeLocationAction(fromId: string, intoId: string): Promise<Msg> {
  assertAdmin()
  const ids = z.object({ from: z.uuid(), into: z.uuid() }).safeParse({ from: fromId, into: intoId })
  if (!ids.success || fromId === intoId) return fail('Choose two different locations.')
  const db = getAdminSupabase()
  const [{ data: from }, { data: into }, { count: children }] = await Promise.all([
    db.from('locations').select('id, display_name').eq('id', fromId).maybeSingle(),
    db.from('locations').select('id, display_name').eq('id', intoId).maybeSingle(),
    db.from('locations').select('id', { count: 'exact', head: true }).eq('parent_id', fromId).eq('is_active', true),
  ])
  if (!from || !into) return fail('Location not found.')
  if (children) return fail('This location still has active sub-areas. Merge or switch those off first.')
  const moved: Record<string, number> = {}
  for (const [table, col] of LOCATION_REFS) {
    const { data, error } = await getAdminSupabaseDynamic()
      .from(table)
      .update({ [col]: intoId })
      .eq(col, fromId)
      .select('id')
    if (error) return fail(`Could not move ${table.replace('_', ' ')}. Nothing after that step was changed.`)
    moved[table] = data?.length ?? 0
  }
  await db.from('locations').update({ is_active: false }).eq('id', fromId)
  await audit('location.merge', { type: 'location', id: fromId, label: `${from.display_name} → ${into.display_name}` }, { into: intoId, moved })
  revalidatePath('/', 'layout')
  const total = Object.values(moved).reduce((a, b) => a + b, 0)
  return done('/roodber8/locations', `Merged into ${into.display_name}. ${total} record${total === 1 ? '' : 's'} moved.`)
}

const countrySchema = z.object({
  name: z.string().trim().min(2, 'Enter the country name.').max(120),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, 'Use the two-letter country code, e.g. FR.')
    .refine((c) => c !== 'ET', 'Ethiopia is already set up.'),
})

/** Adds a country for diaspora services (spec 24.4). Cities are then added under it. */
export async function addCountryAction(_prev: Msg | null, formData: FormData): Promise<Msg> {
  assertAdmin()
  const parsed = countrySchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const { name, code } = parsed.data
  const slug = slugify(name, 60)
  if (!slug) return fail('Use Latin letters in the English name.')
  const db = getAdminSupabase()
  const { count } = await db.from('locations').select('id', { count: 'exact', head: true }).eq('level', 'country').eq('country_code', code)
  if (count) return fail(`A country with code ${code} already exists.`)
  const { data, error } = await db.from('locations').insert({ name, slug, path: slug, level: 'country', country_code: code, sort: 2000 }).select('id').single()
  if (error || !data) return fail(error?.code === '23505' ? 'A location with this name already exists.' : 'Could not add the country.')
  await audit('location.create', { type: 'location', id: data.id, label: `${name} (${code})` })
  return done('/roodber8/locations', `Added ${name}. Now add its cities below.`)
}
