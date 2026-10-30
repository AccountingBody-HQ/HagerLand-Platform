import { execFileSync } from 'node:child_process'
import { expect, test, type Page } from '@playwright/test'
import { adminSession, assertLocalStack, asFreshVisitor, db, latestMail, firstLink, randomPhone, signIn, uniqueEmail, TRANSFER_CONSENT_LABEL } from './helpers'

/**
 * QC-2 seller-ready, local copy only: the data-transfer tick and its record, the account notice, sign-up with both
 * ticks, the legal pages, the product page (VAT line, "Sold by"), the owner's payment methods and the unlock texts.
 * Switches and settings are changed only here, locally, and put back afterwards.
 */
test.describe.configure({ mode: 'serial' })
test.beforeAll(() => assertLocalStack())
test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'one width; 375 px checks are inside the tests'))

const stamp = Date.now()
function psql(sql: string): string {
  return execFileSync('psql', ['-h', 'localhost', '-p', '54322', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atc', sql], { env: { ...process.env, PGPASSWORD: 'postgres' } }).toString().trim()
}
async function noHorizontalScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
}
const consents = (form: string, ref: string) => Number(psql(`select count(*) from public.data_transfer_consents where form = '${form}' and subject_reference = '${ref}' and consent_version = 'w17-2026-10'`))

test('W17: the contact form refuses without the tick (server check), and records the consent with the saved enquiry', async ({ page }) => {
  await asFreshVisitor(page)
  await page.goto('/contact')
  const name = `QC2 Consent ${stamp}`
  await page.fill('#contact-name', name)
  await page.fill('#contact-phone', randomPhone())
  await page.fill('#contact-message', 'Do you deliver cement to Bole?')
  await expect(page.getByLabel(TRANSFER_CONSENT_LABEL, { exact: true })).toBeVisible()
  // The browser would stop an unticked required box; send the form without it, as a script could.
  await page.evaluate(() => document.querySelectorAll('input[name="transfer_consent"]').forEach((i) => i.removeAttribute('required')))
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByText('Tick the box to continue.')).toBeVisible()
  expect(Number(psql(`select count(*) from public.enquiries where name = '${name}'`))).toBe(0)
  await page.getByLabel(TRANSFER_CONSENT_LABEL, { exact: true }).check()
  await page.getByRole('button', { name: 'Send message' }).click()
  await expect(page.getByText('Your enquiry has been sent')).toBeVisible()
  const ref = psql(`select reference from public.enquiries where name = '${name}'`)
  expect(consents('enquiry', ref)).toBe(1)
  expect(psql(`select count(*) from public.data_transfer_consents where form = 'enquiry' and subject_reference = '${ref}' and (subject_table <> 'enquiries' or subject_id is null)`)).toBe('0')
  psql(`delete from public.enquiries where name = '${name}'`)
})

test('W18 + W17: sign-up needs both ticks; the new account has its consent and never sees the account notice', async ({ page }) => {
  await asFreshVisitor(page)
  const email = uniqueEmail('qc2-signup')
  await page.setExtraHTTPHeaders({ 'x-forwarded-for': `10.7.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` })
  await page.goto('/signup?type=looking')
  await expect(page.getByText('I am 18 or older and I agree to the')).toBeVisible()
  await page.fill('#su-name', 'QC2 Signup')
  await page.fill('#su-email', email)
  await page.fill('#su-phone', '911234567')
  await page.fill('#su-password', 'correct-horse-battery')
  await page.check('#su-terms')
  await page.evaluate(() => document.querySelectorAll('input[name="transfer_consent"]').forEach((i) => i.removeAttribute('required')))
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText('Tick the box to continue.')).toBeVisible()
  await page.getByLabel(TRANSFER_CONSENT_LABEL, { exact: true }).check()
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page.getByText('Check your email')).toBeVisible()
  await page.setExtraHTTPHeaders({})
  const id = psql(`select id from auth.users where email = '${email}'`)
  expect(psql(`select count(*) from public.data_transfer_consents where subject_table = 'profiles' and subject_id = '${id}'`)).toBe('1')
  await page.goto(firstLink((await latestMail(email)).html))
  await page.waitForURL((u) => /\/(onboarding|account)/.test(u.pathname))
  await page.goto('/account')
  await expect(page.getByTestId('account-consent-notice')).toHaveCount(0)
  await db().auth.admin.deleteUser(id)
})

