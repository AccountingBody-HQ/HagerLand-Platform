import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { expect, test, type Page } from '@playwright/test'
import { adminSession, assertLocalStack, createProvider, createUser, db, signIn } from '../helpers'

/**
 * Fix F-2 "Fail loudly, know it ran" (J1–J9), local copy and local mail catcher only. Some journeys take a database
 * permission away for a moment (revoke, then grant back in `finally`), so the file runs in order on one worker.
 */
test.describe.configure({ mode: 'serial' })
test.beforeAll(() => assertLocalStack())

const HOUR = 3_600_000
const DIGEST_TO = process.env.ADMIN_DIGEST_EMAIL ?? ''
const FAILED_PAGE = "This page didn't load properly"

function psql(sql: string): string {
  return execFileSync('psql', ['-h', 'localhost', '-p', '54322', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atc', sql], { env: { ...process.env, PGPASSWORD: 'postgres' } }).toString().trim()
}

/** Takes a permission away from the server's database role for the length of `fn` only. */
async function without(grant: string, table: string, fn: () => Promise<void>): Promise<void> {
  psql(`revoke ${grant} on public.${table} from service_role`)
  try {
    await fn()
  } finally {
    psql(`grant ${grant} on public.${table} to service_role`)
  }
}

const nav = (page: Page) => page.getByRole('navigation', { name: 'Admin' })
const head = { count: 'exact' as const, head: true }
const count = async (q: PromiseLike<{ count: number | null; error: unknown }>) => {
  const r = await q
  expect(r.error).toBeNull()
  return r.count ?? 0
}

/** The number shown next to a menu item (0 when there is no badge), or "!" when it could not be counted. */
async function badge(page: Page, label: string): Promise<number | '!'> {
  const link = nav(page).getByRole('link', { name: new RegExp(`^${label}\\b`) }).first()
  if ((await link.getByTestId('badge-failed').count()) > 0) return '!'
  const m = /(\d[\d,]*)$/.exec((await link.innerText()).trim())
  return m ? Number(m[1].replace(/,/g, '')) : 0
}

/** The figure on a dashboard tile. */
async function kpi(page: Page, label: string): Promise<number> {
  const tile = page.locator('main a, main div.rounded-lg').filter({ has: page.locator('p', { hasText: new RegExp(`^${label}$`) }) }).first()
  return Number((await tile.locator('p').nth(1).innerText()).replace(/,/g, ''))
}

/** Same signing as lib/admin-auth.ts: a staff session for an active staff row. */
async function staffSession(page: Page, role: 'operations' | 'agent' | 'content'): Promise<() => Promise<void>> {
  const email = `f2-${role}-${Date.now()}@test.hagerland.invalid`
  const { data: u } = await db().auth.admin.createUser({ email, password: 'staff-correct-horse', email_confirm: true, app_metadata: { staff: true } })
  const { data, error } = await db().from('staff_users').insert({ email, name: `E2E F2 ${role}`, role, status: 'active', user_id: u.user!.id, totp_secret_enc: 'e2e-not-used', totp_enrolled_at: new Date().toISOString() }).select('id').single()
  if (error || !data) throw new Error(`staff seed failed: ${error?.message}`)
  const payload = `${Date.now() + HOUR}~${data.id}~${role}`
  const hmac = crypto.createHmac('sha256', process.env.ADMIN_SESSION_SECRET ?? '').update(payload).digest('hex')
  await page.context().clearCookies()
  await page.context().addCookies([{ name: 'hl_admin_session', value: `${payload}.${hmac}`, domain: 'localhost', path: '/', httpOnly: true, secure: true, sameSite: 'Lax' }])
  return async () => {
    await db().from('staff_users').delete().eq('id', data.id)
    await db().auth.admin.deleteUser(u.user!.id)
  }
}

const digestIds = async () => ((await (await fetch(`http://localhost:8025/api/v1/search?query=${encodeURIComponent(`to:"${DIGEST_TO}" subject:"daily digest"`)}`)).json()) as { messages: { ID: string }[] }).messages.map((m) => m.ID)

/** Runs the daily job and returns the new digest's plain text (and the job's answer). */
async function runAndReadDigest(page: Page, headers: Record<string, string> = {}): Promise<{ text: string; body: Record<string, unknown> }> {
  const seen = new Set(await digestIds())
  const res = await page.request.get('/api/cron/daily', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}`, ...headers }, timeout: 280_000 })
  expect(res.status()).toBe(200)
  const body = (await res.json()) as Record<string, unknown>
  for (let i = 0; i < 40; i++) {
    const fresh = (await digestIds()).find((id) => !seen.has(id))
    if (fresh) return { text: ((await (await fetch(`http://localhost:8025/api/v1/message/${fresh}`)).json()) as { Text: string }).Text, body }
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('no digest arrived')
}

test('J1: with a healthy database the dashboard, menu counts, review tabs and list pages show the database figures', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  const d = db()
  const now = Date.now()
  await adminSession(page)
  await page.goto('/roodber8')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  expect(await kpi(page, 'Claims')).toBe(await count(d.from('claims').select('id', head).eq('status', 'pending')))
  expect(await kpi(page, 'Unanswered over 48 h')).toBe(await count(d.from('enquiries').select('id', head).is('first_viewed_at', null).lt('created_at', new Date(now - 48 * HOUR).toISOString()).not('target_type', 'in', '("general","hagerland_development")')))
  expect(await kpi(page, 'Open quotes')).toBe(await count(d.from('quote_requests').select('id', head).in('status', ['submitted', 'in_review'])))
  // Menu counts: the old ones and the new ones (Enquiries, Call-back requests, Partner applications, Users).
  expect(await badge(page, 'Quotes')).toBe(await count(d.from('quote_requests').select('id', head).eq('status', 'submitted')))
  expect(await badge(page, 'Trade accounts')).toBe(await count(d.from('trade_accounts').select('id', head).eq('status', 'pending')))
  expect(await badge(page, 'Enquiries')).toBe(await count(d.from('enquiries').select('id', head).is('first_viewed_at', null).lt('created_at', new Date(now - 48 * HOUR).toISOString()).not('target_type', 'in', '("general","hagerland_development")')))
  expect(await badge(page, 'Call-back requests')).toBe(await count(d.from('callback_requests').select('id', head).eq('status', 'open')))
  expect(await badge(page, 'Partner applications')).toBe(await count(d.from('partner_applications').select('id', head).eq('status', 'new')))
  expect(await badge(page, 'Users')).toBe(await count(d.from('profiles').select('id', head).not('deletion_requested_at', 'is', null)))
  await expect(nav(page).getByTestId('badge-failed')).toHaveCount(0)
  // Review queue tab and list pages.
  await page.goto('/roodber8/review?tab=claims')
  await expect(page.getByText(FAILED_PAGE)).toHaveCount(0)
  await page.goto('/roodber8/properties')
  await expect(page.getByText(`${(await count(d.from('properties').select('id', head))).toLocaleString('en')} listings`).or(page.getByText(`${await count(d.from('properties').select('id', head))} listings`)).first()).toBeVisible()
  await page.goto('/roodber8/organisations')
  await expect(page.getByText(`${await count(d.from('organisations').select('id', head))} businesses`).first()).toBeVisible()
  for (const path of ['/roodber8/quotes', '/roodber8/trade-accounts', '/roodber8/users', '/roodber8/partners', '/roodber8/enquiries', '/roodber8/audit']) {
    await page.goto(path)
    await expect(page.getByText(FAILED_PAGE), path).toHaveCount(0)
  }
})

test('J2: a table that cannot be read shows the error (never 0), "!" in the menu, and the page still renders', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  await adminSession(page)
  // The review queue reads claims: the dashboard and the review queue show the error, the menu shows "!".
  await without('select', 'claims', async () => {
    await page.goto('/roodber8')
    await expect(page.getByText(FAILED_PAGE)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toHaveCount(0)
    await expect(nav(page)).toBeVisible()
    expect(await badge(page, 'Review queue')).toBe('!')
    await expect(nav(page).getByRole('link', { name: /Review queue/ })).toContainText('Could not count')
    await page.goto('/roodber8/review?tab=claims')
    await expect(page.getByText(FAILED_PAGE)).toBeVisible()
    await expect(nav(page)).toBeVisible()
  })
  // A list page: Trade accounts.
  await without('select', 'trade_accounts', async () => {
    await page.goto('/roodber8/trade-accounts')
    await expect(page.getByText(FAILED_PAGE)).toBeVisible()
    await expect(page.getByText('HagerLand admin')).toBeVisible()
    expect(await badge(page, 'Trade accounts')).toBe('!')
    // Everything else still works: the dashboard renders with its figures.
    await page.goto('/roodber8')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(nav(page).getByTestId('badge-failed')).toHaveCount(1)
  })
  await page.goto('/roodber8')
  await expect(nav(page).getByTestId('badge-failed')).toHaveCount(0)
})

test('J3 + J6: the digest arrives with the run line; the run is recorded and shown; after 26 hours a warning shows', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(300_000)
  const { text, body } = await runAndReadDigest(page)
  expect(body.digestSent).toBe(true)
  expect(body.failedSteps).toEqual([])
  expect(text).toMatch(new RegExp(`Daily job ran at \\d\\d:\\d\\d UTC \\(\\d\\d:\\d\\d London time\\): ${body.stepsOk} steps OK, 0 failed\\.`))
  expect(text).not.toContain('Steps that failed')
  expect(text).not.toMatch(/^Could not read: /m)
  // "Nothing needs your attention today." exactly when there are no other lines (checked on a fresh local copy in the report).
  const lines = text.split('Open admin')[0].split('\n').filter((l) => /^[^:]+: \S/.test(l) && !l.startsWith('Daily job ran'))
  if (lines.length === 0) expect(text).toContain('Nothing needs your attention today.')
  else expect(text).not.toContain('Nothing needs your attention today.')

  // J6: the run is recorded and shown on the dashboard.
  const { data: rec } = await db().from('audit_log').select('id, created_at, diff').eq('action', 'cron.daily').order('created_at', { ascending: false }).limit(1).single()
  expect(rec?.diff).toMatchObject({ steps_ok: body.stepsOk, steps_failed: 0, failed_steps: [], digest_sent: true })
  await adminSession(page)
  await page.goto('/roodber8')
  await expect(page.getByTestId('last-daily-run')).toContainText(`Last daily run:`)
  await expect(page.getByTestId('last-daily-run')).toContainText(`${body.stepsOk} steps OK, 0 failed, digest sent.`)
  await expect(page.getByText('The daily job has not run in the last 26 hours')).toHaveCount(0)
  // Backdated beyond 26 hours (local copy only): the warning shows.
  const { data: recent } = await db().from('audit_log').select('id, created_at').eq('action', 'cron.daily').gte('created_at', new Date(Date.now() - 27 * HOUR).toISOString())
  for (const r of recent ?? []) await db().from('audit_log').update({ created_at: new Date(new Date(r.created_at).getTime() - 27 * HOUR).toISOString() }).eq('id', r.id)
  await page.goto('/roodber8')
  await expect(page.getByText('The daily job has not run in the last 26 hours — check Vercel (RUNBOOK §11).')).toBeVisible()
})

