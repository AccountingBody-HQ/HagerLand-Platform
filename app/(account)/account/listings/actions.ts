'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { Database } from '@/lib/database.types'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getActiveMembership, getProfile, isEmailConfirmed, requireUser } from '@/lib/auth'
import { basicsSchema, contactSchema, declarationsSchema, detailsSchema, formToObject, locationSchema, MIN_PHOTOS, type WizardStep } from '@/lib/validation/property'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { listingSlug, shortId } from '@/lib/slug'
import { getLocationChain, getSettingNumber, isEthiopianLocation, NOT_IN_ETHIOPIA } from '@/lib/data/reference'
import { propertyHeadline } from '@/lib/labels'
import { revalidateEntity } from '@/lib/revalidate'
import { sendEmail } from '@/lib/email/send'
import { listingSubmittedEmail } from '@/lib/email/templates'
import { log } from '@/lib/log'
import { canRenew, resumeOutcome } from '@/lib/listing-rules'
import { privateOwnerEntitlements, withinLimit } from '@/lib/entitlements'
import { withUniqueRetry } from '@/lib/unique-retry'

type PropertyUpdate = Database['public']['Tables']['properties']['Update']
type PropertyRow = Database['public']['Tables']['properties']['Row']

export type WizardState = ActionResult<{ id: string; next: WizardStep | 'done'; message?: string }> | null

const NEXT: Record<WizardStep, WizardStep | 'done'> = { basics: 'location', location: 'details', details: 'photos', photos: 'contact', contact: 'review', review: 'done' }

async function slugFor(p: { purpose: string; property_type: string; bedrooms?: number | null; location_id: string }, sid: string): Promise<string> {
  const chain = await getLocationChain(p.location_id)
  const names = chain.slice(-2).reverse().map((l) => l.name).join(' ')
  return listingSlug(`${propertyHeadline(p.property_type, p.bedrooms ?? null)} ${p.purpose === 'rent' ? 'to rent' : 'for sale'} ${names}`, sid)
}

/** Only developments the user's organisation owns can be linked (RLS hides others). */
async function ownDevelopment(id: string | undefined): Promise<string | null> {
  if (!id) return null
  const { data } = await getServerSupabase().from('developments').select('id').eq('id', id).maybeSingle()
  return data?.id ?? null
}

async function loadOwn(id: string): Promise<PropertyRow | null> {
  const { data } = await getServerSupabase().from('properties').select('*').eq('id', id).maybeSingle()
  return data
}

/** Draft/rejected listings are edited directly; live ones collect changes for review (spec 6.8). */
async function writeChanges(row: PropertyRow, changes: PropertyUpdate): Promise<string | null> {
  const supabase = getServerSupabase()
  if (row.status === 'published' || row.status === 'paused') {
    const merged = { ...((row.pending_changes as Record<string, unknown> | null) ?? {}), ...changes }
    const { error } = await supabase.from('properties').update({ pending_changes: merged as Database['public']['Tables']['properties']['Update']['pending_changes'] }).eq('id', row.id)
    return error ? error.message : null
  }
  if (['removed', 'archived', 'expired'].includes(row.status)) return 'This listing can no longer be edited.'
  const { error } = await supabase.from('properties').update(changes).eq('id', row.id)
  return error ? error.message : null
}

