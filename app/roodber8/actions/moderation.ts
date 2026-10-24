'use server'

/** Admin area these actions belong to (staff roles are checked against it, spec 26.15). */
const AREA = '/roodber8/review'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase, getAdminSupabaseDynamic } from '@/lib/supabase/admin'
import { assertAdmin, audit } from '@/lib/admin/guard'
import { ownerEmails, firstName } from '@/lib/admin/notify'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { revalidateEntity } from '@/lib/revalidate'
import { sendEmail } from '@/lib/email/send'
import { claimDecisionEmail, listingApprovedEmail, listingRejectedEmail, orgDecisionEmail, verificationDecisionEmail } from '@/lib/email/templates'
import { canonicalUrl } from '@/lib/site'
import { log } from '@/lib/log'
import { sendInstantAlerts } from '@/lib/alerts'
import { importPublishBlock, recordFieldSources } from '@/lib/imports/compliance-data'

type Entity = 'property' | 'development' | 'organisation' | 'portfolio' | 'product'
const TABLE: Record<Entity, 'properties' | 'developments' | 'organisations' | 'portfolio_projects' | 'products'> = {
  property: 'properties',
  development: 'developments',
  organisation: 'organisations',
  portfolio: 'portfolio_projects',
  product: 'products',
}

const schema = z.object({
  entity: z.enum(['property', 'development', 'organisation', 'portfolio', 'product']),
  id: z.uuid(),
  op: z.enum(['approve', 'reject', 'changes', 'remove', 'approve_changes', 'reject_changes']),
  reason: z.string().trim().max(2000).optional(),
})

async function approveMediaOf(entity: Entity, id: string) {
  await getAdminSupabase().from('media').update({ status: 'approved' }).eq('entity_type', entity).eq('entity_id', id).eq('status', 'pending')
}

interface Owner {
  orgId: string | null
  userId: string | null
  title: string
  url: string
}

async function loadOwner(entity: Entity, id: string): Promise<Owner | null> {
  const db = getAdminSupabase()
  if (entity === 'property') {
    const { data } = await db.from('properties').select('lister_org_id, lister_user_id, title, slug').eq('id', id).maybeSingle()
    return data ? { orgId: data.lister_org_id, userId: data.lister_user_id, title: data.title, url: canonicalUrl(`/property/${data.slug}`) } : null
  }
  if (entity === 'development') {
    const { data } = await db.from('developments').select('developer_org_id, created_by, name, slug, is_hagerland').eq('id', id).maybeSingle()
    return data ? { orgId: data.developer_org_id, userId: data.created_by, title: data.name, url: canonicalUrl(data.is_hagerland ? `/our-developments/${data.slug}` : `/developments/${data.slug}`) } : null
  }
  if (entity === 'organisation') {
    const { data } = await db.from('organisations').select('id, created_by, name, slug').eq('id', id).maybeSingle()
    return data ? { orgId: data.id, userId: data.created_by, title: data.name, url: canonicalUrl(`/company/${data.slug}`) } : null
  }
  if (entity === 'product') {
    const { data } = await db.from('products').select('seller_org_id, name, slug').eq('id', id).maybeSingle()
    return data ? { orgId: data.seller_org_id, userId: null, title: data.name, url: canonicalUrl(`/supplies/product/${data.slug}`) } : null
  }
  const { data } = await db.from('portfolio_projects').select('org_id, title').eq('id', id).maybeSingle()
  return data ? { orgId: data.org_id, userId: null, title: data.title, url: canonicalUrl('/account/company/portfolio') } : null
}

