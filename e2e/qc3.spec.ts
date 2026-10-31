import { execFileSync } from 'node:child_process'
import { expect, test, type Browser, type Page } from '@playwright/test'
import { adminSession, asFreshVisitor, assertLocalStack, createUser, db, randomPhone, signIn, tickTransferConsent } from './helpers'

/**
 * QC-3 small tidy-up (local copy only): the two new "Sell through HagerLand" links and their switches, "market appraisal"
 * on the Property hub and the account agency page, and the call-back form starting with nothing chosen. Every switch
 * this file turns on is put back off afterwards (and the global teardown resets them all).
 */
test.describe.configure({ mode: 'serial' })
test.beforeAll(() => assertLocalStack())
test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'each test checks 375 px and desktop itself'))

const WIDTHS = [375, 1280]
const REGISTER = '/sell-through-hagerland/register'

function psql(sql: string): string {
  return execFileSync('psql', ['-h', 'localhost', '-p', '54322', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atc', sql], { env: { ...process.env, PGPASSWORD: 'postgres' } }).toString().trim()
}

/** The owner's supply switches page, as AB uses it (it also refreshes the cached pages). */
async function supplySwitch(page: Page, label: string, on: boolean) {
  await adminSession(page)
  await page.goto('/roodber8/supply/switches')
  const box = page.getByText(new RegExp(`^${label}: (On|Off)$`)).locator('..')
  if ((await box.getByRole('button', { name: on ? 'Switch on' : 'Switch off' }).count()) === 0) return
  await box.getByRole('button', { name: on ? 'Switch on' : 'Switch off' }).click()
  await expect(page.getByText(`${label} is now ${on ? 'on' : 'off'}.`)).toBeVisible()
}

/** The owner's Jobs switches (Jobs → Data and switches). */
async function jobsSwitch(page: Page, label: 'Call-back requests' | 'Amharic for Jobs', on: boolean) {
  await adminSession(page)
  await page.goto('/roodber8/jobs/data')
  const state = page.getByText(new RegExp(`^${label}: (On|Off)$`))
  if ((await state.textContent())?.endsWith(on ? 'On' : 'Off')) return
  const box = state.locator('..')
  if (on && (await box.getByRole('checkbox').count())) await box.getByRole('checkbox').check()
  await box.getByRole('button', { name: on ? 'Switch on' : 'Switch off' }).click()
  await expect(page.getByText(`${label} is now ${on ? 'on' : 'off'} on the website.`)).toBeVisible()
}

async function noHorizontalScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true)
}

async function visitorAt(browser: Browser, width: number): Promise<Page> {
  const page = await browser.newPage({ viewport: { width, height: 900 } })
  await asFreshVisitor(page)
  return page
}

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await supplySwitch(page, 'Homepage “Sell through HagerLand” row', false)
  await supplySwitch(page, 'Partner registration', false)
  await jobsSwitch(page, 'Call-back requests', false)
  await jobsSwitch(page, 'Amharic for Jobs', false)
  await page.close()
  for (const key of ['supply_partner_registration', 'home_business_row', 'jobs_callbacks', 'jobs_amharic']) psql(`update public.site_settings set value = 'false'::jsonb where key = '${key}'`)
  expect(psql("select count(*) from public.site_settings where key in ('supply_partner_registration', 'home_business_row', 'jobs_callbacks', 'jobs_amharic') and value <> 'false'::jsonb")).toBe('0')
})