export async function saveListingStepAction(_prev: WizardState, formData: FormData): Promise<WizardState> {
  const user = await requireUser('/account/listings')
  const step = String(formData.get('step')) as WizardStep
  const id = String(formData.get('property_id') ?? '')
  const raw = formToObject(formData, ['features'])
  const supabase = getServerSupabase()

  if (!id) {
    if (step !== 'location') return fail('Please start from the first step.')
    const basics = basicsSchema.safeParse(raw)
    if (!basics.success) return invalid(basics.error)
    const loc = locationSchema.safeParse(raw)
    if (!loc.success) return invalid(loc.error)
    if (!(await isEthiopianLocation(loc.data.location_id))) return fail(NOT_IN_ETHIOPIA, { location_id: 'Choose a place in Ethiopia' })
    const active = await getActiveMembership()
    const listerType = active?.org.kind === 'agency' ? 'agent' : active?.org.kind === 'developer' ? 'developer' : 'owner'
    const profile = await getProfile()
    const { data, error } = await withUniqueRetry(async () => {
      // A new short id each try: a duplicate (very rare) is retried instead of failing.
      const sid = shortId()
      return supabase
        .from('properties')
        .insert({
        short_id: sid,
        slug: await slugFor({ ...basics.data, location_id: loc.data.location_id }, sid),
        ...basics.data,
        price_period: basics.data.purpose === 'rent' ? 'month' : null,
        location_id: loc.data.location_id,
        address_line: loc.data.address_line ?? null,
        show_exact_location: loc.data.show_exact_location,
        lat: loc.data.lat ?? null,
        lng: loc.data.lng ?? null,
        development_id: await ownDevelopment(loc.data.development_id),
        lister_type: listerType,
        lister_user_id: user.id,
        lister_org_id: listerType === 'owner' ? null : active?.org.id ?? null,
        contact_phone: profile?.phone ?? null,
        status: 'draft',
      })
      .select('id')
      .single()
    })
    if (error || !data) {
      log.error('listing', 'create draft failed', error)
      return fail('We could not save your listing. Please try again.')
    }
    if (loc.data.requested_area) {
      await getAdminSupabase().from('admin_notes').insert({ entity_type: 'property', entity_id: data.id, note: `Lister asked for a new area: "${loc.data.requested_area}"` })
    }
    return ok({ id: data.id, next: 'details' })
  }

  const row = await loadOwn(id)
  if (!row) return fail('Listing not found.')

  let changes: PropertyUpdate = {}
  if (step === 'basics') {
    const r = basicsSchema.safeParse(raw)
    if (!r.success) return invalid(r.error)
    const hasPrice = (row.price_etb ?? (row.pending_changes as { price_etb?: number } | null)?.price_etb ?? null) !== null
    changes = { ...r.data, price_period: r.data.purpose === 'rent' && hasPrice ? 'month' : null }
  } else if (step === 'location') {
    const r = locationSchema.safeParse(raw)
    if (!r.success) return invalid(r.error)
    if (!(await isEthiopianLocation(r.data.location_id))) return fail(NOT_IN_ETHIOPIA, { location_id: 'Choose a place in Ethiopia' })
    changes = { location_id: r.data.location_id, address_line: r.data.address_line ?? null, show_exact_location: r.data.show_exact_location, ...(r.data.lat !== undefined ? { lat: r.data.lat, lng: r.data.lng ?? null } : {}), development_id: await ownDevelopment(r.data.development_id) }
    if (r.data.requested_area) await getAdminSupabase().from('admin_notes').insert({ entity_type: 'property', entity_id: id, note: `Lister asked for a new area: "${r.data.requested_area}"` })
  } else if (step === 'details') {
    const r = detailsSchema.safeParse(raw)
    if (!r.success) return invalid(r.error)
    const d = r.data
    const purpose = (row.pending_changes as { purpose?: string } | null)?.purpose ?? row.purpose
    changes = {
      price_on_request: d.price_on_request,
      price_etb: d.price_on_request ? null : d.price_etb ?? null,
      price_period: purpose === 'rent' && !d.price_on_request ? 'month' : null,
      price_negotiable: d.price_negotiable,
      advance_months: purpose === 'rent' ? d.advance_months ?? null : null,
      service_charge_etb: d.service_charge_etb ?? null,
      bedrooms: d.bedrooms ?? null,
      bathrooms: d.bathrooms ?? null,
      area_m2: d.area_m2 ?? null,
      plot_area_m2: d.plot_area_m2 ?? null,
      floors_label: d.floors_label?.toUpperCase() ?? null,
      floor_number: d.floor_number ?? null,
      year_built: d.year_built ?? null,
      finishing_status: d.finishing_status ?? null,
      furnishing: d.furnishing ?? null,
      tenure: d.tenure ?? null,
      has_title_deed: d.has_title_deed ?? null,
      completion_status: d.completion_status ?? null,
      parking_spaces: d.parking_spaces ?? null,
      features: d.features,
      video_url: d.video_url ?? null,
    }
  } else if (step === 'contact') {
    const r = contactSchema.safeParse(raw)
    if (!r.success) return invalid(r.error)
    if (!r.data.contact_phone && !r.data.contact_whatsapp) return fail('Add a phone or WhatsApp number so buyers can reach you.', { contact_phone: 'Add a phone number' })
    changes = { contact_phone: r.data.contact_phone ?? null, contact_whatsapp: r.data.contact_whatsapp ?? null, contact_telegram: r.data.contact_telegram ?? null, contact_email: r.data.contact_email ?? null, preferred_contact: r.data.preferred_contact ?? null }
  } else if (step === 'photos') {
    return ok({ id, next: 'contact' })
  } else if (step === 'review') {
    return submitListing(row, raw, user.id, isEmailConfirmed(user))
  }

  if (Object.keys(changes).length) {
    const merged = { ...row, ...((row.pending_changes as Partial<PropertyRow> | null) ?? {}), ...changes } as PropertyRow
    if ((step === 'basics' || step === 'location' || step === 'details') && row.status !== 'published' && row.status !== 'paused') {
      changes.slug = await slugFor({ purpose: merged.purpose, property_type: merged.property_type, bedrooms: merged.bedrooms, location_id: merged.location_id }, row.short_id)
    }
    const error = await writeChanges(row, changes)
    if (error) {
      log.error('listing', 'save step failed', error)
      return fail('We could not save this step. Please try again.')
    }
  }
  return ok({ id, next: NEXT[step] })
}

