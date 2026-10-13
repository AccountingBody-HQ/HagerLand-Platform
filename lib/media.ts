// Client-safe media helpers: public URLs and upload limits.

export type MediaEntity = 'property' | 'development' | 'organisation' | 'portfolio' | 'product'
export type MediaKind = 'image' | 'floorplan' | 'document' | 'logo' | 'cover'

export const PUBLIC_BUCKET = 'public-media'
export const PRIVATE_BUCKET = 'private-docs'

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const DOC_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
]
export const MAX_IMAGE_BYTES = 12 * 1024 * 1024
export const MAX_DOC_BYTES = 15 * 1024 * 1024

/** Maximum files per entity and kind (spec 6.3 media limits). */
export const MEDIA_LIMITS: Record<MediaEntity, Partial<Record<MediaKind, number>>> = {
  property: { image: 25, floorplan: 3 },
  development: { image: 40, floorplan: 20, document: 1 },
  product: { image: 8, document: 3 },
  portfolio: { image: 20 },
  organisation: { logo: 1, cover: 1 },
}

export function publicMediaUrl(path: string | null | undefined): string | null {
  if (!path) return null
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null
  return `${base}/storage/v1/object/public/${PUBLIC_BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`
}

/** Thumbnail path written next to each processed image ("<id>.webp" → "<id>-640.webp"). */
export function thumbPath(path: string): string {
  return path.replace(/\.webp$/, '-640.webp')
}
