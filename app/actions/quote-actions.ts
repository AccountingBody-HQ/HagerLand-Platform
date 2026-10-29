'use server'

import { headers } from 'next/headers'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getUser } from '@/lib/auth'
import { fail, invalid, ok, type ActionResult } from '@/lib/action-result'
import { getClientIp, hashIp } from '@/lib/security'
import { rateLimit } from '@/lib/rate-limit'
import { isHoneypotFilled, verifyTurnstileToken } from '@/lib/turnstile'
import { nameSchema, optionalEmailSchema, optionalText, optionalUuid, phoneSchema } from '@/lib/validation/common'
import { UNITS, unitLabel } from '@/lib/units'
import { hagerlandInbox } from '@/lib/enquiries'
import { sendEmail } from '@/lib/email/send'
import { quoteInternalEmail, quoteReceivedEmail } from '@/lib/email/templates'
import { canonicalUrl } from '@/lib/site'
import { formatPhone } from '@/lib/format'
import { log } from '@/lib/log'

const itemSchema = z
  .object({
    productId: z.uuid().optional(),
    name: z.string().trim().min(1).max(300),
    quantity: z.number().positive().max(1_000_000),
    unit: z.enum(UNITS.map((u) => u.value) as [string, ...string[]]),
    notes: z.string().max(500).optional(),
  })
  .strip()

const schema = z.object({
  source: z.enum(['basket', 'materials_list', 'product_page']),
  name: nameSchema,
  phone: phoneSchema,
  email: optionalEmailSchema,
  company_name: optionalText(160, 'Company'),
  delivery_location_id: optionalUuid,
  delivery_address: optionalText(300, 'Delivery address'),
  needed_by: z.preprocess((v) => (v === '' ? undefined : v), z.iso.date().optional()),
  notes: optionalText(4000, 'Notes'),
  items: z.array(itemSchema).max(100),
  files: z.array(z.string().max(300)).max(5),
  upload_id: optionalUuid,
  utm: z.string().max(600).optional(),
})

export type QuoteState = ActionResult<{ reference: string }> | null

/** Quote request from the quote list or a materials list (spec 10.5, 10.6). */
export async function submitQuoteAction(_prev: QuoteState, formData: FormData): Promise<QuoteState> {
  if (isHoneypotFilled(formData)) return ok({ reference: 'HLQ-0' })
  let items: unknown = []
  try {
    items = JSON.parse(String(formData.get('items') ?? '[]'))
  } catch {
    return fail('Your quote list could not be read. Please try again.')
  }
  const parsed = schema.safeParse({ ...Object.fromEntries(formData), items, files: formData.getAll('files') })
  if (!parsed.success) return invalid(parsed.error)
  const d = parsed.data
  if (d.items.length === 0 && d.files.length === 0 && !d.notes) return fail('Add at least one item, upload a list, or type what you need.')
  if (d.needed_by && d.needed_by < new Date().toISOString().slice(0, 10)) return fail('The "needed by" date is in the past.', { needed_by: 'Choose a future date' })
  if (d.files.some((f) => !d.upload_id || !f.startsWith(`docs/materials/${d.upload_id}/`))) return fail('Please upload your files again.')

  const ip = getClientIp(await headers())
  const ipHash = hashIp(ip)
  if (!(await rateLimit(`quote:${ipHash}`, 10, 3600)).allowed) return fail('You have sent several requests recently. Please wait a little or call us.')
  if (!(await verifyTurnstileToken(formData.get('cf-turnstile-response') as string | null, ip))) return fail('Please complete the security check and try again.')

  const db = getAdminSupabase()
  const productIds = Array.from(new Set(d.items.map((i) => i.productId).filter((x): x is string => Boolean(x))))
  const { data: live } = productIds.length ? await db.from('products').select('id').in('id', productIds).eq('status', 'published') : { data: [] }
  const liveIds = new Set((live ?? []).map((p) => p.id))
  const user = await getUser()
  let utm: Record<string, string> | null = null
  try {
    utm = d.utm ? (JSON.parse(d.utm) as Record<string, string>) : null
  } catch {
    utm = null
  }

  const { data: q, error } = await db
    .from('quote_requests')
    .insert({
      requester_user_id: user?.id ?? null,
      name: d.name,
      phone: d.phone,
      email: d.email ?? null,
      company_name: d.company_name ?? null,
      delivery_location_id: d.delivery_location_id ?? null,
      delivery_address: d.delivery_address ?? null,
      needed_by: d.needed_by ?? null,
      notes: d.notes ?? null,
      materials_file_path: d.files[0] ?? null,
      materials_file_paths: d.files,
      source: d.source,
      utm,
      ip_hash: ipHash,
    })
    .select('id, reference')
    .single()
  if (error || !q) {
    log.error('quote', 'insert failed', error)
    return fail('We could not send your request. Please try again.')
  }
  if (d.items.length) {
    const { error: itemsError } = await db.from('quote_request_items').insert(
      d.items.map((i) => ({
        quote_request_id: q.id,
        product_id: i.productId && liveIds.has(i.productId) ? i.productId : null,
        free_text_item: i.productId && liveIds.has(i.productId) ? null : i.name,
        quantity: i.quantity,
        unit: i.unit,
        notes: i.notes ?? null,
      })),
    )
    if (itemsError) log.error('quote', 'items insert failed', itemsError)
  }

  if (d.email) {
    await sendEmail({ to: d.email, from: 'supply', ...quoteReceivedEmail({ name: d.name.split(' ')[0], reference: q.reference, itemCount: d.items.length, hasFiles: d.files.length > 0 }) })
  }
  const inbox = await hagerlandInbox('supply')
  if (inbox) {
    await sendEmail({
      to: inbox,
      replyTo: d.email,
      ...quoteInternalEmail({
        reference: q.reference,
        name: d.name,
        phone: formatPhone(d.phone),
        email: d.email ?? null,
        source: d.source === 'materials_list' ? 'Materials list' : 'Quote list',
        lines: [...d.items.map((i) => `${i.quantity} ${unitLabel(i.unit, i.quantity)} × ${i.name}${i.notes ? ` (${i.notes})` : ''}`), ...d.files.map((f, n) => `Attached file ${n + 1}`)],
        notes: d.notes ?? null,
        adminUrl: canonicalUrl(`/roodber8/quotes/${q.id}`),
      }),
    })
  }
  return ok({ reference: q.reference })
}
