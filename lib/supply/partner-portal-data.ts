import 'server-only'
import { redirect, notFound } from 'next/navigation'
import { getUser } from '@/lib/auth'
import { getProductCategories } from '@/lib/data/reference'
import { signedDocumentUrl } from '@/lib/storage'
import { getPartnerMembership, type PartnerMembership } from '@/lib/supply/partner-access'

/** The partner area is for signed-in partner members only: guests sign in first; anyone else gets "not found". */
export async function requirePartnerPage(path: string): Promise<PartnerMembership> {
  if (!(await getUser())) redirect(`/login?next=${encodeURIComponent(path)}`)
  const membership = await getPartnerMembership()
  if (!membership) notFound()
  return membership
}

/** Every category a product may sit in (main categories and their sub-categories), in the catalogue's order. */
export async function partnerCategories(): Promise<{ id: string; name: string }[]> {
  const tree = await getProductCategories()
  return tree.flatMap((c) => [{ id: c.id, name: c.name }, ...c.children.map((s) => ({ id: s.id, name: `${c.name} › ${s.name}` }))])
}

/** Short-lived links to a draft's own photos (checked by the caller: the draft is the member's own). */
export async function draftPhotoLinks(paths: string[]): Promise<{ path: string; url: string | null }[]> {
  return Promise.all(paths.map(async (path) => ({ path, url: await signedDocumentUrl(path) })))
}
