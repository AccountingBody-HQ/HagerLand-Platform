'use server'

/** Admin area these actions belong to (staff roles are checked against it, spec 26.15). */
const AREA = '/roodber8/organisations'

import { redirect } from 'next/navigation'
import { revalidatePath, revalidateTag } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { adminActor, assertAdmin, audit, changedFields } from '@/lib/admin/guard'
import { findPossibleDuplicates } from '@/lib/supply/data'
import { organisationFormValues, organisationSchema, USER_ORG_KINDS } from '@/lib/validation/organisation'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { shortId, slugify } from '@/lib/slug'
import { listTag, revalidateEntity } from '@/lib/revalidate'
import type { OrgFormState } from '@/app/(account)/account/company/org-actions'
import { STALE_EDIT, isStaleEdit } from '@/lib/concurrency'

const createSchema = z.object({ visibility: z.enum(['private', 'publish']), supply_partner: z.enum(['1']).optional(), confirm_new: z.enum(['0', '1']).optional() })

// Admin can also add finance and insurance partners (spec 24.8).
const adminOrgSchema = organisationSchema.extend({ kind: z.enum([...USER_ORG_KINDS, 'lender', 'insurer', 'broker', 'hagerland']) })

async function syncLinks(orgId: string, serviceIds: string[], categoryIds: string[]) {
  const db = getAdminSupabase()
  await db.from('organisation_services').delete().eq('org_id', orgId)
  if (serviceIds.length) await db.from('organisation_services').insert(Array.from(new Set(serviceIds)).map((service_id) => ({ org_id: orgId, service_id })))
  await db.from('org_product_categories').delete().eq('org_id', orgId)
  if (categoryIds.length) await db.from('org_product_categories').insert(Array.from(new Set(categoryIds)).map((product_category_id) => ({ org_id: orgId, product_category_id })))
}

