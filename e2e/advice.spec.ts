import { expect, test } from '@playwright/test'
import { adminSession, asFreshVisitor, db, latestMail, seedPublishedProperty, uniqueEmail, tickTransferConsent } from './helpers'

/** Knowledge & Advice (spec 26.10): market insight, area guides, checklists and glossary drafts, newsletter. */

test.describe.configure({ mode: 'serial' })

test('market insight shows asking-price medians once enough listings exist, always labelled as not valuations', async ({ page, request }) => {
  for (let i = 0; i < 5; i++) await seedPublishedProperty({ purpose: 'rent', locationPath: 'addis-ababa/bole', title: `E2E insight rent ${i} ${Date.now()}`, price: 20_000 + i * 1000 })
  const res = await request.get('/api/cron/daily', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })
  expect(res.status()).toBe(200)
  const { data } = await db().from('market_insight').select('sample_count, median_etb').eq('purpose', 'rent').eq('property_type', 'apartment').is('location_id', null).single()
  expect(data!.sample_count).toBeGreaterThanOrEqual(5)
  await page.goto('/advice/market-insight?purpose=rent')
  await expect(page.getByText('Based on asking prices on HagerLand — not valuations').first()).toBeVisible()
  await expect(page.getByRole('table').first()).toContainText('Apartment')
  await expect(page.getByRole('cell', { name: /\/month$/ }).first()).toBeVisible()
})

test('checklists and glossary are drafts for AB: pages stay honest and unindexed until a guide is published', async ({ page }) => {
  const { data: drafts } = await db().from('guides').select('slug, status, needs_review, topic').in('slug', ['buying-checklist', 'renting-checklist', 'building-checklist', 'selling-checklist', 'property-glossary', 'renting-a-home-a-guide-for-tenants'])
  expect(drafts).toHaveLength(6)
  expect(drafts!.every((g) => g.status === 'draft' && g.needs_review)).toBe(true)
  await page.goto('/advice/glossary')
  await expect(page.getByText('Our glossary is being reviewed and will appear here.')).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  // A draft still marked "needs review" can never be published (database rule).
  const { error } = await db().from('guides').update({ status: 'published', published_at: new Date().toISOString() }).eq('slug', 'property-glossary')
  expect(error?.message).toContain('guides_reviewed_before_publishing')
})

test('area guide: notes and FAQs written in admin appear with the market figures on the place page', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  await adminSession(page)
  await page.goto('/roodber8/area-guides')
  await page.getByLabel('Place', { exact: true }).fill('Bole')
  await page.getByRole('option', { name: /^Bole/ }).first().click()
  await page.getByLabel('Local notes').fill('Bole is close to the airport, with many apartments and offices.')
  await page.getByLabel('FAQs').fill('Is Bole busy?\nYes, especially around Bole Road at rush hour.')
  await page.getByLabel('Publish on the place’s property pages').check()
  await page.getByRole('button', { name: 'Save area guide' }).click()
  await expect(page.getByText(/Saved the area guide for Bole/)).toBeVisible()
  await page.goto('/property/to-rent/addis-ababa/bole')
  const area = page.getByRole('region', { name: /About Bole/ })
  await expect(area).toContainText('close to the airport')
  await expect(area).toContainText('Is Bole busy?')
  await expect(area).toContainText('not valuations')
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents()
  expect(ld.filter((t) => t.includes('"FAQPage"'))).toHaveLength(1)
})

test('newsletter: separate consent is required and recorded; unsubscribe is one click', async ({ page }) => {
  await asFreshVisitor(page)
  const email = uniqueEmail('news')
  await page.goto('/advice')
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Sign up' }) })
  await page.locator('#nl-email').fill(email)
  await tickTransferConsent(form)
  await form.getByRole('button', { name: 'Sign up' }).click()
  await expect(form.getByText('Tick the box to agree to receive the newsletter')).toBeVisible()
  await form.getByRole('checkbox', { name: /email me HagerLand/ }).check()
  await tickTransferConsent(form)
  await form.getByRole('button', { name: 'Sign up' }).click()
  await expect(page.getByText('Thank you. Check your email for a confirmation.')).toBeVisible()
  const { data } = await db().from('newsletter_subscriptions').select('status, consent_text').eq('email', email).single()
  expect(data?.status).toBe('subscribed')
  expect(data?.consent_text).toContain('I can unsubscribe at any time')
  const mail = await latestMail(email)
  const link = /\/newsletter\/unsubscribe\?token=[A-Za-z0-9_-]+/.exec(mail.text)?.[0]
  expect(link).toBeTruthy()
  await page.goto(link!)
  await page.getByRole('button', { name: 'Unsubscribe' }).click()
  await expect(page.getByText('You are unsubscribed.')).toBeVisible()
  expect((await db().from('newsletter_subscriptions').select('status').eq('email', email).single()).data?.status).toBe('unsubscribed')
})