async function submitListing(row: PropertyRow, raw: Record<string, unknown>, userId: string, confirmed: boolean): Promise<WizardState> {
  if (!confirmed) return fail('Please confirm your email address before submitting.')
  const decl = declarationsSchema.safeParse(raw)
  if (!decl.success) return invalid(decl.error)

  const admin = getAdminSupabase()
  const { count: photos } = await admin.from('media').select('id', { count: 'exact', head: true }).eq('entity_type', 'property').eq('entity_id', row.id).eq('kind', 'image')
  if ((photos ?? 0) < MIN_PHOTOS) return fail(`Add at least ${MIN_PHOTOS} photos before submitting.`)
  if (!row.contact_phone && !row.contact_whatsapp) return fail('Add a phone or WhatsApp number in the Contact step.')
  if (!row.price_on_request && row.price_etb === null && !(row.pending_changes as { price_etb?: number } | null)?.price_etb) return fail('Add a price in the Details step.')

  if (row.status === 'published' || row.status === 'paused') {
    const applied = await maybeAutoApply(row)
    revalidatePath('/account/listings')
    return ok({ id: row.id, next: 'done', message: applied ? 'Your changes are live.' : 'Thanks. Your changes will appear once our team has reviewed them.' })
  }
  if (!['draft', 'rejected'].includes(row.status)) return ok({ id: row.id, next: 'done' })

  if (!row.lister_org_id) {
    const { maxActiveListings: cap } = await privateOwnerEntitlements()
    const { count } = await getServerSupabase().from('properties').select('id', { count: 'exact', head: true }).eq('lister_user_id', userId).is('lister_org_id', null).in('status', ['pending_review', 'published', 'paused'])
    if (!withinLimit(cap, count ?? 0)) return fail(`Private owners can have up to ${cap} active listings. Archive one, or create a business profile if you are an agent or developer.`)
  }

  const { error } = await getServerSupabase().from('properties').update({ status: 'pending_review' }).eq('id', row.id)
  if (error) return fail('We could not submit your listing. Please try again.')
  const profile = await getProfile()
  const { data: authUser } = await admin.auth.admin.getUserById(userId)
  if (authUser.user?.email) await sendEmail({ to: authUser.user.email, ...listingSubmittedEmail({ name: profile?.full_name?.split(' ')[0] ?? 'there', title: row.title }) })
  revalidatePath('/account/listings')
  return ok({ id: row.id, next: 'done', message: "Submitted. We'll review it and email you when it's live." })
}

