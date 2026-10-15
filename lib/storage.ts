import 'server-only'
import sharp from 'sharp'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getServerSupabase } from '@/lib/supabase/server'
import { DOC_TYPES, IMAGE_TYPES, MAX_DOC_BYTES, MAX_IMAGE_BYTES, MEDIA_LIMITS, PRIVATE_BUCKET, PUBLIC_BUCKET, type MediaEntity, type MediaKind } from '@/lib/media'
import { log } from '@/lib/log'

const EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/msword': 'doc',
}

/** Detects the real file type from its first bytes (never trust the browser's claim). */
export function sniffType(buf: Buffer): string | null {
  if (buf.length < 12) return null
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
  if (buf.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf'
  if (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) return 'application/zip'
  if (buf.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]))) return 'application/x-ole'
  return null
}

/** Office files are zip (xlsx/docx) or OLE (xls/doc) containers; accept the claim only if the container matches. */
function typeMatches(claimed: string, sniffed: string | null): boolean {
  if (!sniffed) return false
  if (claimed === sniffed) return true
  if (sniffed === 'application/zip') return claimed.includes('openxmlformats')
  if (sniffed === 'application/x-ole') return claimed === 'application/vnd.ms-excel' || claimed === 'application/msword'
  return false
}

export function isAllowedUpload(kind: MediaKind | 'private', contentType: string, size: number): string | null {
  const isImage = kind === 'image' || kind === 'floorplan' || kind === 'logo' || kind === 'cover'
  const types = isImage ? IMAGE_TYPES : DOC_TYPES
  if (!types.includes(contentType)) return isImage ? 'Upload a JPEG, PNG or WebP image.' : 'Upload a PDF, image, Excel or Word file.'
  const max = isImage ? MAX_IMAGE_BYTES : MAX_DOC_BYTES
  if (size > max) return `Files must be under ${Math.round(max / 1024 / 1024)} MB.`
  return null
}

/** Whether the signed-in user may manage media for this entity (RLS-backed check). */
export async function userCanEditEntity(entityType: MediaEntity, entityId: string): Promise<boolean> {
  const { data } = await getServerSupabase().rpc('can_edit_entity', { p_entity_type: entityType, p_entity_id: entityId })
  return data === true
}

export async function countMedia(entityType: MediaEntity, entityId: string, kind: MediaKind): Promise<number> {
  const { count } = await getAdminSupabase().from('media').select('id', { count: 'exact', head: true }).eq('entity_type', entityType).eq('entity_id', entityId).eq('kind', kind)
  return count ?? 0
}

export function mediaLimit(entityType: MediaEntity, kind: MediaKind): number {
  return MEDIA_LIMITS[entityType][kind] ?? 0
}

/** Issues a one-time signed upload URL into the private holding area. */
export async function createIncomingUpload(scope: string, contentType: string): Promise<{ path: string; token: string; signedUrl: string }> {
  const path = `incoming/${scope}/${crypto.randomUUID()}.${EXT[contentType] ?? 'bin'}`
  const { data, error } = await getAdminSupabase().storage.from(PRIVATE_BUCKET).createSignedUploadUrl(path)
  if (error || !data) throw new Error(`signed upload failed: ${error?.message}`)
  return { path, token: data.token, signedUrl: data.signedUrl }
}

async function readIncoming(path: string): Promise<Buffer> {
  if (!path.startsWith('incoming/') || path.includes('..')) throw new Error('invalid upload path')
  const { data, error } = await getAdminSupabase().storage.from(PRIVATE_BUCKET).download(path)
  if (error || !data) throw new Error(`download failed: ${error?.message}`)
  return Buffer.from(await data.arrayBuffer())
}

async function removeIncoming(path: string): Promise<void> {
  await getAdminSupabase().storage.from(PRIVATE_BUCKET).remove([path])
}

export interface ProcessedImage {
  storage_path: string
  thumb_path: string
  width: number
  height: number
  bytes: number
}