test('the account notice: an existing account confirms once; signed-in forms refuse until then', async ({ page }) => {
  // An account made before QC-2: no consent row.
  const email = uniqueEmail('qc2-existing')
  const { data } = await db().auth.admin.createUser({ email, password: 'correct-horse-battery', email_confirm: true, user_metadata: { full_name: 'QC2 Existing' } })
  const id = data.user!.id
  try {
    await signIn(page, email, 'correct-horse-battery')
    await page.goto('/account')
    const notice = page.getByTestId('account-consent-notice')
    await expect(notice).toBeVisible()
    await expect(notice.getByRole('heading', { name: 'To keep using your account, please confirm:' })).toBeVisible()
    await page.setViewportSize({ width: 375, height: 800 })
    await noHorizontalScroll(page)
    await page.setViewportSize({ width: 1280, height: 900 })
    // A signed-in-only form refuses while the notice is open (trade account application).
    await page.goto('/supplies/trade')
    await page.getByLabel('Business name').fill(`QC2 Builders ${stamp}`)
    await page.getByLabel('Type of business').fill('Contractor')
    await page.getByLabel('Phone').fill('0911 000 111')
    await page.getByRole('button', { name: /Apply/ }).click()
    await expect(page.getByText('Please confirm the notice at the top of your account first.')).toBeVisible()
    expect(psql(`select count(*) from public.trade_accounts where user_id = '${id}'`)).toBe('0')
    // Confirm the notice.
    await page.goto('/account')
    await notice.getByLabel(TRANSFER_CONSENT_LABEL, { exact: true }).check()
    await notice.getByRole('button', { name: 'Confirm' }).click()
    await expect(page.getByTestId('account-consent-notice')).toHaveCount(0)
    expect(psql(`select count(*) from public.data_transfer_consents where subject_table = 'profiles' and subject_id = '${id}' and form = 'account_notice'`)).toBe('1')
    await page.goto('/account/settings')
    await expect(page.getByTestId('account-consent-notice')).toHaveCount(0)
  } finally {
    psql(`delete from public.trade_accounts where user_id = '${id}'`)
    await db().auth.admin.deleteUser(id)
  }
})

