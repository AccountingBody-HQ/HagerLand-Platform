'use server'

/** Admin area these actions belong to (staff roles are checked against it, spec 26.15). */
const AREA = '/roodber8/promotions'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { assertAdmin, audit } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { escapeLikePattern } from '@/lib/security'
import { revalidateEntity } from '@/lib/revalidate'

const entitySchema = z.enum(['property', 'development', 'organisation', 'product'])
type Entity = z.infer<typeof entitySchema>

/** Up to 10 records of a type matching a name, short reference or id, for the promotion picker. */
export async function findPromotableAction(type: string, term: string): Promise<ActionResult<{ options: { id: string; label: string }[] }>> {
  await assertAdmin(AREA)
  const t = entitySchema.safeParse(type)
  const q = term.trim().slice(0, 80)
  if (!t.success || q.length < 2) return ok({ options: [] })
  const db = getAdminSupabase()
  const isId = z.uuid().safeParse(q).success
  const pattern = `%${escapeLikePattern(q)}%`
  let rows: { id: string; label: string }[] = []
  if (t.data === 'property') {
    const base = db.from('properties').select('id, title, short_id, status')
    const { data } = await (isId ? base.eq('id', q) : /^[0-9a-z]{8}$/i.test(q) ? base.eq('short_id', q.toLowerCase()) : base.ilike('title', pattern)).limit(10)
    rows = (data ?? []).map((r) => ({ id: r.id, label: `${r.title} (${r.short_id}, ${r.status})` }))
  } else {
    const table = t.data === 'development' ? 'developments' : t.data === 'organisation' ? 'organisations' : 'products'
    const base = db.from(table).select('id, name, status')
    const { data } = await (isId ? base.eq('id', q) : base.ilike('name', pattern)).limit(10)
    rows = ((data ?? []) as { id: string; name: string; status: string }[]).map((r) => ({ id: r.id, label: `${r.name} (${r.status})` }))
  }
  return ok({ options: rows })
}

const createSchema = z.object({
  entity_type: entitySchema,
  entity_id: z.uuid('Choose what to promote.'),
  kind: z.enum(['featured', 'spotlight', 'top_of_search', 'homepage']),
  starts: z.iso.date(),
  ends: z.iso.date(),
  paid: z.boolean(),
  price_etb: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.coerce.number().min(0).max(100_000_000).optional()),
  notes: z.string().trim().max(500).optional(),
})

export async function createPromotionAction(input: Record<string, unknown>): Promise<ActionResult<{ message: string }>> {
  await assertAdmin(AREA)
  const parsed = createSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the fields.')
  const d = parsed.data
  const startsAt = new Date(`${d.starts}T00:00:00Z`)
  const endsAt = new Date(`${d.ends}T23:59:59Z`)
  if (endsAt <= startsAt) return fail('The end date must be after the start date.')
  if (endsAt <= new Date()) return fail('The end date must be in the future.')
  const { data, error } = await getAdminSupabase()
    .from('promotions')
    .insert({ entity_type: d.entity_type, entity_id: d.entity_id, kind: d.kind, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(), paid: d.paid, price_etb_cents: d.price_etb === undefined ? null : Math.round(d.price_etb * 100), notes: d.notes || null })
    .select('id')
    .single()
  if (error || !data) return fail('Could not create the promotion.')
  await audit('promotion.create', { type: d.entity_type, id: d.entity_id, label: d.kind }, { promotion: data.id, starts: d.starts, ends: d.ends, paid: d.paid })
  revalidateEntity(d.entity_type as Entity, d.entity_id)
  revalidatePath('/roodber8/promotions')
  return ok({ message: 'Promotion created.' })
}

/** Ends a promotion now, or moves its end date. Featured flags follow automatically (database trigger). */
export async function updatePromotionEndAction(id: string, ends: string | null): Promise<ActionResult<{ message: string }>> {
  await assertAdmin(AREA)
  const parsed = z.object({ id: z.uuid(), ends: z.iso.date().nullable() }).safeParse({ id, ends })
  if (!parsed.success) return fail('Choose a valid date.')
  const db = getAdminSupabase()
  const { data: p } = await db.from('promotions').select('entity_type, entity_id, starts_at').eq('id', id).maybeSingle()
  if (!p) return fail('Not found.')
  const now = new Date()
  const endsAt = parsed.data.ends ? new Date(`${parsed.data.ends}T23:59:59Z`) : new Date(Math.max(now.getTime(), new Date(p.starts_at).getTime() + 1000))
  if (endsAt <= new Date(p.starts_at)) return fail('The end date must be after the start date.')
  const { error } = await db.from('promotions').update({ ends_at: endsAt.toISOString() }).eq('id', id)
  if (error) return fail('Could not update the promotion.')
  await db.rpc('refresh_featured', { p_entity_type: p.entity_type, p_entity_id: p.entity_id })
  await audit(parsed.data.ends ? 'promotion.extend' : 'promotion.end', { type: p.entity_type, id: p.entity_id }, { promotion: id, ends: endsAt.toISOString() })
  if (entitySchema.safeParse(p.entity_type).success) revalidateEntity(p.entity_type as Entity, p.entity_id)
  revalidatePath('/roodber8/promotions')
  return ok({ message: parsed.data.ends ? `Now ends ${parsed.data.ends}.` : 'Promotion ended.' })
}