/** Create or edit any organisation as HagerLand (applies immediately). */
export async function saveAdminOrgAction(_prev: OrgFormState | null, formData: FormData): Promise<OrgFormState> {
  await assertAdmin(AREA)
  const parsed = adminOrgSchema.safeParse(organisationFormValues(formData))
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  if (d.existing_id && (await isStaleEdit('organisations', d.existing_id, formData.get('expected_updated_at')))) return fail(STALE_EDIT)
  const db = getAdminSupabase()
  const columns = {
    name: d.name,
    kind: d.kind,
    tagline: d.tagline ?? null,
    description: d.description ?? null,
    location_id: d.location_id,
    areas_served: Array.from(new Set(d.areas_served)),
    serves_diaspora: d.serves_diaspora,
    phone: d.phone,
    whatsapp: d.whatsapp ?? null,
    telegram: d.telegram ?? null,
    email: d.email ?? null,
    website: d.website ?? null,
    address_line: d.address_line ?? null,
    year_established: d.year_established ?? null,
    team_size: d.team_size ?? null,
    licence_category: d.licence_category ?? null,
    licence_grade: d.licence_grade ?? null,
    qualifications: d.qualifications ?? null,
  }
  if (!d.existing_id) {
    const create = createSchema.safeParse({ visibility: formData.get('visibility'), supply_partner: formData.get('supply_partner') ?? undefined, confirm_new: formData.get('confirm_new') ?? undefined })
    if (!create.success) return fail('Choose whether to keep it private or publish it now.', { visibility: 'Choose one' })
    const asSupplier = create.data.supply_partner === '1'
    if (asSupplier) await assertAdmin('/roodber8/supply/partners')
    // Warns, never blocks: "None of these is the same business" sends confirm_new=1.
    if (create.data.confirm_new !== '1') {
      const similar = await findPossibleDuplicates({ name: d.name, phone: d.phone, whatsapp: d.whatsapp ?? null, telegram: d.telegram ?? null })
      if (similar.length) return { ok: false, error: 'possible_duplicate', duplicates: similar.map((s) => ({ id: s.id, name: s.name, slug: '', location_display: null, verification_level: '', has_members: false, reason: s.reason })) }
    }
    // Private (draft) organisations are hidden from every public page, search and sitemap until published.
    const status = create.data.visibility === 'publish' ? 'published' : 'draft'
    const { data, error } = await db
      .from('organisations')
      .insert({ ...columns, slug: `${slugify(d.name, 60) || 'business'}-${shortId(4)}`, status, verification_level: 'listed', source: 'admin', is_hagerland: d.kind === 'hagerland' })
      .select('id')
      .single()
    if (error || !data) return fail('Could not create the organisation.')
    await syncLinks(data.id, d.service_ids, d.product_category_ids)
    if (d.pillar_keys.length) await db.from('organisation_pillars').insert(Array.from(new Set(d.pillar_keys)).map((pillar_key) => ({ org_id: data.id, pillar_key })))
    await audit('organisation.create', { type: 'organisation', id: data.id, label: d.name }, { status })
    let supplyFailed = false
    if (asSupplier) {
      // The organisation already exists; if this step fails the page says so and offers "Create supply partner record".
      const now = new Date().toISOString()
      const { error: supplyError } = await db.from('supply_partners').insert({ org_id: data.id, relationship_status: 'discovered', status_changed_at: now, captured_at: now, captured_by: (await adminActor()).slice(0, 120) })
      if (supplyError) supplyFailed = true
      else await audit('supply.partner.create', { type: 'organisation', id: data.id, label: d.name }, { relationship_status: 'discovered', via: 'add new supplier' })
    }
    redirect(`/roodber8/organisations/${data.id}?created=1${supplyFailed ? '&supply=failed' : ''}${asSupplier ? '&focus=supply-partner' : ''}`)
  }
  const { data: before } = await db.from('organisations').select('*').eq('id', d.existing_id).maybeSingle()
  if (!before) return fail('Not found.')
  const { error } = await db.from('organisations').update({ ...columns, pending_changes: null }).eq('id', d.existing_id)
  if (error) return fail('Could not save.')
  await syncLinks(d.existing_id, d.service_ids, d.product_category_ids)
  await audit('organisation.edit', { type: 'organisation', id: d.existing_id, label: d.name }, changedFields(before as Record<string, unknown>, columns))
  revalidateEntity('organisation', d.existing_id)
  revalidatePath(`/roodber8/organisations/${d.existing_id}`)
  return ok({ id: d.existing_id }, 'Saved. Changes are live now.')
}

const adminFieldsSchema = z.object({
  verification_level: z.enum(['listed', 'claimed', 'verified']),
  trade_licence_number: z.string().trim().max(80),
  tin: z.string().trim().max(40),
  plan: z.string().trim().min(1).max(40),
})

/** Fields only HagerLand sets: verification level, licence and TIN numbers, plan. */
export async function saveOrgAdminFieldsAction(orgId: string, input: z.infer<typeof adminFieldsSchema>): Promise<ActionResult<{ message: string }>> {
  await assertAdmin(AREA)
  const parsed = adminFieldsSchema.safeParse(input)
  if (!parsed.success || !z.uuid().safeParse(orgId).success) return fail('Check the fields.')
  const db = getAdminSupabase()
  const { data: before } = await db.from('organisations').select('verification_level, trade_licence_number, tin, plan, verified_at, name').eq('id', orgId).maybeSingle()
  if (!before) return fail('Not found.')
  const v = parsed.data
  const update = {
    verification_level: v.verification_level,
    verified_at: v.verification_level === 'verified' ? before.verified_at ?? new Date().toISOString() : null,
    trade_licence_number: v.trade_licence_number || null,
    tin: v.tin || null,
    plan: v.plan,
  }
  const { error } = await db.from('organisations').update(update).eq('id', orgId)
  if (error) return fail('Could not save.')
  await audit('organisation.admin_fields', { type: 'organisation', id: orgId, label: before.name }, changedFields(before as Record<string, unknown>, update))
  revalidateEntity('organisation', orgId)
  revalidatePath(`/roodber8/organisations/${orgId}`)
  return ok({ message: 'Saved.' })
}

