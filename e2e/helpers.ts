import { createClient } from '@supabase/supabase-js'
import { expect, type Page } from '@playwright/test'
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

/** Every test that writes data must hit the local stack only. */
export function assertLocalStack(): void {
  if (!/^http:\/\/(localhost|127\.0\.0\.1):/.test(SUPABASE_URL)) {
    throw new Error('E2E tests must run against the local Supabase stack (npm run test:e2e). Refusing to continue.')
  }
}

export function db() {
  assertLocalStack()
  return createClient(SUPABASE_URL, process.env.SUPABASE_SECRET_KEY ?? '', { auth: { persistSession: false } })
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@test.hagerland.invalid`
}

/** Latest email to `to` in the local mail catcher (Mailpit). */
export async function latestMail(to: string): Promise<{ subject: string; html: string; text: string }> {
  for (let i = 0; i < 40; i++) {
    const list = (await (await fetch('http://localhost:8025/api/v1/messages')).json()) as { messages: { ID: string; Subject: string; To: { Address: string }[] }[] }
    const msg = list.messages.find((m) => m.To.some((t) => t.Address === to))
    if (msg) {
      const full = (await (await fetch(`http://localhost:8025/api/v1/message/${msg.ID}`)).json()) as { HTML: string; Text: string; Subject: string }
      return { subject: full.Subject, html: full.HTML, text: full.Text }
    }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`No email arrived for ${to}`)
}

export function firstLink(html: string): string {
  const m = /href="([^"]+)"/.exec(html)
  if (!m) throw new Error('No link in email')
  return m[1].replace(/&amp;/g, '&')
}

/** Signs up through the real form and confirms the email link. Leaves the browser signed in. */
export async function signUp(page: Page, opts: { type: 'owner' | 'agent' | 'developer' | 'professional' | 'supplier' | 'looking'; name?: string; email?: string }): Promise<string> {
  const email = opts.email ?? uniqueEmail(opts.type)
  // A fresh simulated visitor address per sign-up, so the 5-per-hour sign-up limit never blocks the suite.
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` })
  await page.goto(`/signup?type=${opts.type}`)
  await page.fill('#su-name', opts.name ?? 'Test Person')
  await page.fill('#su-email', email)
  await page.fill('#su-phone', '911234567')
  await page.fill('#su-password', 'correct-horse-battery')
  await page.check('#su-terms')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText('Check your email')).toBeVisible()
  await page.setExtraHTTPHeaders({})
  const mail = await latestMail(email)
  await page.goto(firstLink(mail.html))
  await page.waitForURL((u) => u.host === 'localhost:3100' && /\/(onboarding|account)/.test(u.pathname))
  return email
}

let photoDir: string | null = null
export async function testPhotos(n = 3): Promise<string[]> {
  if (!photoDir) photoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hl-photos-'))
  const colours = ['#1C7C4C', '#B8862E', '#152238', '#8A857C', '#2563EB']
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    const file = path.join(photoDir, `photo-${i}.jpg`)
    if (!fs.existsSync(file)) await sharp({ create: { width: 1600, height: 1200, channels: 3, background: colours[i % colours.length] } }).jpeg().toFile(file)
    out.push(file)
  }
  return out
}

/** Collects console and page errors, ignoring prefetch 404s. */
export function trackErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error' && !/status of 404|_rsc=/.test(m.text())) errors.push(m.text())
  })
  return errors
}

/** Real admin sign-in through /roodber8-login with a fresh one-time code from the local TOTP secret. */
export async function adminLogin(page: Page): Promise<void> {
  const { authenticator } = await import('otplib')
  await page.goto('/roodber8-login')
  await page.fill('#adm-user', process.env.ADMIN_USERNAME ?? '')
  await page.fill('#adm-pass', process.env.ADMIN_PASSWORD ?? '')
  await page.fill('#adm-code', authenticator.generate(process.env.ADMIN_TOTP_SECRET ?? ''))
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('**/roodber8')
}

/** Adds a valid admin session cookie directly (same HMAC as lib/admin-auth), for tests after the login test. */
export async function adminSession(page: Page): Promise<void> {
  const crypto = await import('node:crypto')
  const expires = `${Date.now() + 3600_000}`
  const hmac = crypto.createHmac('sha256', process.env.ADMIN_SESSION_SECRET ?? '').update(expires).digest('hex')
  await page.context().addCookies([{ name: 'hl_admin_session', value: `${expires}.${hmac}`, domain: 'localhost', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' }])
}

/** Inserts a published property directly in the local database (for read-only page tests). Returns id and slug. */
export async function seedPublishedProperty(opts: { purpose?: 'sale' | 'rent'; locationPath?: string; title?: string; price?: number } = {}): Promise<{ id: string; slug: string; shortId: string }> {
  const d = db()
  const { data: loc } = await d.from('locations').select('id').eq('path', opts.locationPath ?? 'addis-ababa/bole').single()
  const title = opts.title ?? `E2E apartment ${Date.now()}`
  const { data, error } = await d
    .from('properties')
    .insert({ title, slug: `e2e-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`, purpose: opts.purpose ?? 'sale', property_type: 'apartment', location_id: loc!.id, bedrooms: 2, bathrooms: 1, price_etb: opts.price ?? 4_500_000, description: 'A bright two-bedroom apartment used by automated tests.', lister_type: 'hagerland', status: 'published' })
    .select('id, short_id')
    .single()
  if (error || !data) throw new Error(`seed failed: ${error?.message}`)
  const slug = `e2e-apartment-${data.short_id}`
  await d.from('properties').update({ slug }).eq('id', data.id)
  return { id: data.id, slug, shortId: data.short_id }
}

async function seedPhoto(entityType: string, entityId: string, hue: number): Promise<void> {
  const d = db()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1067"><defs><linearGradient id="g" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue},45%,72%)"/><stop offset="1" stop-color="hsl(${hue},35%,40%)"/></linearGradient></defs><rect width="1600" height="1067" fill="url(#g)"/><rect x="420" y="420" width="760" height="520" fill="hsl(${hue + 30},25%,85%)"/><polygon points="360,430 800,170 1240,430" fill="hsl(${hue + 180},35%,35%)"/></svg>`
  const full = await sharp(Buffer.from(svg)).webp({ quality: 80 }).toBuffer()
  const thumb = await sharp(full).resize(640).webp({ quality: 72 }).toBuffer()
  const base = `${entityType}/${entityId}/${crypto.randomUUID()}`
  await d.storage.from('public-media').upload(`${base}.webp`, full, { contentType: 'image/webp', upsert: true })
  await d.storage.from('public-media').upload(`${base}-640.webp`, thumb, { contentType: 'image/webp', upsert: true })
  await d.from('media').insert({ entity_type: entityType, entity_id: entityId, kind: 'image', storage_path: `${base}.webp`, thumb_path: `${base}-640.webp`, width: 1600, height: 1067, is_cover: true, status: 'approved', alt: 'Photo' })
}