/** Changes from verified organisations go live at once unless they move the location or cut the price by more than half. */
async function maybeAutoApply(row: PropertyRow): Promise<boolean> {
  const changes = (row.pending_changes as Partial<PropertyRow> | null) ?? null
  if (!changes || !row.lister_org_id) return false
  const admin = getAdminSupabase()
  const { data: org } = await admin.from('organisations').select('verification_level').eq('id', row.lister_org_id).maybeSingle()
  if (org?.verification_level !== 'verified') return false
  if (changes.location_id && changes.location_id !== row.location_id) return false
  if (changes.price_etb && row.price_etb && changes.price_etb < row.price_etb * 0.5) return false
  const { error } = await admin.from('properties').update({ ...(changes as PropertyUpdate), pending_changes: null }).eq('id', row.id)
  if (error) return false
  revalidateEntity('property', row.id)
  return true
}

const idSchema = z.uuid()

export async function listingStatusAction(id: string, action: 'pause' | 'resume' | 'renew' | 'archive'): Promise<ActionResult<{ message: string }>> {
  await requireUser('/account/listings')
  if (!idSchema.safeParse(id).success) return fail('Invalid listing.')
  const row = await loadOwn(id)
  if (!row) return fail('Listing not found.')
  const supabase = getServerSupabase()
  const admin = getAdminSupabase()
  const now = Date.now()
  let message = ''

  if (action === 'pause') {
    if (row.status !== 'published') return fail('Only live listings can be paused.')
    const { error } = await supabase.from('properties').update({ status: 'paused' }).eq('id', id)
    if (error) return fail('Please try again.')
    message = 'Paused. It is hidden until you resume it.'
  } else if (action === 'resume') {
    if (row.status !== 'paused') return fail('Only paused listings can be resumed.')
    // Spec 6.8: paused → published without review only if nothing changed and it has not expired.
    const outcome = resumeOutcome(row, now)
    if (outcome === 'expire') {
      const { error } = await admin.from('properties').update({ status: 'expired' }).eq('id', id)
      if (error) return fail('Please try again.')
      message = 'This listing expired while it was paused. Renew it to make it live again.'
    } else if (outcome === 'review') {
      const { error } = await supabase.from('properties').update({ status: 'pending_review' }).eq('id', id)
      if (error) return fail('Please try again.')
      message = 'You changed this listing while it was paused, so it goes back for a quick review. It will be live again once approved.'
    } else {
      const { error } = await admin.from('properties').update({ status: 'published' }).eq('id', id).eq('status', 'paused')
      if (error) return fail('Please try again.')
      message = 'Your listing is live again.'
    }
  } else if (action === 'renew') {
    if (!canRenew(row, now)) return fail(row.status === 'expired' ? 'This listing expired more than 30 days ago. Edit it and resubmit for review.' : 'You can renew in the last two weeks before it expires.')
    const days = await getSettingNumber('listing_expiry_days', 60)
    const { error } = await admin
      .from('properties')
      .update({ status: 'published', expires_at: new Date(now + days * 86_400_000).toISOString(), renewed_at: new Date().toISOString(), expiry_reminder_sent_at: null })
      .eq('id', id)
    if (error) return fail('Please try again.')
    message = `Renewed for another ${days} days.`
  } else {
    if (row.status === 'removed') return fail('This listing was removed by HagerLand.')
    const { error } = await supabase.from('properties').update({ status: 'archived' }).eq('id', id)
    if (error) return fail('Please try again.')
    message = 'Archived.'
  }
  revalidateEntity('property', id)
  revalidatePath('/account/listings')
  return ok({ message })
}
