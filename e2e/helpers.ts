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
  await page.goto(`/signup?type=${opts.type}`)
  await page.fill('#su-name', opts.name ?? 'Test Person')
  await page.fill('#su-email', email)
  await page.fill('#su-phone', '911234567')
  await page.fill('#su-password', 'correct-horse-battery')
  await page.check('#su-terms')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText('Check your email')).toBeVisible()
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
