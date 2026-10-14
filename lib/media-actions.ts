'use server'

import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { isAdminRequest } from '@/lib/admin-auth'
import { getUser } from '@/lib/auth'
import { canUpload, scopePrefix, type UploadScope } from '@/lib/media-access'
import { countMedia, deletePublicFiles, mediaLimit, processIncomingDocument, processIncomingImage, UploadError } from '@/lib/storage'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { revalidateEntity } from '@/lib/revalidate'
import { log } from '@/lib/log'
import { CV_TYPES, PRIVATE_AREAS, type MediaEntity } from '@/lib/media'

const entitySchema = z.enum(['property', 'development', 'organisation', 'portfolio', 'product'])

export interface MediaItem {
  id: string
  kind: string
  storage_path: string
  thumb_path: string | null
  width: number | null
  height: number | null
  alt: string | null
  sort: number
  is_cover: boolean
  status: string
}

const MEDIA_COLUMNS = 'id, kind, storage_path, thumb_path, width, height, alt, sort, is_cover, status'

/** Media of verified organisations and admin uploads go live at once; others wait for review. */
async function initialStatus(entityType: MediaEntity, entityId: string): Promise<'approved' | 'pending'> {
  if (isAdminRequest()) return 'approved'
  const admin = getAdminSupabase()
  let orgId: string | null = null
  if (entityType === 'organisation') orgId = entityId
  else if (entityType === 'property') orgId = (await admin.from('properties').select('lister_org_id').eq('id', entityId).maybeSingle()).data?.lister_org_id ?? null
  else if (entityType === 'development') orgId = (await admin.from('developments').select('developer_org_id').eq('id', entityId).maybeSingle()).data?.developer_org_id ?? null
  else if (entityType === 'portfolio') orgId = (await admin.from('portfolio_projects').select('org_id').eq('id', entityId).maybeSingle()).data?.org_id ?? null
  else if (entityType === 'product') orgId = (await admin.from('products').select('seller_org_id').eq('id', entityId).maybeSingle()).data?.seller_org_id ?? null
  if (!orgId) return 'pending'
  const { data } = await admin.from('organisations').select('verification_level').eq('id', orgId).maybeSingle()
  return data?.verification_level === 'verified' ? 'approved' : 'pending'
}

export async function processMediaUploadAction(input: { incoming_path: string; entity_type: string; entity_id: string; kind: string; alt?: string }): Promise<ActionResult<MediaItem>> {
  const parsed = z
    .object({
      incoming_path: z.string().max(300),
      entity_type: entitySchema,
      entity_id: z.uuid(),
      kind: z.enum(['image', 'floorplan', 'logo', 'cover']),
      alt: z.string().max(200).optional(),
    })
    .safeParse(input)
  if (!parsed.success) return fail('Invalid upload.')
  const d = parsed.data
  const scope: UploadScope = { purpose: 'media', entityType: d.entity_type, entityId: d.entity_id }
  if (!(await canUpload(scope))) return fail('You cannot upload files here.')
  if (!d.incoming_path.startsWith(`incoming/${scopePrefix(scope)}/`)) return fail('Invalid upload.')

  const admin = getAdminSupabase()
  const existing = await countMedia(d.entity_type, d.entity_id, d.kind)
  if (existing >= mediaLimit(d.entity_type, d.kind)) return fail('You have reached the maximum number of files here.')

  try {
    const image = await processIncomingImage(d.incoming_path, d.entity_type, d.entity_id)
    if (d.kind === 'logo' || d.kind === 'cover') {
      const { data: old } = await admin.from('media').select('id, storage_path, thumb_path').eq('entity_type', d.entity_type).eq('entity_id', d.entity_id).eq('kind', d.kind)
      if (old?.length) {
        await admin.from('media').delete().in('id', old.map((o) => o.id))
        await deletePublicFiles(old.flatMap((o) => [o.storage_path, o.thumb_path ?? '']))
      }
    }
    const user = await getUser()
    const { data, error } = await admin
      .from('media')
      .insert({
        entity_type: d.entity_type,
        entity_id: d.entity_id,
        kind: d.kind,
        storage_path: image.storage_path,
        thumb_path: image.thumb_path,
        width: image.width,
        height: image.height,
        bytes: image.bytes,
        alt: d.alt ?? null,
        sort: existing,
        is_cover: d.kind === 'image' && existing === 0,
        status: await initialStatus(d.entity_type, d.entity_id),
        uploaded_by: user?.id ?? null,
      })
      .select(MEDIA_COLUMNS)
      .single()
    if (error || !data) throw new Error(error?.message ?? 'insert failed')
    if (d.entity_type === 'organisation' && (d.kind === 'logo' || d.kind === 'cover')) {
      await admin.from('organisations').update(d.kind === 'logo' ? { logo_path: image.thumb_path } : { cover_path: image.storage_path }).eq('id', d.entity_id)
    }
    await syncPortfolioCover(d.entity_type, d.entity_id)
    revalidateEntity(d.entity_type, d.entity_id)
    return ok(data as MediaItem)
  } catch (err) {
    if (err instanceof UploadError) return fail(err.message)
    log.error('media', 'processing failed', err)
    return fail('We could not process that image. Try a different photo (JPEG or PNG).')
  }
}