test('J4: one failing step and one unreadable count are named in the digest', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(300_000)
  let result = { text: '', body: {} as Record<string, unknown> }
  await without('delete', 'contact_reveals', () =>
    without('select', 'partner_applications', async () => {
      result = await runAndReadDigest(page)
    }),
  )
  const { text, body } = result
  expect(body.failedSteps).toEqual(['reveals purge'])
  expect(text).toMatch(new RegExp(`${body.stepsOk} steps OK, 1 failed\\.`))
  expect(text).toContain('Steps that failed: reveals purge.')
  expect(text).toContain('Could not read: Partner applications to review')
  expect(text).not.toMatch(/Partner applications to review: \d/)
})

test('J5: when the summary cannot be built, the minimal fallback digest still arrives', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(300_000)
  const { text, body } = await runAndReadDigest(page, { 'x-test-fail-digest': '1' })
  expect(body.digestSent).toBe(true)
  expect(text).toContain('Daily job ran but the summary could not be built: an unexpected error (TypeError).')
  expect(text).toMatch(/Daily job ran at \d\d:\d\d UTC/)
  expect(text).not.toContain('Claims to decide')
})

test('J7 + J8: account deletion line and Users count for the owner only; new counts only for roles that may open them; "!" on failure', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(300_000)
  const user = await createUser({ name: 'E2E F2 Deletion' })
  await db().from('profiles').update({ deletion_requested_at: new Date(Date.now() - 22 * 24 * HOUR).toISOString() }).eq('id', user.id)
  try {
    const waiting = await count(db().from('profiles').select('id', head).not('deletion_requested_at', 'is', null))
    const { text } = await runAndReadDigest(page)
    expect(text).toMatch(new RegExp(`URGENT: Account deletion requests waiting: ${waiting} \\(oldest \\d+ days; promised within 30\\)`))
    // The owner (master login) sees the Users count and the new counts.
    await adminSession(page)
    await page.goto('/roodber8')
    expect(await badge(page, 'Users')).toBe(waiting)
    // The Users list's existing filter shows the request.
    await page.goto('/roodber8/users?filter=deletion')
    await expect(page.getByText('E2E F2 Deletion').first()).toBeVisible()
    // "!" on failure for a new count.
    await without('select', 'partner_applications', async () => {
      await page.goto('/roodber8')
      expect(await badge(page, 'Partner applications')).toBe('!')
    })
    // Staff roles: never a count (or menu item) for an area they cannot open, and no hidden count in the page either.
    const expected: Record<'operations' | 'agent' | 'content', string[]> = { operations: ['Call-back requests'], agent: ['Enquiries'], content: [] }
    for (const role of ['operations', 'agent', 'content'] as const) {
      const done = await staffSession(page, role)
      try {
        const res = await page.goto('/roodber8')
        const html = (await res?.text()) ?? ''
        await expect(page.getByRole('heading', { name: /^Hello/ })).toBeVisible()
        for (const hidden of ['Users', 'Partner applications', 'Enquiries', 'Call-back requests'].filter((l) => !expected[role].includes(l))) {
          await expect(nav(page).getByRole('link', { name: new RegExp(`^${hidden}\\b`) }), `${role}: ${hidden}`).toHaveCount(0)
        }
        for (const shown of expected[role]) await expect(nav(page).getByRole('link', { name: new RegExp(`^${shown}\\b`) }), `${role}: ${shown}`).toHaveCount(1)
        for (const key of ['users', 'partners', ...(role === 'agent' ? ['callbacks'] : ['enquiries'])]) expect(html, `${role}: ${key}`).not.toMatch(new RegExp(`\\\\?"${key}\\\\?":(\\d|null)`))
      } finally {
        await done()
      }
    }
  } finally {
    await db().auth.admin.deleteUser(user.id)
  }
})