export interface Showcase {
  propertySlugs: string[]
  orgSlug: string
  productSlug: string
  developmentSlug: string
  cleanup: () => Promise<void>
}

/** Realistic published content with photos (local stack only) for speed and accessibility checks. */
export async function seedShowcase(): Promise<Showcase> {
  const d = db()
  const stamp = Date.now()
  const props = await Promise.all(
    [0, 1, 2, 3, 4, 5].map(async (i) => {
      const p = await seedPublishedProperty({ purpose: i % 2 ? 'rent' : 'sale', title: `E2E apartment showcase ${stamp}-${i}`, price: i % 2 ? 45_000 : 6_500_000 + i * 250_000 })
      await seedPhoto('property', p.id, 20 + i * 40)
      return p
    }),
  )
  const { data: org } = await d.from('organisations').insert({ kind: 'contractor', name: `E2E Abebe Construction ${stamp}`, slug: `e2e-abebe-${stamp}`, description: 'Grade 3 building contractor working on residential and commercial projects across Addis Ababa.', source: 'admin', status: 'published', verification_level: 'verified' }).select('id, slug').single()
  await seedPhoto('organisation', org!.id, 200)
  const { data: services } = await d.from('service_categories').select('id').not('parent_id', 'is', null).limit(2)
  await d.from('organisation_services').insert((services ?? []).map((s) => ({ org_id: org!.id, service_id: s.id })))
  const [{ data: cat }, { data: supply }] = await Promise.all([
    d.from('product_categories').select('id').not('parent_id', 'is', null).limit(1).single(),
    d.from('organisations').select('id').eq('kind', 'hagerland').ilike('name', '%supply%').single(),
  ])
  const { data: product } = await d.from('products').insert({ name: `E2E Portland cement 50 kg ${stamp}`, slug: `e2e-cement-${stamp}`, category_id: cat!.id, seller_org_id: supply!.id, unit: 'bag', price_type: 'fixed', price_etb_cents: 145_000, stock_status: 'in_stock', summary: 'OPC 42.5R cement for structural concrete.', status: 'published' }).select('id, slug').single()
  await seedPhoto('product', product!.id, 30)
  const { data: loc } = await d.from('locations').select('id').eq('path', 'addis-ababa/bole').single()
  const { data: dev } = await d.from('developments').insert({ name: `E2E Bole Heights ${stamp}`, slug: `e2e-bole-heights-${stamp}`, location_id: loc!.id, description: 'A twelve-storey residential building with two and three bedroom apartments.', status: 'published' }).select('id, slug').single()
  await seedPhoto('development', dev!.id, 120)
  return {
    propertySlugs: props.map((p) => p.slug),
    orgSlug: org!.slug,
    productSlug: product!.slug,
    developmentSlug: dev!.slug,
    cleanup: async () => {
      const ids = [...props.map((p) => p.id), org!.id, product!.id, dev!.id]
      await d.from('media').delete().in('entity_id', ids)
      await d.from('properties').delete().in('id', props.map((p) => p.id))
      await d.from('products').delete().eq('id', product!.id)
      await d.from('developments').delete().eq('id', dev!.id)
      await d.from('organisations').delete().eq('id', org!.id)
    },
  }
}

/**
 * Gives this page its own simulated visitor address for requests to the site only (not to storage,
 * which rejects unknown cross-site headers), so per-visitor rate limits never leak between test runs.
 */
export async function asFreshVisitor(page: Page): Promise<void> {
  const ip = `10.6.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`
  await page.route('http://localhost:3100/**', (route) => route.continue({ headers: { ...route.request().headers(), 'x-forwarded-for': ip } }))
}
