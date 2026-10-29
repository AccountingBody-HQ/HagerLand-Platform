import { expect, test, type Page } from '@playwright/test'
import { asFreshVisitor, db, mailWithSubject, randomPhone, uniqueEmail } from './helpers'

/** Jobs Phase 1b: what happens next after a staffing requirement (thank-you page, email, tab title). */

const NEXT = "HagerLand's recruitment team will contact you to talk about the roles and agree the fee in writing before we start."
const PROVIDERS = 'We check your request and match it with up to three suitable providers at a time.'
const PROVIDERS_EMAIL = 'We will match it with up to three suitable providers at a time. Each one contacts you directly, and their quotes appear on your request page.'

async function send(page: Page, slug: string, fill: (p: Page) => Promise<void>) {
  const title = `E2E 1b ${slug} ${Date.now()}`
  const email = uniqueEmail(`p1b-${slug}`)
  await page.goto(`/request-service/${slug}`)
  await fill(page)
  await page.getByLabel('Give your request a short title').fill(title)
  await page.locator('#sr-location').fill('Bole')
  await page.getByRole('option', { name: /^Bole/ }).first().click()
  await page.getByLabel('Your name').fill('Tigist Customer')
  await page.locator('#sr-phone').fill(randomPhone())
  await page.getByLabel('Email').fill(email)
  await page.getByRole('button', { name: 'Send my request' }).click()
  await page.waitForURL('**/request-service/sent?ref=*')
  const { data } = await db().from('service_requests').select('id, reference').eq('title', title).single()
  return { id: data!.id as string, reference: data!.reference as string, email }
}

test('staffing: tab title, thank-you page and confirmation email say HagerLand’s recruitment team handles it; no provider is matched', async ({ page }) => {
  await asFreshVisitor(page)
  await page.goto('/request-service/staffing')
  await expect(page).toHaveTitle(/^Submit a staffing requirement \| HagerLand$/)
  const r = await send(page, 'staffing', async (p) => {
    await p.getByLabel('Which roles do you need to fill?').fill('Ten masons')
    await p.getByLabel('How many people?').fill('10')
    await p.getByText('Temporary or day labour', { exact: true }).click()
    await p.getByLabel('Describe the roles and the work').fill('Block work on a G+2 house in Bole.')
  })
  expect(new URL(page.url()).searchParams.get('for')).toBe('staffing')
  await expect(page.getByText(`1. ${NEXT}`)).toBeVisible()
  expect(await page.content()).not.toContain('up to three')
  const mail = await mailWithSubject(r.email, r.reference)
  expect(mail.subject).toBe(`We've received your request (${r.reference})`)
  expect(mail.text).toContain(NEXT)
  expect(mail.text).not.toContain('up to three')
  await mailWithSubject('inbox@test.hagerland.invalid', r.reference)
  // No automatic matching: the request waits for HagerLand in admin, offered to nobody.
  const { data: matches } = await db().from('service_request_matches').select('id').eq('request_id', r.id)
  expect(matches ?? []).toHaveLength(0)
  expect((await db().from('service_requests').select('status').eq('id', r.id).single()).data?.status).toBe('submitted')
})

test('other services keep the provider wording on the thank-you page and in the email', async ({ page }) => {
  await asFreshVisitor(page)
  for (const slug of ['plumbers', 'renovation', 'house-builders']) {
    await page.goto(`/request-service/${slug}`)
    await expect(page).toHaveTitle(/^Request .+ \| HagerLand$/)
    const r = await send(page, slug, async (p) => {
      if (slug === 'house-builders') await p.getByText('New build', { exact: true }).click()
      await p.getByLabel('Describe what you need').fill('Work on a house in Bole, details to follow.')
    })
    expect(new URL(page.url()).searchParams.get('for')).toBeNull()
    await expect(page.getByText(`1. ${PROVIDERS}`)).toBeVisible()
    await expect(page.getByText('2. Providers who accept it contact you directly and send a quote.')).toBeVisible()
    expect(await page.content()).not.toContain('recruitment team')
    const mail = await mailWithSubject(r.email, r.reference)
    expect(mail.text).toContain(PROVIDERS_EMAIL)
    expect(mail.text).not.toContain('recruitment team')
    expect((await db().from('service_request_matches').select('id').eq('request_id', r.id)).data ?? []).toHaveLength(0)
  }
  // A crafted ?for= value other than staffing changes nothing.
  await page.goto('/request-service/sent?ref=HLS-2026-000001&for=plumbers')
  await expect(page.getByText(`1. ${PROVIDERS}`)).toBeVisible()
})

test('staffing thank-you page in a plain 375 px window: no sideways scroll', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 375, height: 800 } })
  const page = await ctx.newPage()
  await page.goto('/request-service/sent?ref=HLS-2026-000001&for=staffing')
  await expect(page.getByText(`1. ${NEXT}`)).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)
  await ctx.close()
})
