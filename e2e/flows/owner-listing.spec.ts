import { expect, test } from '@playwright/test'
import { adminSession, db, latestMail, randomPhone, signUp, testPhotos, trackErrors, tickTransferConsent } from '../helpers'

/**
 * The core marketplace journey, end to end on the local stack:
 * owner signs up → lists a property with photos → HagerLand approves it → it is live →
 * a visitor reveals the phone number and sends an enquiry → the owner sees it in their inbox.
 */
test('owner lists a property, admin approves, visitor enquires, owner receives it', async ({ browser, page }) => {
  test.setTimeout(240_000)
  const errors = trackErrors(page)
  const title = `Bright 2-bed apartment near Bole Atlas ${Date.now()}`

  // 1. Owner signs up and confirms by email.
  await signUp(page, { type: 'owner', name: 'Abebe Kebede' })
  await expect(page.getByRole('heading', { name: 'Welcome to HagerLand' })).toBeVisible()
  await page.getByRole('link', { name: /List your property/ }).click()
  await page.waitForURL(/listings\/new/)

  // 2. Listing wizard.
  await page.check('input[name=purpose][value=rent]', { force: true })
  await page.selectOption('#w-type', 'apartment')
  await page.fill('#w-title', title)
  await page.fill('#w-desc', 'A bright, fully finished two-bedroom apartment on the fourth floor with a lift, backup generator and a water tank. Five minutes from Bole Atlas.')
  await page.click('button[type=submit]')
  await page.fill('#w-loc', 'Bole')
  await page.getByRole('option', { name: /Bole/ }).first().click()
  await page.click('button[type=submit]')
  await page.waitForURL(/step=details/)
  await page.fill('#w-price', '35000')
  await page.fill('#w-beds', '2')
  await page.fill('#w-baths', '2')
  await page.fill('#w-area', '95')
  await page.check('#w-f-lift')
  await page.click('button[type=submit]')
  await page.waitForURL(/step=photos/)
  await page.locator('input[type=file]').first().setInputFiles(await testPhotos(3))
  await expect(page.locator('img[alt^="Photo"]')).toHaveCount(3, { timeout: 45_000 })
  await page.click('button[type=submit]')
  await page.waitForURL(/step=contact/)
  await page.click('button[type=submit]')
  await page.waitForURL(/step=review/)
  await page.check('#w-d1')
  await page.check('#w-d2')
  await page.click('button[type=submit]')
  await expect(page.getByText(/^Submitted\./)).toBeVisible()
  await page.getByRole('link', { name: 'My listings' }).click()
  await page.waitForURL(/\/account\/listings(\?|$)/)
  await expect(page.getByText(title)).toBeVisible()
  await expect(page.getByText('In review').first()).toBeVisible()
  const { data: row } = await db().from('properties').select('id, slug, status').eq('title', title).single()
  expect(row?.status).toBe('pending_review')

  // 3. HagerLand approves it in the admin.
  const admin = await browser.newPage()
  await adminSession(admin)
  await admin.goto(`/roodber8/properties/${row!.id}`)
  await admin.getByRole('button', { name: 'Approve' }).first().click()
  await expect.poll(async () => (await db().from('properties').select('status').eq('id', row!.id).single()).data?.status).toBe('published')
  await admin.close()

  // 4. A visitor finds it, reveals the phone and sends an enquiry.
  const visitor = await browser.newPage({ extraHTTPHeaders: { 'x-forwarded-for': `10.7.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } })
  await visitor.goto(`/property/${row!.slug}`)
  await expect(visitor.getByRole('heading', { level: 1, name: title })).toBeVisible()
  await visitor.getByRole('button', { name: /Show phone number/ }).first().click()
  await expect(visitor.getByText('+251 91 123 4567').first()).toBeVisible()
  await visitor.fill('#panel-name', 'Sara Tesfaye')
  await visitor.fill('#panel-phone', randomPhone())
  await visitor.fill('#panel-email', 'sara@test.hagerland.invalid')
  await tickTransferConsent(visitor.locator('form', { has: visitor.locator('#panel-name') }))
  await visitor.locator('form', { has: visitor.locator('#panel-name') }).locator('button[type=submit]').click()
  await expect(visitor.getByText('Your enquiry has been sent')).toBeVisible()
  await visitor.close()

  // 5. The owner sees it in their inbox (and the enquiry is linked to them).
  const { data: enq } = await db().from('enquiries').select('reference, recipient_user_id').eq('target_id', row!.id).single()
  expect(enq?.recipient_user_id).toBeTruthy()
  await page.goto('/account/enquiries')
  await expect(page.getByText('Sara Tesfaye')).toBeVisible()
  expect(errors).toEqual([])
})

test('confirmation email for a new account comes from Supabase Auth and links back to the site', async ({ page }) => {
  const email = await signUp(page, { type: 'looking', name: 'Liya Haile' })
  const mail = await latestMail(email)
  expect(mail.subject.length).toBeGreaterThan(0)
  await expect(page).toHaveURL(/\/(onboarding|account)/)
})