/**
 * Publish a private organisation, or make a published one private again (status "draft": hidden from every public
 * page, search, sitemap and share image). HagerLand's own organisations always stay published.
 */
export async function setOrganisationVisibilityAction(orgId: string, visibility: 'publish' | 'private', expectedUpdatedAt: string): Promise<ActionResult<{ message: string }>> {
  await assertAdmin(AREA)
  const parsed = z.object({ orgId: z.uuid(), visibility: z.enum(['publish', 'private']), expected: z.string().min(1).max(40) }).safeParse({ orgId, visibility, expected: expectedUpdatedAt })
  if (!parsed.success) return fail('Invalid request.')
  if (await isStaleEdit('organisations', orgId, parsed.data.expected)) return fail(STALE_EDIT)
  const db = getAdminSupabase()
  const { data: org } = await db.from('organisations').select('name, slug, status, kind, is_hagerland').eq('id', orgId).maybeSingle()
  if (!org) return fail('Organisation not found.')
  const publish = parsed.data.visibility === 'publish'
  if (!publish && (org.kind === 'hagerland' || org.is_hagerland)) return fail('HagerLand’s own organisations always stay on the public site.')
  if (publish ? org.status !== 'draft' : org.status !== 'published') return fail(publish ? 'Only a private organisation can be published here.' : 'Only a published organisation can be made private.')
  const status = publish ? 'published' : 'draft'
  const { error } = await db.from('organisations').update({ status }).eq('id', orgId)
  if (error) return fail('Could not change the visibility.')
  await audit(publish ? 'organisation.publish' : 'organisation.unpublish', { type: 'organisation', id: orgId, label: org.name }, { status: { from: org.status, to: status } })
  // Its page, lists, search, products it sells and the homepage all read the public views.
  revalidateEntity('organisation', orgId, [`/company/${org.slug}`, `/roodber8/organisations/${orgId}`, '/roodber8/organisations', '/roodber8/supply/partners'])
  revalidateTag(listTag('product'))
  return ok({ message: publish ? 'Published: it is now on the public site.' : 'Made private: it is no longer on the public site.' })
}

/** Adds an existing account as a member (owner/admin/member) by email. */
export async function addMemberAction(orgId: string, email: string, role: string): Promise<ActionResult<{ message: string }>> {
  await assertAdmin(AREA)
  const parsed = z.object({ orgId: z.uuid(), email: z.email(), role: z.enum(['owner', 'admin', 'member']) }).safeParse({ orgId, email: email.trim().toLowerCase(), role })
  if (!parsed.success) return fail('Enter a valid email and role.')
  const db = getAdminSupabase()
  let userId: string | null = null
  for (let page = 1; page <= 20 && !userId; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    userId = data.users.find((u) => u.email?.toLowerCase() === parsed.data.email)?.id ?? null
    if (data.users.length < 1000) break
  }
  if (!userId) return fail('No account uses that email. Ask them to sign up first.')
  const { error } = await db.from('organisation_members').upsert({ org_id: orgId, user_id: userId, role: parsed.data.role })
  if (error) return fail('Could not add the member.')
  await audit('organisation.member_add', { type: 'organisation', id: orgId }, { email: parsed.data.email, role: parsed.data.role })
  revalidatePath(`/roodber8/organisations/${orgId}`)
  return ok({ message: `Added ${parsed.data.email} as ${parsed.data.role}.` })
}

export async function removeMemberAction(orgId: string, userId: string): Promise<ActionResult<{ message: string }>> {
  await assertAdmin(AREA)
  if (!z.uuid().safeParse(orgId).success || !z.uuid().safeParse(userId).success) return fail('Invalid.')
  const { error } = await getAdminSupabase().from('organisation_members').delete().eq('org_id', orgId).eq('user_id', userId)
  if (error) return fail(error.message.includes('at least one owner') ? 'This is the only owner. Make someone else an owner first.' : 'Could not remove the member.')
  await audit('organisation.member_remove', { type: 'organisation', id: orgId }, { user_id: userId })
  revalidatePath(`/roodber8/organisations/${orgId}`)
  return ok({ message: 'Member removed.' })
}