/** Approve, reject, request changes, remove, or decide on pending changes (spec 6.8, 18.2 #2). */
export async function moderateAction(input: { entity: string; id: string; op: string; reason?: string }): Promise<ActionResult<{ message: string }>> {
  await assertAdmin(AREA)
  const parsed = schema.safeParse(input)
  if (!parsed.success) return fail('Invalid request.')
  const { entity, id, op, reason } = parsed.data
  if (['reject', 'changes', 'remove', 'reject_changes'].includes(op) && !reason) return fail('Please give a reason. The owner will see it.')
  const db = getAdminSupabase()
  const dyn = getAdminSupabaseDynamic()
  const table = TABLE[entity]
  const { data: row } = await dyn.from(table).select('*').eq('id', id).maybeSingle()
  if (!row) return fail('Not found.')
  const owner = await loadOwner(entity, id)
  const record = row as Record<string, unknown>
  const pending = (record.pending_changes as Record<string, unknown> | null | undefined) ?? null
  // Another admin may have decided it meanwhile: approving never republishes something removed or already live.
  if (op === 'approve' && !['pending_review', 'rejected', 'draft'].includes(String(record.status))) return fail('This is no longer waiting for review. Reload the page.')
  if (op === 'approve_changes' && !pending) return fail('These changes were already decided. Reload the page.')
  if (op === 'approve' && entity === 'organisation') {
    const block = (await importPublishBlock([id])).get(id)
    if (block) return fail(block)
  }
  let message = ''

  try {
    if (op === 'approve' || op === 'approve_changes') {
      const update: Record<string, unknown> = { ...(pending ?? {}), rejection_reason: null }
      if ('pending_changes' in record) update.pending_changes = null
      if (op === 'approve') update.status = 'published'
      const { error } = await dyn.from(table).update(update).eq('id', id)
      if (error) throw error
      // Details the business itself changed in its account are its own (for a business first imported from Google).
      if (entity === 'organisation' && op === 'approve_changes' && pending) await recordFieldSources(id, (['name', 'phone', 'address_line', 'website', 'description'] as const).filter((f) => f in pending), { source: 'confirmed_with_business', actor: 'business (own account)', note: 'Changed by the business in its account, approved by HagerLand', onlyTracked: true })
      await approveMediaOf(entity, id)
      message = op === 'approve' ? 'Approved and published.' : 'Changes approved and applied.'
      if (entity === 'property' && op === 'approve') await sendInstantAlerts(id)
      if (owner) {
        const to = await ownerEmails(owner.orgId, owner.userId)
        const name = await firstName(owner.userId)
        if (to.length && entity === 'property') {
          const { data: fresh } = await db.from('properties').select('expires_at').eq('id', id).maybeSingle()
          await sendEmail({ to, ...listingApprovedEmail({ name, title: owner.title, url: owner.url, expiresAt: fresh?.expires_at ?? null }) })
        } else if (to.length && entity === 'organisation') {
          await sendEmail({ to, ...orgDecisionEmail({ name, orgName: owner.title, approved: true, url: owner.url }) })
        } else if (to.length && (entity === 'development' || entity === 'product')) {
          await sendEmail({ to, ...listingApprovedEmail({ name, title: owner.title, url: owner.url, expiresAt: null }) })
        }
      }
    } else if (op === 'reject_changes') {
      const { error } = await dyn.from(table).update({ pending_changes: null }).eq('id', id)
      if (error) throw error
      message = 'Changes declined. The live version is unchanged.'
      if (owner) {
        const to = await ownerEmails(owner.orgId, owner.userId)
        if (to.length) await sendEmail({ to, ...listingRejectedEmail({ name: await firstName(owner.userId), title: `${owner.title} (your recent changes)`, reason: reason ?? '' }) })
      }
    } else {
      const status = op === 'remove' ? 'removed' : 'rejected'
      const { error } = await dyn.from(table).update({ status, rejection_reason: reason ?? null }).eq('id', id)
      if (error) throw error
      message = op === 'remove' ? 'Removed from the site.' : op === 'changes' ? 'Sent back to the owner for changes.' : 'Rejected.'
      if (owner) {
        const to = await ownerEmails(owner.orgId, owner.userId)
        const name = await firstName(owner.userId)
        if (to.length && entity === 'organisation') await sendEmail({ to, ...orgDecisionEmail({ name, orgName: owner.title, approved: false, reason, url: owner.url }) })
        else if (to.length) await sendEmail({ to, ...listingRejectedEmail({ name, title: owner.title, reason: reason ?? '' }) })
      }
    }
  } catch (err) {
    log.error('admin', 'moderation failed', err, { entity, op })
    return fail('That did not work. Please try again.')
  }

  await audit(`${entity}.${op}`, { type: entity, id, label: owner?.title }, reason ? { reason } : pending ? { applied: pending } : null)
  revalidateEntity(entity === 'portfolio' ? 'portfolio' : entity, id)
  revalidatePath('/roodber8', 'layout')
  return ok({ message })
}

export async function bulkApproveAction(entity: string, ids: string[]): Promise<ActionResult<{ message: string }>> {
  await assertAdmin(AREA)
  let done = 0
  for (const id of ids.slice(0, 100)) {
    const r = await moderateAction({ entity, id, op: 'approve' })
    if (r.ok) done++
  }
  return ok({ message: `Approved ${done} of ${ids.length}.` })
}

