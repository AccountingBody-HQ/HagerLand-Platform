'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getServerSupabase } from '@/lib/supabase/server'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { ACTIVE_ORG_COOKIE, getMemberships, isEmailConfirmed, requireUser } from '@/lib/auth'
import { organisationFormValues, organisationSchema, type OrganisationInput } from '@/lib/validation/organisation'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { shortId, slugify } from '@/lib/slug'
import { revalidateEntity } from '@/lib/revalidate'
import { trackServer } from '@/lib/analytics-server'
import { log } from '@/lib/log'

export interface DuplicateOrg {
  id: string
  name: string
  slug: string
  location_display: string | null
  verification_level: string
  has_members: boolean
}

export type OrgFormState = ActionResult<{ id: string }> | { ok: false; error: string; duplicates: DuplicateOrg[]; fieldErrors?: Record<string, string> }

function orgColumns(d: OrganisationInput) {
  return {
    name: d.name,
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
}

async function syncLinks(orgId: string, d: OrganisationInput): Promise<void> {
  const supabase = getServerSupabase()
  const services = Array.from(new Set(d.service_ids))
  const categories = Array.from(new Set(d.product_category_ids))
  await supabase.from('organisation_services').delete().eq('org_id', orgId)
  if (services.length) await supabase.from('organisation_services').insert(services.map((service_id) => ({ org_id: orgId, service_id })))
  await supabase.from('org_product_categories').delete().eq('org_id', orgId)
  if (categories.length) await supabase.from('org_product_categories').insert(categories.map((product_category_id) => ({ org_id: orgId, product_category_id })))
}

export async function createOrganisationAction(_prev: OrgFormState | null, formData: FormData): Promise<OrgFormState> {
  const user = await requireUser('/onboarding')
  if (!isEmailConfirmed(user)) return fail('Please confirm your email address first.')
  const parsed = organisationSchema.safeParse(organisationFormValues(formData))
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  const supabase = getServerSupabase()

  if (!d.confirm_new) {
    const { data: similar } = await supabase.rpc('find_similar_organisations', { p_name: d.name, p_location_id: d.location_id })
    const duplicates = (similar as unknown as DuplicateOrg[] | null) ?? []
    if (duplicates.length > 0) return { ok: false, error: 'possible_duplicate', duplicates }
  }

  const base = slugify(d.name, 60) || 'business'
  let orgId: string | null = null
  for (let attempt = 0; attempt < 3 && !orgId; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${shortId(4)}`
    const { data, error } = await supabase
      .from('organisations')
      .insert({ ...orgColumns(d), kind: d.kind, slug, created_by: user.id })
      .select('id')
      .single()
    if (data) orgId = data.id
    else if (error && error.code !== '23505') {
      log.error('org', 'create failed', error)
      return fail('We could not save your business. Please try again.')
    }
  }
  if (!orgId) return fail('We could not save your business. Please try again.')

  await syncLinks(orgId, d)
  await getAdminSupabase().from('profiles').update({ account_type: 'business' }).eq('id', user.id)
  await trackServer('org_created', { kind: d.kind })
  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60 * 24 * 365 })
  redirect('/account?welcome=business')
}

export async function updateOrganisationAction(_prev: OrgFormState | null, formData: FormData): Promise<OrgFormState> {
  await requireUser('/account/company')
  const parsed = organisationSchema.safeParse(organisationFormValues(formData))
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  if (!d.existing_id) return fail('Missing business.')
  const membership = (await getMemberships()).find((m) => m.org.id === d.existing_id && (m.role === 'owner' || m.role === 'admin'))
  if (!membership) return fail('You do not have permission to edit this business.')
  const supabase = getServerSupabase()
  const columns = orgColumns(d)

  if (membership.org.status === 'published') {
    const { error } = await supabase.from('organisations').update({ pending_changes: columns }).eq('id', d.existing_id)
    if (error) return fail('We could not save your changes. Please try again.')
    await syncLinks(d.existing_id, d)
    revalidateEntity('organisation', d.existing_id)
    return ok({ id: d.existing_id }, 'Thanks. Your changes are with our team and will appear once reviewed (usually within 1 business day).')
  }

  const status = membership.org.status === 'rejected' ? 'pending_review' : undefined
  const { error } = await supabase
    .from('organisations')
    .update({ ...columns, ...(status ? { status } : {}) })
    .eq('id', d.existing_id)
  if (error) {
    log.error('org', 'update failed', error)
    return fail('We could not save your changes. Please try again.')
  }
  await syncLinks(d.existing_id, d)
  return ok({ id: d.existing_id }, status ? 'Saved and resubmitted for review.' : 'Saved.')
}

export async function setActiveOrgAction(formData: FormData): Promise<void> {
  const orgId = String(formData.get('org_id') ?? '')
  const memberships = await getMemberships()
  if (memberships.some((m) => m.org.id === orgId)) {
    const cookieStore = await cookies()
    cookieStore.set(ACTIVE_ORG_COOKIE, orgId, { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60 * 24 * 365 })
  }
  redirect(String(formData.get('return_to') ?? '/account').startsWith('/account') ? String(formData.get('return_to')) : '/account')
}
