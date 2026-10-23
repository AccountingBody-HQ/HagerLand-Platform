'use server'

/** Admin area these actions belong to: owner only (no staff role has it, spec 26.15; blueprint 13.3). */
const AREA = '/roodber8/supply/agreements'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { adminActor, assertAdmin, assertOwner, audit } from '@/lib/admin/guard'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { percentToBps } from '@/lib/supply/money'
import { confirmPrivateUpload, createPrivateUpload } from '@/lib/supply/private-files'

type Msg = ActionResult<{ message: string }>
const blank = (v: unknown) => (v === null || (typeof v === 'string' && v.trim() === '') ? undefined : v)

async function orgName(orgId: string): Promise<string | null> {
  if (!z.uuid().safeParse(orgId).success) return null
  const { data } = await getAdminSupabase().from('supply_partners').select('org:organisations(name)').eq('org_id', orgId).maybeSingle()
  return data ? ((data.org as { name: string } | null)?.name ?? '') : null
}

/** A one-time link to upload the signed agreement (photo or PDF, 10 MB). */
export async function agreementUploadAction(orgId: string, contentType: string, size: number): Promise<ActionResult<{ path: string; signedUrl: string }>> {
  await assertAdmin(AREA)
  await assertOwner()
  if (!(await orgName(orgId))) return fail('Create the supply partner record first.')
  const upload = await createPrivateUpload('agreements', orgId, contentType, size)
  if (!upload.ok) return fail(upload.error)
  await audit('supply.agreement.upload_link', { type: 'organisation', id: orgId }, { path: upload.path })
  return ok({ path: upload.path, signedUrl: upload.signedUrl })
}

const agreementSchema = z
  .object({
    money_model: z.enum(['A', 'B', 'both'], { error: 'Choose the money model' }),
    commission: z.preprocess(blank, z.string().max(10).optional()),
    payment_terms: z.preprocess(blank, z.string().trim().max(1000).optional()),
    credit_days: z.preprocess((v) => (blank(v) === undefined ? undefined : Number(v)), z.number().int().min(0, 'Credit days cannot be negative').max(365).optional()),
    start_date: z.iso.date({ error: 'Enter the start date' }),
    end_date: z.preprocess(blank, z.iso.date().optional()),
    status: z.enum(['draft', 'active']),
    document_path: z.preprocess(blank, z.string().max(300).optional()),
    notes: z.preprocess(blank, z.string().trim().max(2000).optional()),
  })
  .refine((d) => !d.end_date || d.end_date >= d.start_date, { message: 'The end date cannot be before the start date.', path: ['end_date'] })
export type AgreementInput = z.input<typeof agreementSchema>

/** Records a signed agreement with a partner (typed in from the paper or PDF). */
export async function addAgreementAction(orgId: string, input: AgreementInput): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const name = await orgName(orgId)
  if (!name) return fail('Create the supply partner record first.')
  const parsed = agreementSchema.safeParse(input)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Check the agreement.')
  const d = parsed.data
  let bps: number | null = null
  if (d.money_model !== 'A') {
    bps = d.commission ? percentToBps(d.commission) : null
    if (bps === null) return fail('Enter the commission rate as a percentage, like 5 or 2.5.')
  }
  if (d.document_path) {
    const file = await confirmPrivateUpload('agreements', orgId, d.document_path)
    if (!file.ok) return fail(file.error)
  }
  const { data, error } = await getAdminSupabase()
    .from('supply_agreements')
    .insert({ org_id: orgId, money_model: d.money_model, commission_rate_bps: bps, payment_terms: d.payment_terms ?? null, credit_days: d.credit_days ?? null, start_date: d.start_date, end_date: d.end_date ?? null, status: d.status, document_path: d.document_path ?? null, notes: d.notes ?? null, created_by: (await adminActor()).slice(0, 120) })
    .select('id')
    .single()
  if (error?.code === '23505') return fail('This partner already has an active agreement. Save this one as a draft, or end the active one first.')
  if (error || !data) return fail('Could not save the agreement.')
  await audit('supply.agreement.create', { type: 'organisation', id: orgId, label: name }, { agreement: data.id, money_model: d.money_model, commission_rate_bps: bps, status: d.status })
  revalidatePath(`/roodber8/organisations/${orgId}`)
  return ok({ message: d.status === 'active' ? 'Agreement saved and active.' : 'Agreement saved as a draft.' })
}

const NEXT: Record<string, string[]> = { draft: ['active', 'terminated'], active: ['expired', 'terminated'] }

/** Activate a draft, or end an active agreement (expired, or terminated with a reason). Kept as history. */
export async function setAgreementStatusAction(orgId: string, agreementId: string, status: 'active' | 'expired' | 'terminated', reason?: string): Promise<Msg> {
  await assertAdmin(AREA)
  await assertOwner()
  const parsed = z.object({ agreementId: z.uuid(), status: z.enum(['active', 'expired', 'terminated']), reason: z.string().trim().max(500).optional() }).safeParse({ agreementId, status, reason })
  if (!parsed.success) return fail('Invalid request.')
  const db = getAdminSupabase()
  const { data: before } = await db.from('supply_agreements').select('status').eq('id', agreementId).eq('org_id', orgId).maybeSingle()
  if (!before) return fail('Agreement not found.')
  if (!(NEXT[before.status] ?? []).includes(status)) return fail(`A ${before.status} agreement cannot become ${status}.`)
  if (status === 'terminated' && !parsed.data.reason) return fail('Say why the agreement was terminated.')
  const { error } = await db.from('supply_agreements').update({ status, terminated_reason: status === 'terminated' ? parsed.data.reason : null }).eq('id', agreementId)
  if (error?.code === '23505') return fail('Another agreement is already active. End it first.')
  if (error) return fail('Could not change the agreement.')
  await audit('supply.agreement.status', { type: 'organisation', id: orgId, label: await orgName(orgId) }, { agreement: agreementId, from: before.status, to: status, reason: parsed.data.reason ?? null })
  revalidatePath(`/roodber8/organisations/${orgId}`)
  return ok({ message: status === 'active' ? 'Agreement is now active.' : status === 'expired' ? 'Agreement marked expired.' : 'Agreement terminated.' })
}