test('legal pages show the approved text; the switch-dependent sections follow their switches', async ({ page }) => {
  await page.goto('/terms')
  for (const t of [
    'Some products on HagerLand are sold by other businesses. Their product pages say “Sold by” and the business name, and the contract for those products is between you and that business.',
    'These terms are governed by the laws of the Federal Democratic Republic of Ethiopia, and the courts of Addis Ababa deal with any dispute.',
    'A check is not a guarantee.',
    'If a change significantly affects you, we will tell you before it applies.',
    'HagerLand® is a registered trade mark of AccountingBody Ltd in the United Kingdom.',
  ])
    await expect(page.getByText(t, { exact: false })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Buying from HagerLand Supply/ })).toHaveCount(0)
  // "Report this job" is On locally (as on live): the sentence shows; Off: it goes.
  await expect(page.getByText('Anyone can report a job; HagerLand reviews reports and may pause or remove a job.')).toBeVisible()
  psql(`update public.site_settings set value = 'false'::jsonb where key = 'jobs_reports_enabled'`)
  try {
    await page.goto('/terms')
    await expect(page.getByText('Anyone can report a job', { exact: false })).toHaveCount(0)
  } finally {
    psql(`update public.site_settings set value = 'true'::jsonb where key = 'jobs_reports_enabled'`)
  }
  await page.setViewportSize({ width: 375, height: 800 })
  await noHorizontalScroll(page)
  await page.goto('/privacy')
  for (const t of [
    'HagerLand LTD, Addis Ababa, Ethiopia, runs HagerLand and is responsible for your personal information. For people in the UK, AccountingBody Ltd is our UK contact.',
    'We use your information because we need it to provide what you ask for',
    'our map image provider (map pages) and YouTube (development videos, only when you play one)',
    'Our database and files are kept on servers in the European Union (Ireland).',
    'download a copy of the main details in your account',
    'You can also complain to the Ethiopian Communications Authority',
    'HagerLand is for adults. You must be 18 or older to create an account or to apply for work through HagerLand.',
    'Market appraisal requests, viewings, offers and applications to rent:',
  ])
    await expect(page.getByText(t, { exact: false })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Children' })).toBeVisible()
  await expect(page.getByText('This website is operated by', { exact: false })).toHaveCount(0)
  await noHorizontalScroll(page)
  await page.goto('/cookies')
  for (const t of ['(up to 400 days)', '(1 year)', '(until you close your browser)', '(8 hours)', 'may set a cookie when a form is shown', 'Map pages load map images from our map image provider'])
    await expect(page.getByText(t, { exact: false })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Maps and videos' })).toBeVisible()
  await noHorizontalScroll(page)
})

test('product pages: the VAT line, "Sold by" the selling business, never a partner', async ({ page }) => {
  const d = db()
  const { data: cat } = await d.from('product_categories').select('id').eq('slug', 'cement-concrete').single()
  const { data: hls } = await d.from('organisations').select('id').eq('slug', 'hagerland-supply').single()
  const { data: shop } = await d.from('organisations').insert({ kind: 'supplier', name: `QC2 Merkato Shop ${stamp}`, slug: `qc2-shop-${stamp}`, status: 'published', source: 'admin' }).select('id').single()
  const { data: partner } = await d.from('organisations').insert({ kind: 'supplier', name: `QC2 Secret Partner ${stamp}`, slug: `qc2-partner-${stamp}`, status: 'draft', source: 'admin' }).select('id').single()
  await d.from('supply_partners').insert({ org_id: partner!.id, relationship_status: 'active' })
  const own = (await d.from('products').insert({ name: `QC2 Cement own ${stamp}`, slug: `qc2-own-${stamp}`, category_id: cat!.id, seller_org_id: hls!.id, unit: 'bag', status: 'published', price_type: 'fixed', price_etb_cents: 95000 }).select('id, slug').single()).data!
  const theirs = (await d.from('products').insert({ name: `QC2 Cement shop ${stamp}`, slug: `qc2-shop-${stamp}`, category_id: cat!.id, seller_org_id: shop!.id, unit: 'bag', status: 'published', price_type: 'fixed', price_etb_cents: 96000 }).select('id, slug').single()).data!
  const hidden = (await d.from('products').insert({ name: `QC2 Cement partner ${stamp}`, slug: `qc2-hidden-${stamp}`, category_id: cat!.id, seller_org_id: partner!.id, unit: 'bag', status: 'published', price_type: 'fixed', price_etb_cents: 97000 }).select('id, slug').single()).data!
  try {
    await page.setViewportSize({ width: 375, height: 800 })
    await page.goto(`/supplies/product/${own.slug}`)
    await expect(page.getByText('Sold by HagerLand Supply')).toBeVisible()
    await expect(page.getByText('Prices include VAT. They change often — we confirm today\'s price on your quote.')).toBeVisible()
    await noHorizontalScroll(page)
    await page.goto(`/supplies/product/${theirs.slug}`)
    await expect(page.getByText(`Sold by QC2 Merkato Shop ${stamp}`)).toBeVisible()
    // A private partner's own product never shows (its business is not published), so its name never appears.
    expect((await page.goto(`/supplies/product/${hidden.slug}`))?.status()).toBe(404)
    for (const path of [`/supplies/product/${own.slug}`, `/supplies/product/${theirs.slug}`, '/supplies', `/search?q=QC2`]) {
      const body = await (await page.request.get(path)).text()
      expect(body, path).not.toContain(`QC2 Secret Partner ${stamp}`)
    }
  } finally {
    await d.from('products').delete().in('id', [own.id, theirs.id, hidden.id])
    await d.from('organisations').delete().in('id', [shop!.id, partner!.id])
  }
})