/**
 * Supply partner records follow a merge: the duplicate's record moves across, or, when both have one, the kept
 * record gains the duplicate's roles, other names (and its name) and evidence. Contacts always move.
 */
async function mergeSupplyRecords(sourceId: string, targetId: string, sourceName: string): Promise<{ partner: 'none' | 'moved' | 'combined'; contacts: number; offers: { moved: number; superseded: number } }> {
  const db = getAdminSupabase()
  const [{ data: from }, { data: into }] = await Promise.all([
    db.from('supply_partners').select('roles, aka, evidence_paths').eq('org_id', sourceId).maybeSingle(),
    db.from('supply_partners').select('roles, aka, evidence_paths').eq('org_id', targetId).maybeSingle(),
  ])
  let partner: 'none' | 'moved' | 'combined' = 'none'
  if (from && !into) {
    await db.from('supply_partners').update({ org_id: targetId }).eq('org_id', sourceId)
    partner = 'moved'
  } else if (from && into) {
    await db
      .from('supply_partners')
      .update({
        roles: Array.from(new Set([...into.roles, ...from.roles])),
        aka: Array.from(new Set([...into.aka, ...from.aka, sourceName])).slice(0, 20),
        evidence_paths: Array.from(new Set([...into.evidence_paths, ...from.evidence_paths])).slice(0, 20),
      })
      .eq('org_id', targetId)
    await db.from('supply_partners').delete().eq('org_id', sourceId)
    await db.from('admin_notes').insert({ entity_type: 'organisation', entity_id: targetId, note: `Supply partner record of ${sourceName} (${sourceId}) combined into this one: roles, other names and evidence added.` })
    partner = 'combined'
  }
  // Branches stay with the archived duplicate, so moved contacts and prices lose their branch link.
  const { data: moved } = await db.from('supply_contacts').update({ org_id: targetId, branch_id: null }).eq('org_id', sourceId).select('id')
  const offers = await mergeSupplierOffers(sourceId, targetId, sourceName)
  return { partner, contacts: moved?.length ?? 0, offers }
}

/**
 * Prices follow a merge. When both businesses have a current price for the same item and unit, the newer one (later
 * price date, then later entry) stays current and the other becomes superseded, so only one is current.
 */
async function mergeSupplierOffers(sourceId: string, targetId: string, sourceName: string): Promise<{ moved: number; superseded: number }> {
  const db = getAdminSupabase()
  const [{ data: from }, { data: into }] = await Promise.all([
    db.from('supplier_offers').select('id, item_key, unit, price_date, captured_at').eq('org_id', sourceId).eq('status', 'current'),
    db.from('supplier_offers').select('id, item_key, unit, price_date, captured_at, branch_id').eq('org_id', targetId).eq('status', 'current'),
  ])
  const newer = (a: { price_date: string; captured_at: string }, b: { price_date: string; captured_at: string }) => a.price_date > b.price_date || (a.price_date === b.price_date && a.captured_at > b.captured_at)
  let superseded = 0
  // Prices for different branches of the duplicate become whole-business prices: keep only the newest per item.
  const keepers = new Map<string, NonNullable<typeof from>[number]>()
  for (const s of from ?? []) {
    const key = `${s.item_key}|${s.unit}`
    const kept = keepers.get(key)
    if (!kept) keepers.set(key, s)
    else {
      const [loser, winner] = newer(s, kept) ? [kept, s] : [s, kept]
      await db.from('supplier_offers').update({ status: 'superseded', superseded_by: winner.id }).eq('id', loser.id)
      keepers.set(key, winner)
      superseded++
    }
  }
  for (const s of Array.from(keepers.values())) {
    // Moved prices lose their branch, so they compete with the kept business's whole-business prices.
    const t = (into ?? []).find((o) => o.item_key === s.item_key && o.unit === s.unit && o.branch_id === null)
    if (!t) continue
    const [loser, winner] = newer(s, t) ? [t, s] : [s, t]
    await db.from('supplier_offers').update({ status: 'superseded', superseded_by: winner.id }).eq('id', loser.id)
    superseded++
  }
  const { data: moved } = await db.from('supplier_offers').update({ org_id: targetId, branch_id: null }).eq('org_id', sourceId).select('id')
  if (superseded) await db.from('admin_notes').insert({ entity_type: 'organisation', entity_id: targetId, note: `Prices from ${sourceName} (${sourceId}) merged in: ${superseded} older duplicate price${superseded === 1 ? '' : 's'} marked superseded.` })
  return { moved: moved?.length ?? 0, superseded }
}

