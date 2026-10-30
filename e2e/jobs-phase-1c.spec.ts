import { expect, test, type Page } from '@playwright/test'
import { adminSession, asFreshVisitor, createUser, db, linkMatching, mailWithSubject, randomPhone, uniqueEmail, tickTransferConsent } from './helpers'

/** Jobs Phase 1c: a staffing customer never sees provider or quote wording; every other service is unchanged. */

const NEXT = "HagerLand's recruitment team will contact you to talk about the roles and agree the fee in writing before we start."
const STATUSES = ['submitted', 'triaged', 'matched', 'quoted', 'won', 'lost', 'cancelled'] as const
const STAFFING_LABELS = ['Received', 'With our recruitment team', 'In progress', 'In progress', 'Completed', 'Closed', 'Cancelled']
const DEFAULT_LABELS = ['Received', 'Being matched', 'Sent to providers', 'Quotes received', 'Provider chosen', 'Closed', 'Cancelled']

async function send(page: Page, slug: string, email: string) {
  const title = `E2E 1c ${slug} ${Date.now()}`
  await page.goto(`/request-service/${slug}`)
  if (slug === 'staffing') {
    await page.getByLabel('Which roles do you need to fill?').fill('Ten masons')
    await page.getByLabel('How many people?').fill('10')
    await page.getByText('Temporary or day labour', { exact: true }).click()
    await page.getByLabel('Describe the roles and the work').fill('Block work on a G+2 house in Bole.')
  } else {
    if (slug === 'house-builders') await page.getByText('New build', { exact: true }).click()
    await page.getByLabel('Describe what you need').fill('Work on a house in Bole, details to follow.')
  }
  await page.getByLabel('Give your request a short title').fill(title)
  await page.locator('#sr-location').fill('Bole')
  await page.getByRole('option', { name: /^Bole/ }).first().click()
  await page.getByLabel('Your name').fill('Tigist Customer')
  await page.locator('#sr-phone').fill(randomPhone())
  await page.getByLabel('Email').fill(email)
  await tickTransferConsent(page)
  await page.getByRole('button', { name: 'Send my request' }).click()
  await page.waitForURL('**/request-service/sent?ref=*')
  const { data } = await db().from('service_requests').select('id, reference').eq('title', title).single()
  return { id: data!.id as string, reference: data!.reference as string }
}

/** Visible text of the main content only (no scripts), lower-cased. */
async function mainText(page: Page) {
  return (await page.locator('main').innerText()).toLowerCase()
}

async function setStatus(id: string, status: string) {
  await db().from('service_requests').update({ status, ...(['lost', 'cancelled'].includes(status) ? { closed_reason: 'other', closed_at: new Date().toISOString() } : {}) }).eq('id', id)
}

async function resendLink(page: Page, email: string, reference: string) {
  await page.goto('/requests/resend')
  await page.locator('#rl-email').fill(email)
  await page.locator('#rl-ref').fill(reference)
  await page.getByRole('button', { name: 'Email me a new link' }).click()
  await expect(page.getByText('If the details match a request, we have emailed a new link.')).toBeVisible()
  return mailWithSubject(email, `Your link to request ${reference}`)
}