export async function processPrivateUploadAction(input: { incoming_path: string; area: string; id: string; content_type: string }): Promise<ActionResult<{ path: string }>> {
  const parsed = z
    .object({ incoming_path: z.string().max(300), area: z.enum(PRIVATE_AREAS), id: z.uuid(), content_type: z.string().max(120) })
    .safeParse(input)
  if (!parsed.success) return fail('Invalid upload.')
  const d = parsed.data
  const scope: UploadScope = { purpose: 'private', area: d.area, id: d.id }
  if (!(await canUpload(scope))) return fail('You cannot upload files here.')
  if (d.area === 'cv' && !CV_TYPES.includes(d.content_type)) return fail('Upload your CV as a PDF or Word (.docx) file.')
  if (!d.incoming_path.startsWith(`incoming/${scopePrefix(scope)}/`)) return fail('Invalid upload.')
  try {
    const path = await processIncomingDocument(d.incoming_path, d.content_type, scopePrefix(scope))
    return ok({ path })
  } catch (err) {
    if (err instanceof UploadError) return fail(err.message)
    log.error('media', 'document processing failed', err)
    return fail('We could not store that file. Please try again.')
  }
}

/** Portfolio projects store their cover photo path for fast listing. */
async function syncPortfolioCover(entityType: MediaEntity, entityId: string): Promise<void> {
  if (entityType !== 'portfolio') return
  const admin = getAdminSupabase()
  const { data } = await admin.from('media').select('storage_path').eq('entity_type', 'portfolio').eq('entity_id', entityId).eq('kind', 'image').order('is_cover', { ascending: false }).order('sort').limit(1).maybeSingle()
  await admin.from('portfolio_projects').update({ cover_path: data?.storage_path ?? null }).eq('id', entityId)
}

async function loadEditable(mediaId: string): Promise<MediaItem & { entity_type: MediaEntity; entity_id: string } | null> {
  const { data } = await getAdminSupabase().from('media').select(`${MEDIA_COLUMNS}, entity_type, entity_id`).eq('id', mediaId).maybeSingle()
  if (!data) return null
  const row = data as MediaItem & { entity_type: MediaEntity; entity_id: string }
  return (await canUpload({ purpose: 'media', entityType: row.entity_type, entityId: row.entity_id })) ? row : null
}

export async function deleteMediaAction(mediaId: string): Promise<ActionResult> {
  const row = await loadEditable(mediaId)
  if (!row) return fail('Not found.')
  const admin = getAdminSupabase()
  await admin.from('media').delete().eq('id', row.id)
  await deletePublicFiles([row.storage_path, row.thumb_path ?? ''])
  if (row.is_cover) {
    const { data: next } = await admin.from('media').select('id').eq('entity_type', row.entity_type).eq('entity_id', row.entity_id).eq('kind', 'image').order('sort').limit(1).maybeSingle()
    if (next) await admin.from('media').update({ is_cover: true }).eq('id', next.id)
  }
  await syncPortfolioCover(row.entity_type, row.entity_id)
  revalidateEntity(row.entity_type, row.entity_id)
  return ok(undefined)
}

export async function setCoverAction(mediaId: string): Promise<ActionResult> {
  const row = await loadEditable(mediaId)
  if (!row) return fail('Not found.')
  const admin = getAdminSupabase()
  await admin.from('media').update({ is_cover: false }).eq('entity_type', row.entity_type).eq('entity_id', row.entity_id)
  await admin.from('media').update({ is_cover: true }).eq('id', row.id)
  await syncPortfolioCover(row.entity_type, row.entity_id)
  revalidateEntity(row.entity_type, row.entity_id)
  return ok(undefined)
}

export async function reorderMediaAction(entityType: string, entityId: string, orderedIds: string[]): Promise<ActionResult> {
  const parsed = z.object({ t: entitySchema, id: z.uuid(), ids: z.array(z.uuid()).max(60) }).safeParse({ t: entityType, id: entityId, ids: orderedIds })
  if (!parsed.success) return fail('Invalid order.')
  if (!(await canUpload({ purpose: 'media', entityType: parsed.data.t, entityId: parsed.data.id }))) return fail('Not allowed.')
  const admin = getAdminSupabase()
  await Promise.all(parsed.data.ids.map((id, sort) => admin.from('media').update({ sort }).eq('id', id).eq('entity_type', parsed.data.t).eq('entity_id', parsed.data.id)))
  revalidateEntity(parsed.data.t, parsed.data.id)
  return ok(undefined)
}

export async function updateAltAction(mediaId: string, alt: string): Promise<ActionResult> {
  const row = await loadEditable(mediaId)
  if (!row) return fail('Not found.')
  await getAdminSupabase().from('media').update({ alt: alt.trim().slice(0, 200) || null }).eq('id', row.id)
  return ok(undefined)
}

/** Photos for a development progress update: stored as public images, shown once the update is approved (spec 25.2j). */
export async function processUpdatePhotoAction(input: { incoming_path: string; development_id: string }): Promise<ActionResult<{ path: string }>> {
  const parsed = z.object({ incoming_path: z.string().max(300), development_id: z.uuid() }).safeParse(input)
  if (!parsed.success) return fail('Invalid upload.')
  const d = parsed.data
  const scope: UploadScope = { purpose: 'media', entityType: 'development', entityId: d.development_id }
  if (!(await canUpload(scope))) return fail('You cannot upload files here.')
  if (!d.incoming_path.startsWith(`incoming/${scopePrefix(scope)}/`)) return fail('Invalid upload.')
  try {
    const image = await processIncomingImage(d.incoming_path, 'development', d.development_id)
    return ok({ path: image.storage_path })
  } catch (err) {
    if (err instanceof UploadError) return fail(err.message)
    log.error('media', 'update photo processing failed', err)
    return fail('We could not process that image. Try a different photo (JPEG or PNG).')
  }
}