test('the two new links show while both switches are on, and go to the register page (375 px and desktop)', async ({ page, browser }) => {
  test.setTimeout(240_000)
  await supplySwitch(page, 'Partner registration', true)
  await supplySwitch(page, 'Homepage “Sell through HagerLand” row', true)
  for (const width of WIDTHS) {
    const visitor = await visitorAt(browser, width)
    await visitor.goto('/list-with-us')
    const section = visitor.locator('section', { has: visitor.getByRole('heading', { level: 2, name: 'Supply building materials?', exact: true }) })
    await expect(section).toBeVisible()
    await expect(section.getByText('Reach builders, homeowners and contractors across Ethiopia through HagerLand Supply.', { exact: true })).toBeVisible()
    await expect(section.getByRole('link', { name: 'Sell through HagerLand', exact: true })).toHaveAttribute('href', REGISTER)
    // The new section is the last one before the footer.
    expect(await visitor.evaluate(() => Array.from(document.querySelectorAll('main section')).filter((s) => !s.parentElement?.closest('main section')).at(-1)?.querySelector('h2')?.textContent)).toBe('Supply building materials?')
    await noHorizontalScroll(visitor)
    await section.getByRole('link', { name: 'Sell through HagerLand', exact: true }).click()
    await visitor.waitForURL(`**${REGISTER}`)
    await expect(visitor.getByRole('heading', { level: 1 })).toBeVisible()

    await visitor.goto('/')
    const card = visitor.locator('div.hl-blueprint', { has: visitor.getByRole('heading', { name: 'Are you a professional or supplier? Reach customers across Ethiopia and abroad.' }) })
    await expect(card.getByRole('link')).toHaveText(['List your business', 'Browse professionals', 'Sell through HagerLand'])
    await expect(card.getByRole('link', { name: 'Sell through HagerLand' })).toHaveAttribute('href', REGISTER)
    // The rest of the homepage as before: row 2 with its three register buttons, one "Sell through HagerLand" heading.
    await expect(visitor.getByRole('heading', { name: 'Sell through HagerLand' })).toHaveCount(1)
    await expect(visitor.locator(`a[href^="${REGISTER}?role="]`)).toHaveCount(3)
    await expect(visitor.locator(`a[href="${REGISTER}"]`)).toHaveCount(1)
    await noHorizontalScroll(visitor)
    await card.getByRole('link', { name: 'Sell through HagerLand' }).click()
    await visitor.waitForURL(`**${REGISTER}`)
    await visitor.close()
  }
})

test('with the homepage row switch off, or registration off, both new links are hidden', async ({ page, browser }) => {
  test.setTimeout(240_000)
  for (const off of ['Homepage “Sell through HagerLand” row', 'Partner registration']) {
    await supplySwitch(page, 'Partner registration', true)
    await supplySwitch(page, 'Homepage “Sell through HagerLand” row', true)
    await supplySwitch(page, off, false)
    const visitor = await visitorAt(browser, 375)
    await visitor.goto('/list-with-us')
    await expect(visitor.getByRole('heading', { name: 'List with HagerLand', level: 1 })).toBeVisible()
    await expect(visitor.getByText('Supply building materials?')).toHaveCount(0)
    await visitor.goto('/')
    await expect(visitor.getByRole('link', { name: 'List your business' })).toBeVisible()
    await expect(visitor.getByRole('link', { name: 'Sell through HagerLand' })).toHaveCount(0)
    await expect(visitor.locator(`a[href^="${REGISTER}"]`)).toHaveCount(0)
    await visitor.close()
  }
})

test('Property hub: "Book a market appraisal"', async ({ browser }) => {
  for (const width of WIDTHS) {
    const visitor = await visitorAt(browser, width)
    await visitor.goto('/buy')
    await expect(visitor.getByRole('link', { name: /Book a market appraisal/ }).first()).toHaveAttribute('href', '/agency/valuation')
    await expect(visitor.getByText('Book a valuation')).toHaveCount(0)
    await visitor.close()
  }
})

test('signed in: the account agency page says "market appraisal", before and after booking one', async ({ browser }) => {
  test.setTimeout(180_000)
  const user = await createUser({ name: 'Almaz Appraisal' })
  const page = await browser.newPage({ viewport: { width: 375, height: 900 } })
  await signIn(page, user.email, user.password)
  await page.goto('/account/agency')
  await expect(page.getByText('Book a market appraisal, or a viewing on a property marketed by HagerLand, and you can follow it here.')).toBeVisible()
  await page.getByRole('link', { name: 'Book a market appraisal', exact: true }).click()
  await page.waitForURL('**/agency/valuation')
  await page.getByLabel('Type of property').selectOption('villa')
  await page.getByLabel('Where is it?').fill('Bole')
  await page.getByRole('option', { name: /^Bole/ }).first().click()
  await page.getByLabel('Your name').fill('Almaz Appraisal')
  await page.locator('input[id$="-phone"]').fill('911223344')
  await page.locator('input[name="email"]').fill(user.email)
  await page.getByLabel('Best times to call you').fill('QC-3 mornings')
  await tickTransferConsent(page)
  await page.getByRole('button', { name: 'Book my market appraisal' }).click()
  await expect(page.getByText('Market appraisal requested')).toBeVisible()
  await page.goto('/account/agency')
  await expect(page.getByRole('heading', { name: 'Market appraisals', level: 2 })).toBeVisible()
  await expect(page.getByText('Market appraisal for sale', { exact: true })).toBeVisible()
  await expect(page.locator('main')).not.toContainText(/valuation/i)
  await noHorizontalScroll(page)
  await page.close()
})