test('staffing guest: thank-you steps, both emails, private request page and every status label', async ({ page }) => {
  test.setTimeout(180_000)
  await asFreshVisitor(page)
  const email = uniqueEmail('p1c-guest')
  const r = await send(page, 'staffing', email)
  await expect(page.getByText(`1. ${NEXT}`)).toBeVisible()
  await expect(page.getByText('2. We look for suitable candidates and introduce only people who have agreed to be introduced.')).toBeVisible()
  await expect(page.getByText('3. We have emailed you a private link to follow your request.')).toBeVisible()
  expect(await mainText(page)).not.toMatch(/provider|quote/)

  const mail = await mailWithSubject(email, r.reference)
  expect(mail.html).toContain('Your request is with HagerLand')
  expect(`${mail.html} ${mail.text}`.toLowerCase()).not.toMatch(/provider|quote/)

  const link = new URL(linkMatching(mail.html, /\/requests\//))
  await page.goto(`${link.pathname}${link.search}`)
  await expect(page.getByRole('heading', { name: 'Next steps' })).toBeVisible()
  await expect(page.getByText('With our recruitment team').first()).toBeVisible()
  await expect(page.getByText(NEXT)).toBeVisible()
  expect(await mainText(page)).not.toMatch(/provider|quote/)
  for (const [i, s] of STATUSES.entries()) {
    await setStatus(r.id, s)
    await page.reload()
    await expect(page.locator('main header').getByText(STAFFING_LABELS[i], { exact: true }), s).toBeVisible()
    if (s === 'lost' || s === 'cancelled') await expect(page.getByText('Closed', { exact: true }).first()).toBeVisible()
    expect(await mainText(page), s).not.toMatch(/provider|quote/)
  }

  const fresh = await resendLink(page, email, r.reference)
  expect(fresh.html).toContain('A new link to view your request.')
  expect(fresh.html).toContain(`Use the button to see request ${r.reference}. The link works for 30 days. Older links no longer work.`)
  expect(`${fresh.html} ${fresh.text}`.toLowerCase()).not.toMatch(/provider|quote/)
})

test('staffing signed in: thank-you step 3, account request page and request list', async ({ page }) => {
  test.setTimeout(180_000)
  await asFreshVisitor(page)
  const user = await createUser({ name: 'Staffing Customer' })
  await page.goto('/login')
  await page.fill('#login-email', user.email)
  await page.fill('#login-password', user.password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.waitForURL((u) => u.pathname.startsWith('/account') || u.pathname.startsWith('/onboarding'))
  const r = await send(page, 'staffing', user.email)
  await expect(page.getByText('3. You can follow your request in your account.')).toBeVisible()
  expect(await mainText(page)).not.toMatch(/provider|quote/)
  await page.goto(`/account/service-requests/${r.id}`)
  await expect(page.getByRole('heading', { name: 'Next steps' })).toBeVisible()
  await expect(page.getByText(NEXT)).toBeVisible()
  await setStatus(r.id, 'matched')
  await page.reload()
  await expect(page.locator('main header').getByText('In progress', { exact: true })).toBeVisible()
  await page.goto('/account/service-requests')
  await expect(page.locator('li', { hasText: r.reference }).getByText('In progress', { exact: true })).toBeVisible()

  // The account version of the "new link" email.
  const fresh = await resendLink(page, user.email, r.reference)
  expect(fresh.html).toContain('A new link to view your request.')
  expect(fresh.html).toContain(`Use the button to see request ${r.reference}. The link works for 30 days. Older links no longer work.`)

  // Admin keeps its own labels.
  await adminSession(page)
  await page.goto(`/roodber8/service-requests/${r.id}`)
  await expect(page.locator('#sr-status')).toHaveValue('matched')
  expect(await page.locator('main').innerText()).not.toContain('In progress')
})

test('other services keep the provider and quote wording everywhere', async ({ page }) => {
  test.setTimeout(240_000)
  await asFreshVisitor(page)
  for (const slug of ['plumbers', 'renovation', 'house-builders']) {
    const email = uniqueEmail(`p1c-${slug}`)
    const r = await send(page, slug, email)
    await expect(page.getByText('2. Providers who accept it contact you directly and send a quote.')).toBeVisible()
    await expect(page.getByText('3. We have emailed you a private link where your quotes will appear. Choose the one you want.')).toBeVisible()
    const mail = await mailWithSubject(email, r.reference)
    expect(mail.html).toContain('We are finding the right providers for you.')
    expect(mail.html).not.toContain('recruitment team')
    const link = new URL(linkMatching(mail.html, /\/requests\//))
    await page.goto(`${link.pathname}${link.search}`)
    await expect(page.getByRole('heading', { name: 'Quotes', exact: true })).toBeVisible()
    await expect(page.getByText('No quotes yet')).toBeVisible()
    await expect(page.getByText('We are finding suitable providers. Quotes appear here and we email you each one.')).toBeVisible()
    if (slug === 'plumbers') {
      for (const [i, s] of STATUSES.entries()) {
        await setStatus(r.id, s)
        await page.reload()
        await expect(page.locator('main header').getByText(DEFAULT_LABELS[i], { exact: true }), s).toBeVisible()
      }
      const fresh = await resendLink(page, email, r.reference)
      expect(fresh.html).toContain('A new link to view your request and quotes.')
      expect(fresh.html).toContain(`Use the button to see request ${r.reference} and any quotes. The link works for 30 days. Older links no longer work.`)
    }
    expect(await mainText(page)).not.toContain('recruitment team')
  }
})

test('plain 375 px window: staffing thank-you and request pages have no sideways scroll', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } })
  const page = await ctx.newPage()
  await asFreshVisitor(page)
  const email = uniqueEmail('p1c-narrow')
  const r = await send(page, 'staffing', email)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
  const link = new URL(linkMatching((await mailWithSubject(email, r.reference)).html, /\/requests\//))
  await page.goto(`${link.pathname}${link.search}`)
  await expect(page.getByRole('heading', { name: 'Next steps' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
  await ctx.close()
})