test('J9: a failed account page and a failed admin page keep the header and show the existing error texts', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'one width is enough')
  const provider = await createProvider({ name: `E2E F2 Error Co ${Date.now()}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole', verified: true })
  try {
    await signIn(page, provider.user.email, provider.user.password)
    await without('select', 'employer_verifications', async () => {
      await page.goto('/account/company/verification')
      await expect(page.getByText('Something went wrong').first()).toBeVisible()
      await expect(page.getByRole('heading', { name: FAILED_PAGE })).toBeVisible()
      await expect(page.getByText("It's on our side, not yours. Please try again. If it keeps happening, contact us and we'll fix it.")).toBeVisible()
      await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Contact us' }).first()).toBeVisible()
      // The site header stays.
      await expect(page.locator('header').first()).toBeVisible()
    })
    await page.goto('/account/company/verification')
    await expect(page.getByRole('heading', { name: FAILED_PAGE })).toHaveCount(0)
    await adminSession(page)
    await without('select', 'trade_accounts', async () => {
      await page.goto('/roodber8/trade-accounts')
      await expect(page.getByRole('heading', { name: FAILED_PAGE })).toBeVisible()
      await expect(page.getByText("It's on our side, not yours. Please try again. If it keeps happening, contact us and we'll fix it.")).toBeVisible()
      await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible()
      await expect(page.getByText('HagerLand admin')).toBeVisible()
      await expect(nav(page)).toBeVisible()
    })
  } finally {
    await db().from('organisations').delete().eq('id', provider.orgId)
    await db().auth.admin.deleteUser(provider.user.id)
  }
})
