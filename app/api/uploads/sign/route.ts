import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { canUpload, scopePrefix, type UploadScope } from '@/lib/media-access'
import { countMedia, createIncomingUpload, isAllowedUpload, mediaLimit } from '@/lib/storage'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp, hashIp } from '@/lib/security'
import { log } from '@/lib/log'

const bodySchema = z.discriminatedUnion('purpose', [
  z.object({
    purpose: z.literal('media'),
    entity_type: z.enum(['property', 'development', 'organisation', 'portfolio', 'product']),
    entity_id: z.uuid(),
    kind: z.enum(['image', 'floorplan', 'logo', 'cover']),
    content_type: z.string().max(120),
    size: z.number().int().positive(),
  }),
  z.object({
    purpose: z.literal('private'),
    area: z.enum(['verification', 'claim', 'materials', 'quote', 'brochure']),
    id: z.uuid(),
    content_type: z.string().max(120),
    size: z.number().int().positive(),
  }),
])

/** Issues a signed URL for uploading one file into the private holding area (spec 6.6 lib/storage). */
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400 })
  const b = parsed.data

  const limit = await rateLimit(`upload:${hashIp(getClientIp(request.headers))}`, 120, 3600)
  if (!limit.allowed) return NextResponse.json({ error: 'Too many uploads. Please wait and try again.' }, { status: 429 })

  const scope: UploadScope = b.purpose === 'media' ? { purpose: 'media', entityType: b.entity_type, entityId: b.entity_id } : { purpose: 'private', area: b.area, id: b.id }
  if (!(await canUpload(scope))) return NextResponse.json({ error: 'You cannot upload files here.' }, { status: 403 })

  const problem = isAllowedUpload(b.purpose === 'media' ? b.kind : 'private', b.content_type, b.size)
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  if (b.purpose === 'media') {
    const max = mediaLimit(b.entity_type, b.kind)
    if (max === 0) return NextResponse.json({ error: 'This kind of file is not allowed here.' }, { status: 400 })
    if ((await countMedia(b.entity_type, b.entity_id, b.kind)) >= max) {
      return NextResponse.json({ error: `You can add up to ${max} ${b.kind === 'image' ? 'photos' : 'files'} here.` }, { status: 400 })
    }
  }

  try {
    const upload = await createIncomingUpload(scopePrefix(scope), b.content_type)
    return NextResponse.json(upload)
  } catch (err) {
    log.error('uploads/sign', 'could not create signed upload', err)
    return NextResponse.json({ error: 'Upload is unavailable right now. Please try again.' }, { status: 500 })
  }
}