/** Re-encodes an image as WebP (max 2400px, plus a 640px thumbnail). Metadata, including GPS location, is not copied. */
export async function encodeImage(buf: Buffer): Promise<{ full: { data: Buffer; info: { width: number; height: number } }; thumb: Buffer }> {
  const pipeline = sharp(buf, { failOn: 'error', limitInputPixels: 80_000_000 }).rotate()
  const full = await pipeline.clone().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true })
  const thumb = await pipeline.clone().resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true }).webp({ quality: 72 }).toBuffer()
  return { full, thumb }
}

/**
 * Validates and re-encodes an uploaded image: WebP, max 2400px long edge, quality 80,
 * plus a 640px thumbnail. Re-encoding drops all metadata, including GPS location.
 */
export async function processIncomingImage(incomingPath: string, entityType: MediaEntity, entityId: string): Promise<ProcessedImage> {
  const buf = await readIncoming(incomingPath)
  try {
    const sniffed = sniffType(buf)
    if (!sniffed || !IMAGE_TYPES.includes(sniffed)) throw new UploadError('That file is not a JPEG, PNG or WebP image.')
    if (buf.length > MAX_IMAGE_BYTES) throw new UploadError('Images must be under 12 MB.')
    const { full, thumb } = await encodeImage(buf)
    const id = crypto.randomUUID()
    const storagePath = `${entityType}/${entityId}/${id}.webp`
    const thumbPath = `${entityType}/${entityId}/${id}-640.webp`
    const bucket = getAdminSupabase().storage.from(PUBLIC_BUCKET)
    const opts = { contentType: 'image/webp', cacheControl: '31536000', upsert: false }
    const [a, b] = await Promise.all([bucket.upload(storagePath, full.data, opts), bucket.upload(thumbPath, thumb, opts)])
    if (a.error || b.error) throw new Error(`publish failed: ${a.error?.message ?? b.error?.message}`)
    return { storage_path: storagePath, thumb_path: thumbPath, width: full.info.width, height: full.info.height, bytes: full.data.length }
  } finally {
    await removeIncoming(incomingPath)
  }
}

/** Validates a private document and moves it to its final private location. Returns the stored path. */
export async function processIncomingDocument(incomingPath: string, claimedType: string, scope: string): Promise<string> {
  const buf = await readIncoming(incomingPath)
  try {
    if (!typeMatches(claimedType, sniffType(buf))) throw new UploadError('That file type is not allowed. Upload a PDF, image, Excel or Word file.')
    if (buf.length > MAX_DOC_BYTES) throw new UploadError('Files must be under 15 MB.')
    let body = buf
    let contentType = claimedType
    if (IMAGE_TYPES.includes(claimedType)) {
      body = await sharp(buf, { failOn: 'error' }).rotate().jpeg({ quality: 85 }).toBuffer()
      contentType = 'image/jpeg'
    }
    const finalPath = `docs/${scope}/${crypto.randomUUID()}.${EXT[contentType] ?? 'bin'}`
    const { error } = await getAdminSupabase().storage.from(PRIVATE_BUCKET).upload(finalPath, body, { contentType, upsert: false })
    if (error) throw new Error(`store failed: ${error.message}`)
    return finalPath
  } finally {
    await removeIncoming(incomingPath)
  }
}

/** Short-lived (10 minute) link to a private document. Call only after checking the viewer may see it. */
export async function signedDocumentUrl(path: string, downloadName?: string): Promise<string | null> {
  const { data, error } = await getAdminSupabase().storage.from(PRIVATE_BUCKET).createSignedUrl(path, 600, downloadName ? { download: downloadName } : undefined)
  if (error) {
    log.error('storage', 'signed url failed', error)
    return null
  }
  return data.signedUrl
}

export async function deletePublicFiles(paths: string[]): Promise<void> {
  const list = paths.filter(Boolean)
  if (list.length) await getAdminSupabase().storage.from(PUBLIC_BUCKET).remove(list)
}

export async function deletePrivateFiles(paths: string[]): Promise<void> {
  const list = paths.filter(Boolean)
  if (list.length) await getAdminSupabase().storage.from(PRIVATE_BUCKET).remove(list)
}

/** An error whose message is safe to show to the user. */
export class UploadError extends Error {}
