import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { expect, test, type Browser, type Page } from '@playwright/test'
import { authenticator } from 'otplib'
import { adminSession, allMail, asFreshVisitor, assertLocalStack, db, mailWithSubject, linkMatching, signUp, submitStaffSignIn, testPhotos, uniqueEmail } from './helpers'

/**
 * S6-1 private partner registration, partner area and product drafts: AB's whole journey on the local copy and local
 * mail catcher only. The four new switches start off; the ones this test turns on are put back off in `finally`.
 * Ends with the bad-actor sweep: no public page, image, feed, search, contact reveal, email or CSV carries the
 * partner's name, phone, email, product code or price. Runs in order on one worker.
 */
test.describe.configure({ mode: 'serial' })
test.beforeAll(() => assertLocalStack())
test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'server journeys at one width (the 375 px checks set their own size)'))

const stamp = Date.now()
const PARTNER = `Zebra Cement Works ${stamp}`
const PARTNER_SLUGISH = `zebra-cement-works-${stamp}`
const PHONE_LOCAL = `0911${String(stamp).slice(-6)}`
const PHONE_E164 = `+251911${String(stamp).slice(-6)}`
const APPLICANT_EMAIL = uniqueEmail('s6-applicant')
const SKU = `ZCW-SKU-${stamp}`
const PRICE = '777.25'
const PRODUCT = `Portland cement 42.5 E2E ${stamp}`

function psql(sql: string): string {
  return execFileSync('psql', ['-h', 'localhost', '-p', '54322', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atc', sql], { env: { ...process.env, PGPASSWORD: 'postgres' } }).toString().trim()
}
function setSwitch(key: string, on: boolean) {
  psql(`update public.site_settings set value = '${on}'::jsonb where key = '${key}'`)
}
function allSwitchesOff() {
  for (const k of ['supply_partner_registration', 'supply_catalogue_ordering', 'supply_trade_pricing', 'home_business_row']) setSwitch(k, false)
}

async function staffPage(browser: Browser, role: 'operations' | 'agent' | 'content'): Promise<Page> {
  const encrypt = (plain: string) => {
    const key = crypto.createHmac('sha256', process.env.ADMIN_TOTP_SECRET ?? '').update('hagerland-staff-totp-v1').digest()
    const iv = crypto.randomBytes(12)
    const c = crypto.createCipheriv('aes-256-gcm', key, iv)
    const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()])
    return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.')
  }
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const email = uniqueEmail(`s6-${role}`)
  const secret = authenticator.generateSecret()
  const { data } = await db().auth.admin.createUser({ email, password: 'staff-correct-horse', email_confirm: true, app_metadata: { staff: true } })
  await db().from('staff_users').insert({ email, name: `E2E ${role}`, role, status: 'active', user_id: data.user!.id, totp_secret_enc: encrypt(secret), totp_enrolled_at: new Date().toISOString() })
  await submitStaffSignIn(page, email, 'staff-correct-horse', secret)
  return page
}

/** Switches off through the owner's page (as AB would), which also refreshes the cached homepage and privacy page. */
async function switchOffThroughPage(page: Page) {
  await adminSession(page)
  await page.goto('/roodber8/supply/switches')
  while (await page.getByRole('button', { name: 'Switch off' }).count()) {
    const before = await page.getByRole('button', { name: 'Switch off' }).count()
    await page.getByRole('button', { name: 'Switch off' }).first().click()
    await expect(page.getByRole('button', { name: 'Switch off' })).toHaveCount(before - 1)
  }
}

async function noHorizontalScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
}

const shared: { registrationId?: string; orgId?: string; draftId?: string; productId?: string; productSlug?: string; partnerEmail?: string } = {}

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage()
  await switchOffThroughPage(page)
  allSwitchesOff()
  await page.close()
})