export async function mediaDecisionAction(mediaId: string, approve: boolean): Promise<ActionResult<{ message: string }>> {
  await assertAdmin(AREA)
  if (!z.uuid().safeParse(mediaId).success) return fail('Invalid.')
  const db = getAdminSupabase()
  const { data } = await db.from('media').update({ status: approve ? 'approved' : 'rejected' }).eq('id', mediaId).select('entity_type, entity_id').maybeSingle()
  if (!data) return fail('Not found.')
  await audit(approve ? 'media.approve' : 'media.reject', { type: 'media', id: mediaId })
  revalidateEntity(data.entity_type as Entity, data.entity_id)
  revalidatePath('/roodber8', 'layout')
  return ok({ message: approve ? 'Photo approved.' : 'Photo rejected.' })
}

export async function claimDecisionAction(claimId: string, approve: boolean, note?: string): Promise<ActionResult<{ message: string }>> {
  await assertAdmin(AREA)
  if (!z.uuid().safeParse(claimId).success) return fail('Invalid.')
  const db = getAdminSupabase()
  const { data: claim } = await db.from('claims').select('*').eq('id', claimId).maybeSingle()
  if (!claim || claim.status !== 'pending') return fail('This claim has already been decided.')
  const { data: org } = await db.from('organisations').select('id, name, slug, verification_level').eq('id', claim.org_id).maybeSingle()
  if (!org) return fail('Organisation not found.')
  if (approve) {
    const { error: memberError } = await db.from('organisation_members').upsert({ org_id: org.id, user_id: claim.user_id, role: 'owner' })
    if (memberError) return fail('Could not add the owner. Please try again.')
    await db.from('organisations').update({ verification_level: org.verification_level === 'listed' ? 'claimed' : org.verification_level, claimed_at: new Date().toISOString() }).eq('id', org.id)
    await db.from('profiles').update({ account_type: 'business' }).eq('id', claim.user_id)
  }
  await db.from('claims').update({ status: approve ? 'approved' : 'rejected', admin_notes: note ?? null, decided_at: new Date().toISOString() }).eq('id', claimId)
  if (claim.claimant_email) await sendEmail({ to: claim.claimant_email, ...claimDecisionEmail({ name: claim.claimant_name.split(' ')[0], orgName: org.name, approved: approve, note: approve ? null : note }) })
  await audit(approve ? 'claim.approve' : 'claim.reject', { type: 'organisation', id: org.id, label: org.name }, { claim: claimId, note: note ?? null })
  revalidateEntity('organisation', org.id)
  revalidatePath('/roodber8', 'layout')
  return ok({ message: approve ? `${claim.claimant_name} now manages ${org.name}.` : 'Claim rejected.' })
}

export async function verificationDecisionAction(requestId: string, approve: boolean, note?: string): Promise<ActionResult<{ message: string }>> {
  await assertAdmin(AREA)
  if (!z.uuid().safeParse(requestId).success) return fail('Invalid.')
  const db = getAdminSupabase()
  const { data: req } = await db.from('verification_requests').select('*').eq('id', requestId).maybeSingle()
  if (!req || req.status !== 'pending') return fail('This request has already been decided.')
  const { data: org } = await db.from('organisations').select('id, name').eq('id', req.org_id).maybeSingle()
  if (!org) return fail('Organisation not found.')
  if (approve) await db.from('organisations').update({ verification_level: 'verified', verified_at: new Date().toISOString() }).eq('id', org.id)
  await db.from('verification_requests').update({ status: approve ? 'approved' : 'rejected', admin_notes: note ?? null, decided_at: new Date().toISOString() }).eq('id', requestId)
  const to = await ownerEmails(org.id, req.submitted_by)
  if (to.length) await sendEmail({ to, ...verificationDecisionEmail({ name: await firstName(req.submitted_by), orgName: org.name, approved: approve, note }) })
  await audit(approve ? 'verification.approve' : 'verification.reject', { type: 'organisation', id: org.id, label: org.name }, note ? { note } : null)
  revalidateEntity('organisation', org.id)
  revalidatePath('/roodber8', 'layout')
  return ok({ message: approve ? `${org.name} is now Verified.` : 'Verification declined.' })
}

export async function reportDecisionAction(reportId: string, status: 'actioned' | 'dismissed'): Promise<ActionResult<{ message: string }>> {
  await assertAdmin(AREA)
  if (!z.uuid().safeParse(reportId).success) return fail('Invalid.')
  const { error } = await getAdminSupabase().from('reports').update({ status }).eq('id', reportId)
  if (error) return fail('Please try again.')
  await audit(`report.${status}`, { type: 'report', id: reportId })
  revalidatePath('/roodber8', 'layout')
  return ok({ message: status === 'actioned' ? 'Marked as dealt with.' : 'Dismissed.' })
}