test('call-back form: nothing chosen at first (English and /am); language and time still required; a full answer is saved as before', async ({ page, browser }) => {
  test.setTimeout(300_000)
  await jobsSwitch(page, 'Call-back requests', true)
  await db().from('rate_limits').delete().like('key', 'callback:%')
  for (const width of WIDTHS) {
    const visitor = await visitorAt(browser, width)
    await visitor.goto('/jobs/call-back')
    await expect(visitor.locator('input[type="radio"]')).toHaveCount(8)
    await expect(visitor.locator('input[type="radio"]:checked')).toHaveCount(0)
    await expect(visitor.locator('input[type="checkbox"]:checked')).toHaveCount(0)
    await noHorizontalScroll(visitor)
    await visitor.close()
  }

  const visitor = await visitorAt(browser, 375)
  await visitor.goto('/jobs/call-back')
  const phone = randomPhone()
  const e164 = `+251${phone.slice(1)}`
  await visitor.getByLabel('Your name').fill('E2E QC3 Caller')
  await visitor.locator('#cb-phone').fill(phone)
  await visitor.getByLabel('What do you need?').fill('Five carpenters in Bole.')
  await visitor.getByLabel('Area').fill('Bole')
  await visitor.getByLabel('HagerLand may call me on this number about my request.').check()
  await tickTransferConsent(visitor)
  // Nothing chosen: refused with the form's existing message, both groups outlined, nothing saved, typed values kept.
  await visitor.getByRole('button', { name: 'Ask for a call' }).click()
  await expect(visitor.getByText('Please check the highlighted fields.')).toBeVisible()
  await expect(visitor.locator('fieldset[aria-invalid="true"]')).toHaveCount(2)
  await expect(visitor.getByLabel('Your name')).toHaveValue('E2E QC3 Caller')
  expect((await db().from('callback_requests').select('id').eq('phone', e164)).data ?? []).toHaveLength(0)
  // Chosen: saved exactly as before.
  await visitor.locator('fieldset', { hasText: 'Language for the call' }).getByText('Afaan Oromo', { exact: true }).click()
  await visitor.locator('fieldset', { hasText: 'Best time to call' }).getByText('Morning', { exact: true }).click()
  await visitor.getByRole('button', { name: 'Ask for a call' }).click()
  await expect(visitor.getByText("Thank you. HagerLand's recruitment team will call you. If you miss the call, you can ask again later.")).toBeVisible()
  const { data: rows } = await db().from('callback_requests').select('language, time_of_day, country_code, status').eq('phone', e164)
  expect(rows).toEqual([{ language: 'om', time_of_day: 'morning', country_code: null, status: 'open' }])
  await db().from('callback_requests').delete().eq('phone', e164)
  await visitor.close()

  // The Amharic for Jobs version is the same form: nothing chosen at first.
  await jobsSwitch(page, 'Amharic for Jobs', true)
  await expect.poll(async () => (await page.request.get('/am/jobs/call-back')).status(), { timeout: 90_000, intervals: [5_000] }).toBe(200)
  const am = await visitorAt(browser, 375)
  await am.goto('/am/jobs/call-back')
  await expect(am.locator('input[type="radio"]')).toHaveCount(8)
  await expect(am.locator('input[type="radio"]:checked')).toHaveCount(0)
  await expect(am.locator('input[type="checkbox"]:checked')).toHaveCount(0)
  await am.close()
  await jobsSwitch(page, 'Amharic for Jobs', false)
  await jobsSwitch(page, 'Call-back requests', false)
})
