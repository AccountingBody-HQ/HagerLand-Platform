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

/** Sets a vertical's status directly (cleanup only: the public cache refreshes within 5 minutes). */
export async function setVerticalStatus(key: string, status: 'live' | 'coming_soon' | 'hidden'): Promise<void> {
  const { error } = await db().from('verticals').update({ status }).eq('key', key)
  if (error) throw error
}

/** Switches a vertical through the real admin screen, which refreshes the site at once and writes the audit log. */
export async function adminSwitchVertical(page: Page, name: string, label: 'Live' | 'Coming soon' | 'Hidden'): Promise<void> {
  await adminSession(page)
  await page.goto('/roodber8/verticals')
  await page.getByRole('group', { name: `Status of ${name}` }).getByRole('button', { name: label }).click()
  await expect(page.getByText(new RegExp(`${name} is now ${label}`))).toBeVisible()
}

/** A confirmed user created directly (local stack only), with an optional published business they own. */
export async function createUser(opts: { name?: string } = {}): Promise<{ id: string; email: string; password: string }> {
  const d = db()
  const email = uniqueEmail('user')
  const password = 'correct-horse-battery'
  const { data, error } = await d.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: opts.name ?? 'Test User' } })
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`)
  return { id: data.user.id, email, password }
}

export async function createProvider(opts: { name: string; serviceSlug: string; locationPath: string; verified?: boolean }): Promise<{ orgId: string; orgSlug: string; user: { id: string; email: string; password: string } }> {
  const d = db()
  const user = await createUser({ name: 'Provider Owner' })
  const [{ data: loc }, { data: svc }] = await Promise.all([
    d.from('locations').select('id').eq('path', opts.locationPath).single(),
    d.from('service_categories').select('id').eq('slug', opts.serviceSlug).single(),
  ])
  const slug = `e2e-${opts.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`
  const { data: org, error } = await d
    .from('organisations')
    .insert({ kind: 'sole_trader', name: opts.name, slug, location_id: loc!.id, phone: '+251911000111', source: 'admin', status: 'published', verification_level: opts.verified ? 'verified' : 'listed' })
    .select('id, slug')
    .single()
  if (error || !org) throw new Error(`provider org failed: ${error?.message}`)
  await d.from('organisation_members').insert({ org_id: org.id, user_id: user.id, role: 'owner' })
  await d.from('organisation_services').insert({ org_id: org.id, service_id: svc!.id })
  return { orgId: org.id, orgSlug: org.slug, user }
}

/** Signs in with email and password through the real form. */
export async function signIn(page: Page, email: string, password: string): Promise<void> {
  // Each sign-in looks like a new visitor, so the per-visitor sign-in limit never blocks the suite.
  await asFreshVisitor(page)
  await page.goto('/login')
  await page.fill('#login-email', email)
  await page.fill('#login-password', password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.waitForURL((u) => u.pathname.startsWith('/account') || u.pathname.startsWith('/onboarding'))
}

/** All emails sent to an address, newest first (local mail catcher). */
export async function allMail(to: string): Promise<{ subject: string; html: string; text: string }[]> {
  const list = (await (await fetch(`http://localhost:8025/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`)).json()) as { messages: { ID: string }[] }
  return Promise.all(
    list.messages.map(async (m) => {
      const full = (await (await fetch(`http://localhost:8025/api/v1/message/${m.ID}`)).json()) as { HTML: string; Text: string; Subject: string }
      return { subject: full.Subject, html: full.HTML, text: full.Text }
    }),
  )
}

/** Waits for an email to `to` whose subject contains `subjectPart`. */
export async function mailWithSubject(to: string, subjectPart: string): Promise<{ subject: string; html: string; text: string }> {
  for (let i = 0; i < 40; i++) {
    const found = (await allMail(to)).find((m) => m.subject.includes(subjectPart))
    if (found) return found
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error(`No email to ${to} with subject containing "${subjectPart}"`)
}

/** The first link in an email that matches a pattern. */
export function linkMatching(html: string, pattern: RegExp): string {
  const links = Array.from(html.matchAll(/href="([^"]+)"/g)).map((m) => m[1].replace(/&amp;/g, '&'))
  const found = links.find((l) => pattern.test(l))
  if (!found) throw new Error(`No link matching ${pattern}`)
  return found
}

/** A different Ethiopian mobile number each time, so per-phone limits never block the suite. */
export function randomPhone(): string {
  return `09${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`
}

/**
 * Sets a pillar's (or sub-service's) modes directly in the local database. Switching Direct or Aggregate on needs a
 * stage-gate row first (the database refuses otherwise), so one is written for the test.
 */
export async function setPillarModes(key: string, modes: { direct?: boolean; aggregate?: boolean; interest?: boolean }, opts: { service?: boolean } = {}): Promise<void> {
  const d = db()
  const table = opts.service ? 'pillar_services' : 'pillars'
  const { data: row } = await d.from(table).select('*').eq('key', key).single()
  if (!row) throw new Error(`No ${table} row ${key}`)
  const pillar = opts.service ? (row as { pillar_key: string }).pillar_key : key
  for (const mode of ['direct', 'aggregate'] as const) {
    if (modes[mode] && !(row as Record<string, boolean>)[`${mode}_enabled`]) {
      const { error } = await d.from('pillar_gate_checks').insert({ pillar_key: pillar, service_key: opts.service ? key : null, mode, capability_confirmed: true, owner_name: 'E2E test', regulatory_confirmed: true, regulatory_note: 'E2E test', regulatory_date: '2026-10-15', terms_pricing_set: true, providers_required: 0, providers_active: 0, actor: 'e2e' })
      if (error) throw error
    }
  }
  const patch = Object.fromEntries(Object.entries(modes).map(([k, v]) => [`${k}_enabled`, v]))
  const { error } = await d.from(table).update(patch).eq('key', key)
  if (error) throw error
}
