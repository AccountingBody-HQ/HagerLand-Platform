import 'server-only'
// Jobs Phase 3 (owner only): signed fee agreements in the recruitment-private bucket (migration 0041: not public, no
// access rules, 10 MB, photos and PDF). Same upload and checking rules as supply agreements (lib/supply/private-files.ts),
// kept in their own bucket so recruitment and supply files never mix. Viewed through links that expire after 10 minutes.
import { getAdminSupabase } from '@/lib/supabase/admin'
import { FILE_TYPES, LINK_SECONDS, fileProblem } from '@/lib/supply/private-files'

export const RECRUITMENT_BUCKET = 'recruitment-private'

/** A one-time link to upload one agreement into agreements/<placementId>/. */
export async function createAgreementUpload(placementId: string, contentType: string, size: number): Promise<{ ok: true; path: string; signedUrl: string } | { ok: false; error: string }> {
  const problem = fileProblem(contentType, size)
  if (problem) return { ok: false, error: problem }
  const path = `agreements/${placementId}/${crypto.randomUUID()}.${FILE_TYPES[contentType]}`
  const { data, error } = await getAdminSupabase().storage.from(RECRUITMENT_BUCKET).createSignedUploadUrl(path)
  if (error || !data) return { ok: false, error: 'Upload is unavailable right now. Please try again.' }
  return { ok: true, path, signedUrl: data.signedUrl }
}

/** The uploaded file really exists in agreements/<placementId>/, with an allowed type and size. */
export async function confirmAgreementUpload(placementId: string, path: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const match = new RegExp(`^agreements/${placementId}/([0-9a-f-]{36}\\.(jpg|png|webp|heic|heif|pdf))$`).exec(path)
  if (!match) return { ok: false, error: 'Invalid file.' }
  const { data } = await getAdminSupabase().storage.from(RECRUITMENT_BUCKET).list(`agreements/${placementId}`, { search: match[1], limit: 1 })
  const meta = data?.find((o) => o.name === match[1])?.metadata as { size?: number; mimetype?: string } | undefined
  if (!meta?.size || !meta.mimetype) return { ok: false, error: 'The upload did not finish. Please try again.' }
  const problem = fileProblem(meta.mimetype, meta.size)
  return problem ? { ok: false, error: problem } : { ok: true }
}

/** A link to view an agreement, valid for 10 minutes. Only call for the owner. */
export async function agreementLink(path: string): Promise<string | null> {
  const { data } = await getAdminSupabase().storage.from(RECRUITMENT_BUCKET).createSignedUrl(path, LINK_SECONDS)
  return data?.signedUrl ?? null
}
