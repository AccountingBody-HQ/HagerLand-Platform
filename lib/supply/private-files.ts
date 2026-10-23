import 'server-only'
// Supply Phase 4 (admin): private files for agreements and delivery proof, in the supply-private storage bucket
// (migration 0037: not public, no access rules, 10 MB, photos and PDF). Uploads go straight to storage through a
// one-time signed link; files are viewed through links that expire after 10 minutes. Server only.
import { getAdminSupabase } from '@/lib/supabase/admin'

export const SUPPLY_BUCKET = 'supply-private'
export const MAX_FILE_BYTES = 10 * 1024 * 1024
export const FILE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'application/pdf': 'pdf',
}
export const LINK_SECONDS = 600

export type FileKind = 'agreements' | 'proofs'

export function fileProblem(contentType: string, size: number): string | null {
  if (!FILE_TYPES[contentType]) return 'Upload a photo (JPEG, PNG, WebP or HEIC) or a PDF.'
  if (!Number.isInteger(size) || size <= 0) return 'That file is empty.'
  if (size > MAX_FILE_BYTES) return 'Files must be 10 MB or smaller.'
  return null
}

/** A one-time link to upload one file into kind/ownerId/. */
export async function createPrivateUpload(kind: FileKind, ownerId: string, contentType: string, size: number): Promise<{ ok: true; path: string; signedUrl: string } | { ok: false; error: string }> {
  const problem = fileProblem(contentType, size)
  if (problem) return { ok: false, error: problem }
  const path = `${kind}/${ownerId}/${crypto.randomUUID()}.${FILE_TYPES[contentType]}`
  const { data, error } = await getAdminSupabase().storage.from(SUPPLY_BUCKET).createSignedUploadUrl(path)
  if (error || !data) return { ok: false, error: 'Upload is unavailable right now. Please try again.' }
  return { ok: true, path, signedUrl: data.signedUrl }
}

/** The uploaded file really exists in kind/ownerId/, with an allowed type and size. */
export async function confirmPrivateUpload(kind: FileKind, ownerId: string, path: string): Promise<{ ok: true; contentType: string; size: number } | { ok: false; error: string }> {
  const match = new RegExp(`^${kind}/${ownerId}/([0-9a-f-]{36}\\.(jpg|png|webp|heic|heif|pdf))$`).exec(path)
  if (!match) return { ok: false, error: 'Invalid file.' }
  const { data } = await getAdminSupabase().storage.from(SUPPLY_BUCKET).list(`${kind}/${ownerId}`, { search: match[1], limit: 1 })
  const meta = data?.find((o) => o.name === match[1])?.metadata as { size?: number; mimetype?: string } | undefined
  if (!meta?.size || !meta.mimetype) return { ok: false, error: 'The upload did not finish. Please try again.' }
  const problem = fileProblem(meta.mimetype, meta.size)
  return problem ? { ok: false, error: problem } : { ok: true, contentType: meta.mimetype, size: meta.size }
}

/** A link to view a private file, valid for 10 minutes. Only call after checking the viewer may see it. */
export async function privateFileLink(path: string): Promise<string | null> {
  const { data } = await getAdminSupabase().storage.from(SUPPLY_BUCKET).createSignedUrl(path, LINK_SECONDS)
  return data?.signedUrl ?? null
}