test('the owner manages payment methods; the switches page shows what is missing; switches stay Off', async ({ page }) => {
  const before = psql(`select string_agg(key || '=' || value::text, ',' order by key) from public.site_settings where key in ('supply_catalogue_ordering', 'supply_trade_pricing', 'legal_entity')`)
  await adminSession(page)
  await page.goto('/roodber8/supply/switches')
  await expect(page.getByTestId('unlock-catalogueOrdering')).toHaveText('Cannot be switched on yet: add an active payment method in Supplies → Payment methods; enter the company name in Settings → Legal entity.')
  await expect(page.getByTestId('unlock-tradePricing')).toHaveText('Cannot be switched on yet: add an active payment method in Supplies → Payment methods; enter the company name in Settings → Legal entity; switch on Catalogue ordering first.')
  await expect(page.getByText('Waits for HagerLand Ltd (Ethiopia)', { exact: false })).toHaveCount(0)
  const name = `QC2 telebirr ${stamp}`
  try {
    await page.goto('/roodber8/supply/payment-methods')
    await expect(page.getByText('No payment methods yet. Add at least one before ordering can be switched on.')).toBeVisible()
    await page.getByLabel('Name').last().fill(name)
    await page.getByLabel('How to pay (shown to customers)').last().fill('Merchant 123456, HagerLand LTD')
    await page.getByRole('button', { name: 'Save' }).last().click()
    await expect(page.getByTestId('payment-method')).toHaveCount(1)
    expect(psql(`select active || ',' || sort_order from public.supply_payment_methods where name = '${name}'`)).toBe('true,0')
    expect(psql(`select count(*) from public.audit_log where action = 'supply.payment_method.created' and entity_label = '${name}'`)).toBe('1')
    psql(`update public.site_settings set value = jsonb_set(value, '{name}', '"HagerLand LTD"') where key = 'legal_entity'`)
    await page.goto('/roodber8/supply/switches')
    await expect(page.getByTestId('unlock-catalogueOrdering')).toHaveText('Can be switched on: an active payment method and the company name in Settings are in place.')
    await expect(page.getByTestId('unlock-tradePricing')).toHaveText('Cannot be switched on yet: switch on Catalogue ordering first.')
    // Switching off the method locks ordering again (checked on the server too).
    await page.goto('/roodber8/supply/payment-methods')
    await page.getByTestId('payment-method').getByLabel('Active').uncheck()
    await expect.poll(() => psql(`select active from public.supply_payment_methods where name = '${name}'`)).toBe('f')
    await page.goto('/roodber8/supply/switches')
    await expect(page.getByTestId('unlock-catalogueOrdering')).toHaveText('Cannot be switched on yet: add an active payment method in Supplies → Payment methods.')
  } finally {
    psql(`delete from public.supply_payment_methods where name = '${name}'`)
    psql(`update public.site_settings set value = jsonb_set(value, '{name}', '""') where key = 'legal_entity'`)
  }
  expect(psql(`select string_agg(key || '=' || value::text, ',' order by key) from public.site_settings where key in ('supply_catalogue_ordering', 'supply_trade_pricing', 'legal_entity')`)).toBe(before)
})

test('Settings: the old payment-details box says it is no longer used', async ({ page }) => {
  await adminSession(page)
  await page.goto('/roodber8/settings')
  await expect(page.getByText('No longer used. Payment methods are now managed in Supplies → Payment methods.')).toBeVisible()
})
