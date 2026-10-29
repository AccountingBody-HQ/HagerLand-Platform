'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth'
import { fail, invalid, type ActionResult } from '@/lib/action-result'
import { STALE_EDIT, isStaleEdit } from '@/lib/concurrency'
import { hashRequestToken, isWellFormedToken } from '@/lib/service-requests/token'
import { ownDraft } from '@/lib/supply/partner-access'
import { PARTNER_EDITABLE, PARTNER_WITHDRAWABLE, draftSchema, ownPhotoPaths, parseSpecLines, type DraftStatus } from '@/lib/supply/partner-rules'
import { log } from '@/lib/log'

type Result = ActionResult<{ message: string }>
const FAILED = 'Something went wrong. Please refresh the page.'

/**
 * S6-1 partner portal: save a product draft, or save and send it for review. Only the signed-in partner member's own
 * partner, only while the draft is editable. The partner never sets anything about HagerLand's product or terms.
 * Success goes back to the draft (its status says what happened), so no new wording is needed.
 */
export async function savePartnerDraftAction(_prev: Result | null, formData: FormData): Promise<Result> {
  const parsed = draftSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  const own = await ownDraft(d.id)
  if (!own) return fail(FAILED)
  if (own.draft && !PARTNER_EDITABLE.includes(own.draft.status as DraftStatus)) return fail(FAILED)
  if (own.draft && (await isStaleEdit('partner_product_drafts', d.id, formData.get('expected_updated_at')))) return fail(STALE_EDIT)
  const db = getAdminSupabase()
  if (d.category_id) {
    const { data: cat } = await db.from('product_categories').select('id').eq('id', d.category_id).maybeSingle()
    if (!cat) return fail('Please check the highlighted fields.', { category_id: 'Choose a category' })
  }
  const now = new Date().toISOString()
  const values = {
    name: d.name,
    brand_name: d.brand_name ?? null,
    category_id: d.category_id ?? null,
    unit: d.unit,
    pack_size: d.pack_size ?? null,
    description: d.description ?? null,
    specs: parseSpecLines(d.specs),
    partner_sku: d.partner_sku ?? null,
    proposed_price_cents: d.proposed_price ?? null,
    stock_note: d.stock_note ?? null,
    lead_time_days: d.lead_time_days ?? null,
    min_order_qty: d.min_order_qty ?? null,
    photo_paths: ownPhotoPaths(d.id, formData.getAll('photo_paths')),
    ...(d.intent === 'send' ? { status: 'submitted', status_changed_at: now, submitted_at: now } : {}),
  }
  const { error } = own.draft
    ? await db.from('partner_product_drafts').update(values).eq('id', d.id).eq('org_id', own.membership.orgId).in('status', PARTNER_EDITABLE)
    : await db.from('partner_product_drafts').insert({ ...values, id: d.id, org_id: own.membership.orgId, created_by_user: own.membership.userId })
  if (error) {
    log.error('partner-portal', 'draft save failed', error)
    return fail(FAILED)
  }
  revalidatePath('/partner', 'layout')
  redirect(`/partner/${d.id}`)
}

/** Withdraw a draft (before or after sending it), never after HagerLand's decision. */
export async function withdrawPartnerDraftAction(draftId: string): Promise<Result> {
  if (!z.uuid().safeParse(draftId).success) return fail(FAILED)
  const own = await ownDraft(draftId)
  if (!own?.draft || !PARTNER_WITHDRAWABLE.includes(own.draft.status as DraftStatus)) return fail(FAILED)
  const { error } = await getAdminSupabase()
    .from('partner_product_drafts')
    .update({ status: 'withdrawn', status_changed_at: new Date().toISOString(), decided_at: new Date().toISOString() })
    .eq('id', draftId)
    .eq('org_id', own.membership.orgId)
    .in('status', PARTNER_WITHDRAWABLE)
  if (error) return fail(FAILED)
  revalidatePath('/partner', 'layout')
  redirect('/partner')
}

/** Accept a partner-area invitation: a partner member (never a business member), then the partner area. */
export async function acceptPartnerInvitationAction(token: string): Promise<Result> {
  const user = await requireUser(`/partner/invite/${token}`)
  if (!isWellFormedToken(token)) return fail('This invitation link is not valid.')
  const db = getAdminSupabase()
  const { data: inv } = await db.from('partner_invitations').select('id, org_id, email, expires_at, accepted_at, revoked_at').eq('token_hash', hashRequestToken(token)).maybeSingle()
  if (!inv || inv.revoked_at) return fail('This invitation is no longer valid. Ask for a new one.')
  if (inv.accepted_at) return fail('This invitation has already been used.')
  if (new Date(inv.expires_at).getTime() < Date.now()) return fail('This invitation has expired. Ask for a new one.')
  if (user.email?.toLowerCase() !== inv.email) return fail(`This invitation is for ${inv.email}. Sign in with that email address to accept it.`)
  const { data: reg } = await db.from('partner_registrations').select('id').eq('org_id', inv.org_id).eq('status', 'approved').limit(1).maybeSingle()
  if (!reg) return fail('This invitation is no longer valid. Ask for a new one.')
  const { error } = await db.from('partner_members').upsert({ org_id: inv.org_id, user_id: user.id, role: 'owner', invitation_id: inv.id }, { onConflict: 'org_id,user_id', ignoreDuplicates: true })
  if (error) {
    log.error('partner-portal', 'could not add partner member', error)
    return fail(FAILED)
  }
  const { error: used } = await db.from('partner_invitations').update({ accepted_at: new Date().toISOString(), accepted_by: user.id }).eq('id', inv.id).is('accepted_at', null)
  if (used) log.error('partner-portal', 'invitation not marked used', used)
  redirect('/partner')
}