test('with every switch off: no row 2, the register page is not found, no privacy lines, nothing in the sitemap; admin pages open', async ({ page }) => {
  // Whatever an earlier run left: off in the database, then one switch flipped off through the owner's page, which
  // also refreshes the cached homepage and privacy page.
  allSwitchesOff()
  setSwitch('home_business_row', true)
  await switchOffThroughPage(page)
  await page.context().clearCookies()
  const home = await page.goto('/')
  expect(home?.status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'Start here' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Sell through HagerLand' })).toHaveCount(0)
  expect((await page.goto('/sell-through-hagerland/register'))?.status()).toBe(404)
  await page.goto('/privacy')
  await expect(page.getByText('Businesses that register to supply HagerLand', { exact: false })).toHaveCount(0)
  const sitemap = await (await page.request.get('/sitemap/static.xml')).text()
  expect(sitemap).not.toContain('sell-through-hagerland')
  await adminSession(page)
  await page.goto('/roodber8/supply/switches')
  for (const label of ['Partner registration', 'Homepage “Sell through HagerLand” row', 'Catalogue ordering', 'Trade price agreements']) await expect(page.getByText(`${label}: Off`)).toBeVisible()
  // The two later switches cannot be switched on here.
  await expect(page.getByRole('button', { name: 'Switch on' })).toHaveCount(2)
  await page.goto('/roodber8/supply/registrations')
  await expect(page.getByRole('heading', { name: 'Partner registrations' })).toBeVisible()
  await page.goto('/roodber8/supply/product-drafts')
  await expect(page.getByRole('heading', { name: 'Partner product drafts' })).toBeVisible()
})

test('staff add a registration while the public form is off; Agent and Content are refused', async ({ page, browser }) => {
  await adminSession(page)
  await page.goto('/roodber8/supply/registrations/new')
  await page.fill('#sr-business', `Field Shop ${stamp}`)
  await page.check('#sr-role-retail_shop')
  await page.fill('#sr-contact', 'Hirut Field')
  await page.fill('#sr-phone', '0922000111')
  await page.getByRole('button', { name: 'Add registration' }).click()
  await expect(page.getByText('Registration added. Its private supply partner record was created too.')).toBeVisible()
  const { data: reg } = await db().from('partner_registrations').select('source, status, org:organisations(status)').eq('business_name', `Field Shop ${stamp}`).single()
  expect(reg).toMatchObject({ source: 'staff', status: 'submitted', org: { status: 'draft' } })
  for (const role of ['agent', 'content'] as const) {
    const staff = await staffPage(browser, role)
    for (const path of ['/roodber8/supply/registrations', '/roodber8/supply/product-drafts', '/roodber8/supply/switches']) {
      await staff.goto(path)
      await expect(staff).toHaveURL(/denied=1/)
    }
    await staff.close()
  }
})

test('the owner switches registration on; row 2 needs its own switch too; a visitor registers without an account', async ({ page, browser }) => {
  await adminSession(page)
  await page.goto('/roodber8/supply/switches')
  await page.getByText('Partner registration: Off').locator('..').getByRole('button', { name: 'Switch on' }).click()
  await expect(page.getByText('Partner registration is now on.')).toBeVisible()
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Sell through HagerLand' })).toHaveCount(0)
  // The owner's action clears the cached homepage, so the row appears at once.
  await page.goto('/roodber8/supply/switches')
  await page.getByText('Homepage “Sell through HagerLand” row: Off').locator('..').getByRole('button', { name: 'Switch on' }).click()
  await expect(page.getByText('Homepage “Sell through HagerLand” row is now on.')).toBeVisible()

  const visitor = await browser.newPage({ viewport: { width: 375, height: 800 } })
  // A fresh simulated visitor address, so the 5-an-hour registration limit never blocks repeated runs.
  await asFreshVisitor(visitor)
  await visitor.goto('/')
  await expect(visitor.getByRole('heading', { name: 'Start here' })).toBeVisible()
  await expect(visitor.getByRole('heading', { name: 'Sell through HagerLand' })).toBeVisible()
  await expect(visitor.getByText('Reach builders, homeowners and contractors across Ethiopia through HagerLand Supply.')).toBeVisible()
  for (const h of ['Manufacturers', 'Importers', 'Suppliers & shops']) await expect(visitor.getByRole('heading', { name: h, exact: true })).toBeVisible()
  await expect(visitor.getByRole('link', { name: 'Open a trade account' })).toHaveAttribute('href', '/supplies/trade')
  await noHorizontalScroll(visitor)
  await visitor.getByRole('link', { name: 'Register as a manufacturer' }).click()
  await expect(visitor).toHaveURL(/\/sell-through-hagerland\/register\?role=manufacturer/)
  await expect(visitor.getByRole('heading', { name: 'Register your business with HagerLand Supply' })).toBeVisible()
  await expect(visitor.getByRole('heading', { name: 'How it works' })).toBeVisible()
  await expect(visitor.locator('#pr-role-manufacturer')).toBeChecked()
  await noHorizontalScroll(visitor)

  // Missing fields: the site's existing texts.
  await visitor.getByRole('button', { name: 'Send registration' }).click()
  await expect(visitor.getByText('Please check the highlighted fields.').first()).toBeVisible()
  await visitor.fill('#pr-business', PARTNER)
  await visitor.check('#pr-role-supplier')
  await visitor.locator('input[name="category_ids"]').first().check()
  await visitor.locator('#pr-city').fill('Addis')
  await visitor.getByRole('option', { name: /^Addis Ababa/ }).first().click()
  await visitor.fill('#pr-contact', 'Abebe Partner')
  await visitor.fill('#pr-phone', PHONE_LOCAL)
  await visitor.fill('#pr-email', APPLICANT_EMAIL)
  await visitor.fill('#pr-tin', '0012345678')
  await visitor.check('#pr-consent')
  await visitor.getByRole('button', { name: 'Send registration' }).click()
  await expect(visitor.getByText(/Thank you\. Your registration HLB-\d{4}-\d{6} is with our team\. We will contact you to talk about terms\./)).toBeVisible()
  await visitor.close()

  const { data: reg } = await db().from('partner_registrations').select('id, reference, roles, phone, status, source, consent_version, org_id').eq('business_name', PARTNER).single()
  expect(reg).toMatchObject({ roles: ['manufacturer', 'supplier'], phone: PHONE_E164, status: 'submitted', source: 'public_form' })
  expect(reg!.consent_version).toMatch(/^s6-1-/)
  const { data: org } = await db().from('organisations').select('status, kind').eq('id', reg!.org_id).single()
  // More than one role: a supplier organisation (a manufacturer-only registration would be a manufacturer).
  expect(org).toEqual({ status: 'draft', kind: 'supplier' })
  const { data: sp } = await db().from('supply_partners').select('relationship_status, source, roles').eq('org_id', reg!.org_id).single()
  expect(sp).toEqual({ relationship_status: 'interested', source: 'self_signup', roles: ['manufacturer', 'wholesaler'] })
  shared.registrationId = reg!.id
  shared.orgId = reg!.org_id
  const mail = await mailWithSubject(APPLICANT_EMAIL, `We received your registration (${reg!.reference})`)
  expect(mail.text).toContain(`Thank you for registering ${PARTNER} with HagerLand Supply. Our team will contact you to talk about terms. Your details stay private.`)
})

test('the partner never gets a public page: direct URL, search, sitemap and publishing are all closed', async ({ page }) => {
  const { data: org } = await db().from('organisations').select('slug, short_id').eq('id', shared.orgId!).single()
  expect((await page.goto(`/company/${org!.slug}`))?.status()).toBe(404)
  const search = await (await page.request.get(`/api/search/suggest?q=${encodeURIComponent('Zebra Cement')}`)).text()
  expect(search).not.toContain(String(stamp))
  for (const id of ['companies', 'products', 'static']) expect(await (await page.request.get(`/sitemap/${id}.xml`)).text()).not.toContain(org!.slug)
  // The owner tries the ordinary organisation status tool: the database refuses, the business stays private.
  await adminSession(page)
  await page.goto(`/roodber8/organisations/${shared.orgId}`)
  const status = page.getByLabel('Status', { exact: true }).first()
  if (await status.count()) {
    await status.selectOption('published')
    await page.getByRole('button', { name: 'Set status' }).first().click()
    await page.waitForTimeout(1000)
  }
  expect((await db().from('organisations').select('status').eq('id', shared.orgId!).single()).data?.status).toBe('draft')
})

test('owner approves and invites; the partner signs up from the link and adds a draft with photos', async ({ page, browser }) => {
  await adminSession(page)
  await page.goto(`/roodber8/supply/registrations/${shared.registrationId}`)
  await page.getByRole('button', { name: 'Approve as partner' }).click()
  await expect(page.getByText('Registration is now “Approved”. Nothing was sent to the business.')).toBeVisible()
  shared.partnerEmail = uniqueEmail('s6-partner')
  await page.reload()
  await page.fill('#inv-email', shared.partnerEmail)
  await page.getByRole('button', { name: 'Send partner-area invitation' }).click()
  await expect(page.getByText(`Invitation sent to ${shared.partnerEmail}. The link works for 7 days.`)).toBeVisible()
  const invite = await mailWithSubject(shared.partnerEmail, 'Your HagerLand Supply partner area')
  expect(invite.text).toContain(`Hello Abebe, we have set up a private partner area for ${PARTNER}. Use the button to sign in and add your products. The link works for 7 days.`)
  const link = new URL(linkMatching(invite.html, /\/partner\/invite\//))

  const partner = await browser.newPage({ viewport: { width: 375, height: 800 } })
  // Not signed in: the link goes to sign-in, which offers the existing "create an account".
  await partner.goto(link.pathname)
  await expect(partner).toHaveURL(/\/login\?next=%2Fpartner%2Finvite%2F/)
  await signUp(partner, { type: 'looking', email: shared.partnerEmail, name: 'Abebe Partner' })
  // Someone who is not a partner member finds no partner area.
  expect((await partner.goto('/partner'))?.status()).toBe(404)
  await partner.goto(link.pathname)
  await partner.getByRole('button', { name: 'Open my partner area' }).click()
  await expect(partner).toHaveURL(/\/partner$/)
  await expect(partner.getByRole('heading', { name: 'Your products' })).toBeVisible()
  await expect(partner.getByText('Add the products you would like HagerLand Supply to offer. Our team reviews each one before it appears on HagerLand, under the HagerLand Supply name.')).toBeVisible()
  await expect(partner.getByText('Your price and product code are never shown to customers.')).toBeVisible()
  await noHorizontalScroll(partner)
  // A partner member never becomes a business member: no business account pages.
  const { data: members } = await db().from('organisation_members').select('org_id').eq('org_id', shared.orgId!)
  expect(members).toEqual([])

  await partner.fill('#pd-name', PRODUCT)
  await partner.fill('#pd-brand', 'Zebra')
  await partner.locator('#pd-cat').selectOption({ index: 1 })
  await partner.locator('#pd-unit').selectOption('bag')
  await partner.fill('#pd-pack', '50 kg bag')
  await partner.fill('#pd-desc', 'General purpose cement for blocks and slabs.')
  await partner.fill('#pd-specs', 'Strength class: 42.5 N\nStandard: ES 1177')
  await partner.fill('#pd-sku', SKU)
  await partner.fill('#pd-price', PRICE)
  await partner.fill('#pd-stock', '2,000 bags in our Akaki store')
  await partner.fill('#pd-lead', '3')
  await partner.fill('#pd-min', '20')
  const photos = await testPhotos(2)
  await partner.locator('input[type="file"][aria-label="Photos"]').setInputFiles(photos)
  await expect(partner.getByText('Done')).toHaveCount(2, { timeout: 30_000 })
  await partner.getByRole('button', { name: 'Save draft' }).click()
  await expect(partner).toHaveURL(/\/partner\/[0-9a-f-]{36}$/)
  await expect(partner.getByText('Draft', { exact: true })).toBeVisible()
  shared.draftId = partner.url().split('/').pop()
  const { data: draft } = await db().from('partner_product_drafts').select('status, partner_sku, proposed_price_cents, photo_paths, org_id').eq('id', shared.draftId!).single()
  expect(draft).toMatchObject({ status: 'draft', partner_sku: SKU, proposed_price_cents: 77725, org_id: shared.orgId })
  expect(draft!.photo_paths).toHaveLength(2)
  expect(draft!.photo_paths.every((p: string) => p.startsWith(`docs/partner/${shared.draftId}/`) && p.endsWith('.jpg'))).toBe(true)
  await partner.getByRole('button', { name: 'Send for review' }).click()
  await expect(partner.getByText('Sent for review', { exact: true })).toBeVisible()
  await partner.close()
})

test('Operations asks for changes without ever seeing the price or code; the partner resubmits', async ({ browser }) => {
  const ops = await staffPage(browser, 'operations')
  const responses: string[] = []
  ops.on('response', async (r) => {
    if (r.url().includes('/roodber8/supply/product-drafts')) responses.push(await r.text().catch(() => ''))
  })
  await ops.goto('/roodber8/supply/product-drafts')
  await ops.getByRole('link', { name: PRODUCT }).click()
  await expect(ops.getByRole('heading', { name: PRODUCT })).toBeVisible()
  const html = await ops.content()
  for (const secret of [SKU, '777.25', '77,725', '777', 'owner only']) expect(html).not.toContain(secret)
  await expect(ops.getByRole('heading', { name: 'Approve' })).toHaveCount(0)
  await ops.fill('#dr-note', 'Please add a photo of the bag label.')
  await ops.getByRole('button', { name: 'Ask for changes' }).click()
  await expect(ops.getByText('Sent back to the partner with your note. No email was sent.')).toBeVisible()
  for (const body of responses) expect(body).not.toContain(SKU)
  // Operations cannot open the owner's switches.
  await ops.goto('/roodber8/supply/switches')
  await expect(ops).toHaveURL(/denied=1/)
  await ops.close()

  const partner = await browser.newPage()
  await partner.goto('/login')
  await partner.fill('#login-email', shared.partnerEmail!)
  await partner.fill('#login-password', 'correct-horse-battery')
  await partner.getByRole('button', { name: 'Sign in', exact: true }).click()
  await partner.waitForURL((u) => !u.pathname.startsWith('/login'))
  await partner.goto(`/partner/${shared.draftId}`)
  await expect(partner.getByText('Changes requested', { exact: true })).toBeVisible()
  await expect(partner.getByText('Please add a photo of the bag label.')).toBeVisible()
  await partner.getByRole('button', { name: 'Send for review' }).click()
  await expect(partner.getByText('Sent for review', { exact: true })).toBeVisible()
  // Another partner's draft id is "not found" for this partner.
  expect((await partner.goto(`/partner/${crypto.randomUUID()}`))?.status()).toBe(404)
  await partner.close()
})

test('owner approves: a HagerLand Supply product draft and a private source; publishing is the usual step', async ({ page }) => {
  await adminSession(page)
  await page.goto(`/roodber8/supply/product-drafts/${shared.draftId}`)
  await expect(page.getByText('Partner’s product code (owner only)')).toBeVisible()
  await expect(page.locator('#ap-cost')).toHaveValue('777.25')
  // S6-3: one model per source, so a markup only (a commission as well is refused).
  await page.fill('#ap-comm', '5')
  await page.fill('#ap-markup', '12.5')
  await page.getByRole('button', { name: 'Approve and create the product draft' }).click()
  await expect(page.getByText('Use a commission or a markup for one source, not both.')).toBeVisible()
  await page.fill('#ap-comm', '')
  await page.fill('#ap-markup', '12.5')
  await page.locator('#ap-settle').selectOption('after_delivery')
  await page.getByRole('button', { name: 'Approve and create the product draft' }).click()
  await page.waitForURL(/\/roodber8\/products\/[0-9a-f-]{36}/)
  shared.productId = page.url().split('/').pop()!.split('?')[0]
  const { data: product } = await db().from('products').select('slug, status, sku, price_type, seller:organisations(slug, is_hagerland), brand:brands(name)').eq('id', shared.productId).single()
  expect(product).toMatchObject({ status: 'draft', sku: null, price_type: 'on_request', seller: { slug: 'hagerland-supply', is_hagerland: true }, brand: { name: 'Zebra' } })
  shared.productSlug = product!.slug
  const { data: source } = await db().from('product_sources').select('org_id, partner_sku, cost_price_cents, commission_bps, markup_bps, settlement_timing, is_primary').eq('product_id', shared.productId).single()
  expect(source).toEqual({ org_id: shared.orgId, partner_sku: SKU, cost_price_cents: 77725, commission_bps: null, markup_bps: 1250, settlement_timing: 'after_delivery', is_primary: true })
  const { data: media } = await db().from('media').select('storage_path, status').eq('entity_type', 'product').eq('entity_id', shared.productId)
  expect(media).toHaveLength(2)
  expect(media!.every((m) => m.storage_path.endsWith('.webp') && m.status === 'approved')).toBe(true)
  expect((await db().from('partner_product_drafts').select('status, product_id').eq('id', shared.draftId!).single()).data).toEqual({ status: 'approved', product_id: shared.productId })
  // Draft products are not public yet.
  expect((await page.request.get(`/supplies/product/${shared.productSlug}`)).status()).toBe(404)
  await page.goto(`/roodber8/products/${shared.productId}`)
  await page.getByLabel('Status', { exact: true }).selectOption('published')
  await page.getByRole('button', { name: 'Set status' }).click()
  await expect.poll(async () => (await db().from('products').select('status').eq('id', shared.productId!).single()).data?.status).toBe('published')
})

test('bad-actor sweep: nothing public, no email and no CSV carries the partner', async ({ page, request }) => {
  const secrets = [PARTNER, 'Zebra Cement', PARTNER_SLUGISH, PHONE_E164, PHONE_LOCAL, '911 ' + PHONE_E164.slice(7, 10), APPLICANT_EMAIL, shared.partnerEmail!, SKU, '777.25', '777,25', 'Abebe Partner', 'Akaki']
  const { data: org } = await db().from('organisations').select('slug, short_id').eq('id', shared.orgId!).single()
  secrets.push(org!.slug, org!.short_id)
  const clean = (label: string, body: string) => {
    for (const s of secrets) expect(body.includes(s), `${label} contains "${s}"`).toBe(false)
  }

  // The public product page (HTML incl. search-engine data) shows HagerLand Supply and the product's own brand.
  const res = await page.goto(`/supplies/product/${shared.productSlug}`)
  expect(res?.status()).toBe(200)
  await expect(page.getByText('Sold by HagerLand Supply')).toBeVisible()
  await expect(page.getByText('Zebra', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Price on request').first()).toBeVisible()
  const html = await page.content()
  clean('product page', html)
  // Search-engine data: the product's own brand; a seller appears only with a fixed price, and it can only be HagerLand
  // Supply (products_public below).
  expect(html).toContain('"brand":{"@type":"Brand","name":"Zebra"}')
  for (const m of html.match(/"seller":\{[^}]*\}/g) ?? []) expect(m).toBe('"seller":{"@type":"Organization","name":"HagerLand Supply"}')
  // Every other public read path.
  const og = await request.get(`/og/product/${shared.productSlug}`)
  expect(og.status()).toBe(200)
  clean('share image bytes', (await og.body()).toString('latin1'))
  for (const path of ['/sitemap/products.xml', '/sitemap/companies.xml', '/sitemap/static.xml', `/api/search/suggest?q=${encodeURIComponent('Portland cement 42.5 E2E')}`, `/search?q=${encodeURIComponent('Portland cement')}`, '/supplies', '/supplies/special-buys', '/'])
    clean(path, await (await request.get(path)).text())
  const reveal = await request.post('/api/contact-reveal', { data: { target_type: 'product', target_id: shared.productId, channel: 'phone' }, headers: { 'x-forwarded-for': '10.77.1.1' } })
  clean('contact reveal', await reveal.text())
  const { data: products } = await db().from('products_public').select('seller_name, seller_slug, seller_is_hagerland, sku').eq('id', shared.productId!).single()
  expect(products).toEqual({ seller_name: 'HagerLand Supply', seller_slug: 'hagerland-supply', seller_is_hagerland: true, sku: null })

  // A customer's question about the product goes to HagerLand, never to the partner.
  const customer = uniqueEmail('s6-customer')
  await page.getByRole('button', { name: 'Ask a question' }).click()
  await page.fill('#ask-name', 'Curious Customer')
  await page.fill('#ask-phone', '0933000222')
  await page.fill('#ask-email', customer)
  await page.fill('#ask-message', 'Do you deliver to Bole?')
  await page.getByRole('button', { name: 'Send enquiry' }).click()
  await expect.poll(async () => (await db().from('enquiries').select('id').eq('target_id', shared.productId!)).data?.length ?? 0).toBeGreaterThan(0)
  const { data: enquiries } = await db().from('enquiries').select('recipient_org_id').eq('target_id', shared.productId!)
  expect((enquiries ?? []).every((e) => e.recipient_org_id === null)).toBe(true)
  for (const m of await allMail(customer)) clean('customer email', m.text + m.html)
  // The partner's own inbox received only the two approved emails (no customer details, ever).
  const partnerMail = [...(await allMail(APPLICANT_EMAIL)), ...(await allMail(shared.partnerEmail!))].map((m) => m.subject)
  expect(partnerMail.every((s) => s.startsWith('We received your registration') || s === 'Your HagerLand Supply partner area' || /confirm|welcome/i.test(s))).toBe(true)

  // CSV exports for staff never carry the partner's code or price; the product CSV shows HagerLand Supply.
  await adminSession(page)
  for (const kind of ['products', 'organisations']) {
    const csv = await (await page.request.get(`/roodber8/export/${kind}`)).text()
    for (const s of [SKU, '777.25', PHONE_E164]) expect(csv.includes(s), `${kind} CSV contains ${s}`).toBe(false)
  }
})