/**
 * Merge a duplicate into the organisation to keep: moves members, listings, developments,
 * portfolio, products, services, supply categories, supply partner records and leads, then archives the duplicate (spec 18.2 #5).
 */
export async function mergeOrganisationsAction(sourceId: string, targetId: string): Promise<ActionResult<{ message: string }>> {
  await assertAdmin(AREA)
  if (!z.uuid().safeParse(sourceId).success || !z.uuid().safeParse(targetId).success || sourceId === targetId) return fail('Choose a different organisation to merge into.')
  const db = getAdminSupabase()
  const [{ data: source }, { data: target }] = await Promise.all([
    db.from('organisations').select('id, name, is_hagerland').eq('id', sourceId).maybeSingle(),
    db.from('organisations').select('id, name').eq('id', targetId).maybeSingle(),
  ])
  if (!source || !target) return fail('Organisation not found.')
  if (source.is_hagerland) return fail('HagerLand organisations cannot be merged.')
  const { data: members } = await db.from('organisation_members').select('user_id, role').eq('org_id', sourceId)
  if (members?.length) await db.from('organisation_members').upsert(members.map((m) => ({ org_id: targetId, user_id: m.user_id, role: m.role })), { onConflict: 'org_id,user_id', ignoreDuplicates: true })
  // Archived first: an archived duplicate may lose its last owner (every live organisation keeps one).
  await db.from('organisations').update({ status: 'archived' }).eq('id', sourceId)
  await db.from('organisation_members').delete().eq('org_id', sourceId)
  const { data: svc } = await db.from('organisation_services').select('service_id').eq('org_id', sourceId)
  if (svc?.length) await db.from('organisation_services').upsert(svc.map((s) => ({ org_id: targetId, service_id: s.service_id })), { ignoreDuplicates: true })
  const { data: cats } = await db.from('org_product_categories').select('product_category_id').eq('org_id', sourceId)
  if (cats?.length) await db.from('org_product_categories').upsert(cats.map((c) => ({ org_id: targetId, product_category_id: c.product_category_id })), { ignoreDuplicates: true })
  await Promise.all([
    db.from('properties').update({ lister_org_id: targetId }).eq('lister_org_id', sourceId),
    db.from('developments').update({ developer_org_id: targetId }).eq('developer_org_id', sourceId),
    db.from('portfolio_projects').update({ org_id: targetId }).eq('org_id', sourceId),
    db.from('products').update({ seller_org_id: targetId }).eq('seller_org_id', sourceId),
    db.from('enquiries').update({ recipient_org_id: targetId }).eq('recipient_org_id', sourceId),
    db.from('claims').update({ org_id: targetId }).eq('org_id', sourceId),
  ])
  const supply = await mergeSupplyRecords(sourceId, targetId, source.name)
  await db.from('admin_notes').insert({ entity_type: 'organisation', entity_id: sourceId, note: `Merged into ${target.name} (${targetId}).` })
  await audit('organisation.merge', { type: 'organisation', id: targetId, label: target.name }, { merged: { id: sourceId, name: source.name }, supply })
  revalidateEntity('organisation', targetId)
  revalidateEntity('organisation', sourceId)
  return ok({ message: `${source.name} was merged into ${target.name}.` })
}
