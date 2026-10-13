import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getUser } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { getClientIp, hashIp } from '@/lib/security'
import { formatPhone, telegramLink, whatsappLink } from '@/lib/format'
import { canonicalUrl } from '@/lib/site'
import { brand } from '@/lib/brand'
import { log } from '@/lib/log'

const bodySchema = z.object({
  target_type: z.enum(['property', 'organisation', 'development', 'product']),
  target_id: z.uuid(),
  channel: z.enum(['phone', 'whatsapp', 'telegram', 'email']),
})

interface Contacts {
  phone: string | null
  whatsapp: string | null
  telegram: string | null
  email: string | null
  url: string
}

async function contactsFor(type: z.infer<typeof bodySchema>['target_type'], id: string): Promise<Contacts | null> {
  const db = getAdminSupabase()
  const hagerland = (url: string): Contacts => ({ phone: brand.contact.phone || null, whatsapp: brand.contact.whatsapp || null, telegram: brand.contact.telegram || null, email: brand.contact.email || null, url })
  if (type === 'property') {
    const { data } = await db.from('properties').select('slug, status, expires_at, is_hagerland, contact_phone, contact_whatsapp, contact_telegram, contact_email').eq('id', id).maybeSingle()
    if (!data || data.status !== 'published' || !data.expires_at || new Date(data.expires_at) < new Date()) return null
    const url = canonicalUrl(`/property/${data.slug}`)
    if (data.is_hagerland && !data.contact_phone) return hagerland(url)
    return { phone: data.contact_phone, whatsapp: data.contact_whatsapp, telegram: data.contact_telegram, email: data.contact_email, url }
  }
  if (type === 'organisation') {
    const { data } = await db.from('organisations').select('slug, status, is_hagerland, phone, whatsapp, telegram, email').eq('id', id).maybeSingle()
    if (!data || data.status !== 'published') return null
    const url = canonicalUrl(`/company/${data.slug}`)
    if (data.is_hagerland && !data.phone) return hagerland(url)
    return { phone: data.phone, whatsapp: data.whatsapp, telegram: data.telegram, email: data.email, url }
  }
  if (type === 'development') {
    const { data } = await db.from('developments').select('slug, status, is_hagerland, developer_org_id').eq('id', id).maybeSingle()
    if (!data || data.status !== 'published') return null
    const url = canonicalUrl(data.is_hagerland ? `/our-developments/${data.slug}` : `/developments/${data.slug}`)
    if (data.is_hagerland || !data.developer_org_id) return hagerland(url)
    const org = (await db.from('organisations').select('phone, whatsapp, telegram, email, status').eq('id', data.developer_org_id).maybeSingle()).data
    if (!org || org.status !== 'published') return null
    return { phone: org.phone, whatsapp: org.whatsapp, telegram: org.telegram, email: org.email, url }
  }
  const { data } = await db.from('products').select('slug, status, seller_org_id').eq('id', id).maybeSingle()
  if (!data || data.status !== 'published') return null
  const org = (await db.from('organisations').select('phone, whatsapp, telegram, email, is_hagerland').eq('id', data.seller_org_id).maybeSingle()).data
  const url = canonicalUrl(`/supplies/product/${data.slug}`)
  if (!org || org.is_hagerland) return hagerland(url)
  return { phone: org.phone, whatsapp: org.whatsapp, telegram: org.telegram, email: org.email, url }
}

/** Reveals one contact detail for a live listing or profile (spec 12). Rate-limited and logged. */
export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { target_type, target_id, channel } = parsed.data
  const ipHash = hashIp(getClientIp(request.headers))
  const limit = await rateLimit(`reveal:${ipHash}`, 30, 3600)
  if (!limit.allowed) return NextResponse.json({ error: 'You have viewed a lot of contact details recently. Please try again later or send an enquiry.' }, { status: 429 })

  try {
    const contacts = await contactsFor(target_type, target_id)
    if (!contacts) return NextResponse.json({ error: 'This listing is no longer available.' }, { status: 404 })
    const raw = contacts[channel]
    if (!raw) return NextResponse.json({ error: 'Not available' }, { status: 404 })

    const user = await getUser()
    await getAdminSupabase().from('contact_reveals').insert({ target_type, target_id, channel, viewer_user_id: user?.id ?? null, ip_hash: ipHash })

    const message = `Hello, I found your listing on HagerLand: ${contacts.url}`
    const payload =
      channel === 'phone'
        ? { display: formatPhone(raw), href: `tel:${raw}` }
        : channel === 'whatsapp'
          ? { display: formatPhone(raw), href: whatsappLink(raw, message) }
          : channel === 'telegram'
            ? { display: `@${raw.replace(/^@/, '')}`, href: telegramLink(raw) }
            : { display: raw, href: `mailto:${raw}` }
    if (!payload.href) return NextResponse.json({ error: 'Not available' }, { status: 404 })
    return NextResponse.json(payload, { headers: { 'Cache-Control': 'no-store' } })
  } catch (err) {
    log.error('contact-reveal', 'failed', err)
    return NextResponse.json({ error: 'Please try again.' }, { status: 500 })
  }
}
