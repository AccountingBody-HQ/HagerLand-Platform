import 'server-only'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { brand } from '@/lib/brand'
import { getBusinessDetails } from '@/lib/data/business'
import { canonicalUrl } from '@/lib/site'
import { propertyHeadline } from '@/lib/labels'

export type EnquiryTargetType = 'property' | 'development' | 'organisation' | 'product' | 'hagerland_development' | 'general'

export interface ResolvedTarget {
  label: string
  subjectLine: string
  url: string | null
  recipientOrgId: string | null
  recipientUserId: string | null
  recipientName: string
  /** HagerLand handles this enquiry itself (own developments, HagerLand Supply, general). */
  toHagerland: boolean
  inbox: 'sales' | 'supply' | 'general' | null
}

/** Works out who receives an enquiry. Returns null if the target is not live. */
export async function resolveEnquiryTarget(type: EnquiryTargetType, id: string | null): Promise<ResolvedTarget | null> {
  const db = getAdminSupabase()
  if (type === 'general') {
    return { label: 'HagerLand', subjectLine: 'General enquiry', url: null, recipientOrgId: null, recipientUserId: null, recipientName: 'the HagerLand team', toHagerland: true, inbox: 'general' }
  }
  if (type === 'hagerland_development' && !id) {
    return { label: brand.divisions.developments, subjectLine: `Register interest: ${brand.divisions.developments}`, url: canonicalUrl('/our-developments'), recipientOrgId: null, recipientUserId: null, recipientName: brand.divisions.developments, toHagerland: true, inbox: 'sales' }
  }
  if (!id) return null

  if (type === 'property') {
    const { data: p } = await db.from('properties').select('id, slug, title, property_type, bedrooms, status, lister_org_id, lister_user_id, is_hagerland').eq('id', id).maybeSingle()
    if (!p || p.status !== 'published') return null
    const org = p.lister_org_id ? (await db.from('organisations').select('name').eq('id', p.lister_org_id).maybeSingle()).data : null
    return {
      label: `"${p.title}"`,
      subjectLine: propertyHeadline(p.property_type, p.bedrooms),
      url: canonicalUrl(`/property/${p.slug}`),
      recipientOrgId: p.lister_org_id,
      recipientUserId: p.lister_org_id ? null : p.lister_user_id,
      recipientName: p.is_hagerland ? brand.divisions.developments : org?.name ?? 'the owner',
      toHagerland: p.is_hagerland,
      inbox: p.is_hagerland ? 'sales' : null,
    }
  }

  if (type === 'development' || type === 'hagerland_development') {
    const { data: d } = await db.from('developments').select('id, slug, name, status, developer_org_id, is_hagerland').eq('id', id).maybeSingle()
    if (!d || d.status !== 'published') return null
    const org = d.developer_org_id ? (await db.from('organisations').select('name').eq('id', d.developer_org_id).maybeSingle()).data : null
    return {
      label: d.name,
      subjectLine: d.name,
      url: canonicalUrl(d.is_hagerland ? `/our-developments/${d.slug}` : `/developments/${d.slug}`),
      recipientOrgId: d.is_hagerland ? null : d.developer_org_id,
      recipientUserId: null,
      recipientName: d.is_hagerland ? brand.divisions.developments : org?.name ?? 'the developer',
      toHagerland: d.is_hagerland,
      inbox: d.is_hagerland ? 'sales' : null,
    }
  }

  if (type === 'organisation') {
    const { data: o } = await db.from('organisations').select('id, slug, name, status, is_hagerland').eq('id', id).maybeSingle()
    if (!o || o.status !== 'published') return null
    return {
      label: o.name,
      subjectLine: `Enquiry for ${o.name}`,
      url: canonicalUrl(`/company/${o.slug}`),
      recipientOrgId: o.is_hagerland ? null : o.id,
      recipientUserId: null,
      recipientName: o.name,
      toHagerland: o.is_hagerland,
      inbox: o.is_hagerland ? (o.slug === 'hagerland-supply' ? 'supply' : 'sales') : null,
    }
  }

  const { data: pr } = await db.from('products').select('id, slug, name, status, seller_org_id').eq('id', id).maybeSingle()
  if (!pr || pr.status !== 'published') return null
  const seller = (await db.from('organisations').select('id, name, is_hagerland').eq('id', pr.seller_org_id).maybeSingle()).data
  return {
    label: pr.name,
    subjectLine: pr.name,
    url: canonicalUrl(`/supplies/product/${pr.slug}`),
    recipientOrgId: seller?.is_hagerland ? null : pr.seller_org_id,
    recipientUserId: null,
    recipientName: seller?.name ?? brand.divisions.supply,
    toHagerland: Boolean(seller?.is_hagerland),
    inbox: seller?.is_hagerland ? 'supply' : null,
  }
}

/** Email addresses of an organisation's owners and admins. */
export async function orgManagerEmails(orgId: string): Promise<string[]> {
  const db = getAdminSupabase()
  const { data: members } = await db.from('organisation_members').select('user_id').eq('org_id', orgId).in('role', ['owner', 'admin'])
  const emails = await Promise.all((members ?? []).map(async (m) => (await db.auth.admin.getUserById(m.user_id)).data.user?.email ?? null))
  return emails.filter((e): e is string => Boolean(e))
}

export async function userEmail(userId: string): Promise<string | null> {
  return (await getAdminSupabase().auth.admin.getUserById(userId)).data.user?.email ?? null
}

/** HagerLand's own inboxes (sales, supply, general), falling back to the main inbox. */
export async function hagerlandInbox(kind: 'sales' | 'supply' | 'general' | null): Promise<string | null> {
  const { contact } = await getBusinessDetails()
  const main = process.env.HAGERLAND_INBOX_EMAIL || contact.email || null
  if (kind === 'supply') return contact.supplyEmail || main
  return main
}

export const INTENT_LABELS: Record<string, string> = {
  viewing: 'Book a viewing',
  more_info: 'Ask a question',
  price: 'Price enquiry',
  offer: 'Make an offer',
  register_interest: 'Register interest',
  quote: 'Quote request',
  other: 'Other',
}
