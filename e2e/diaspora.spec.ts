import { expect, test } from '@playwright/test'
import { adminSession, asFreshVisitor, db, mailWithSubject, testPhotos, uniqueEmail, tickTransferConsent } from './helpers'

/** Diaspora Services and HagerLand Property Care (spec 24.6). */

test('the diaspora page offers both directions and links into the live services', async ({ page }) => {
  await page.goto('/diaspora')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Your bridge to property in Ethiopia.')
  await expect(page.getByRole('link', { name: /Build a house/ })).toHaveAttribute('href', '/build/project')
  await expect(page.getByRole('link', { name: /Verification and due diligence/ })).toHaveAttribute('href', '/request-service/property-inspections')
  await expect(page.getByRole('link', { name: /Property management/ }).first()).toHaveAttribute('href', '/diaspora/property-care')
  await expect(page.locator('main').getByRole('link', { name: /^Finance.*Soon/ })).toBeVisible()
  await expect(page.getByRole('link', { name: 'United Kingdom' })).toHaveAttribute('href', '/diaspora/services-abroad?country=GB')
})

test('services abroad finds an Ethiopian-run business by country, city and service, and offers a request when there is none', async ({ page }, info) => {
  const stamp = Date.now()
  const d = db()
  // A different city per device, so search results cached by the other device's run never apply.
  const path = info.project.name === 'desktop' ? 'united-kingdom/birmingham' : 'united-kingdom/manchester'
  const [{ data: city }, { data: svc }] = await Promise.all([d.from('locations').select('id, path').eq('path', path).single(), d.from('service_categories').select('id').eq('slug', 'electricians').single()])
  const { data: org } = await d.from('organisations').insert({ kind: 'sole_trader', name: `E2E London Electrics ${stamp}`, slug: `e2e-london-electrics-${stamp}`, location_id: city!.id, serves_diaspora: true, source: 'admin', status: 'published' }).select('id').single()
  await d.from('organisation_services').insert({ org_id: org!.id, service_id: svc!.id })
  try {
    // Directory results are cached for up to 5 minutes: a run repeated within that time waits for fresh results.
    test.setTimeout(420_000)
    await expect(async () => {
      await page.goto(`/diaspora/services-abroad?country=GB&city=${city!.path}&service=electricians`)
      await expect(page.getByRole('link', { name: `E2E London Electrics ${stamp}` })).toBeVisible({ timeout: 3_000 })
    }).toPass({ timeout: 330_000, intervals: [10_000] })
    await expect(page.getByRole('link', { name: /Get quotes/ })).toHaveAttribute('href', '/request-service/electricians?abroad=1')
    await page.goto('/diaspora/services-abroad?country=KE&service=electricians')
    await expect(page.getByText(/No businesses listed in Kenya yet/)).toBeVisible()
    await expect(page.locator('main').getByRole('link', { name: 'Request a service' })).toHaveAttribute('href', '/request-service/electricians?abroad=1')
  } finally {
    await d.from('organisations').delete().eq('id', org!.id)
  }
})

test('an owner abroad requests a Property Care consultation; HagerLand moves it through the pipeline and keeps records', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(180_000)
  const owner = await browser.newPage()
  await asFreshVisitor(owner)
  const email = uniqueEmail('owner')
  await owner.goto('/diaspora/property-care')
  await expect(owner.getByRole('heading', { level: 1 })).toHaveText('Your property in Ethiopia, properly looked after.')
  await expect(owner.getByRole('heading', { name: 'Prices' })).toHaveCount(0)
  await owner.getByLabel('Your name').fill('Almaz Abroad')
  await owner.getByLabel('Email').fill(email)
  await owner.locator('#pc-phone').fill('+447700900456')
  await owner.getByLabel('Country you live in').selectOption('GB')
  await owner.locator('#pc-city').fill('London')
  await owner.locator('#pc-loc').fill('Bole')
  await owner.getByRole('option', { name: /^Bole/ }).first().click()
  await owner.getByLabel('Type of property').selectOption('apartment')
  await owner.getByLabel('Who uses it now?').selectOption('tenanted')
  await owner.getByLabel('Inspections with photo reports').check()
  await owner.getByLabel('Rent collection').check()
  await tickTransferConsent(owner)
  await owner.getByRole('button', { name: 'Request a consultation' }).click()
  await expect(owner.getByText('Thank you, we will be in touch')).toBeVisible()
  const { data: lead } = await db().from('property_care_requests').select('id, reference, services, country_code, status').eq('email', email).single()
  expect(lead).toMatchObject({ services: ['inspections', 'rent_collection'], country_code: 'GB', status: 'new' })
  await mailWithSubject(email, lead!.reference)
  await mailWithSubject('admin@test.hagerland.invalid', `Property Care consultation ${lead!.reference}`)

  await adminSession(page)
  await page.goto('/roodber8/property-care')
  await page.getByRole('link', { name: lead!.reference }).click()
  await page.getByLabel('Stage').selectOption('consultation_booked')
  await page.getByLabel('Private notes').fill('Call booked for Tuesday 7pm London time')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText('Saved.')).toBeVisible()
  await page.getByRole('button', { name: 'Create managed property' }).click()
  await page.waitForURL(/\/roodber8\/managed-properties\//)
  const mpId = page.url().split('/').pop() ?? ''

  const [photo] = await testPhotos(1)
  await page.locator('input[type=file]').first().setInputFiles(photo)
  await expect(page.getByText('photo-0.jpg')).toBeVisible({ timeout: 20_000 })
  // The photo's field is added once its upload has finished (sending earlier is refused with a message).
  await expect(page.locator('[data-uploading="true"]')).toHaveCount(0, { timeout: 20_000 })
  await page.locator('#in-cond').selectOption('needs_attention')
  await page.locator('#in-notes').fill('Damp patch in the bathroom ceiling.')
  await page.getByRole('button', { name: 'Add inspection', exact: true }).click()
  await expect(page.getByText('Inspection added.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Photo 1' })).toBeVisible()

  await page.locator('#st-from').fill('2026-09-01')
  await page.locator('#st-to').fill('2026-09-30')
  await page.locator('#st-due').fill('30000')
  await page.locator('#st-rec').fill('30000')
  await page.locator('#st-exp').fill('2500')
  await page.locator('#st-fee').fill('3000')
  await page.getByRole('button', { name: 'Add statement', exact: true }).click()
  await expect(page.getByText('Statement added.')).toBeVisible()
  await expect(page.getByText('ETB 24,500')).toBeVisible()

  await page.locator('#ml-title').fill('Fixed bathroom leak')
  await page.locator('#ml-cost').fill('1200')
  await page.getByRole('button', { name: 'Add entry', exact: true }).click()
  await expect(page.getByText('Maintenance entry added.')).toBeVisible()

  const [{ count: inspections }, { data: req }] = await Promise.all([
    db().from('property_inspections').select('id', { count: 'exact', head: true }).eq('managed_property_id', mpId),
    db().from('property_care_requests').select('status').eq('id', lead!.id).single(),
  ])
  expect(inspections).toBe(1)
  expect(req?.status).toBe('won')
  await db().from('managed_properties').delete().eq('id', mpId)
  await db().from('property_care_requests').delete().eq('id', lead!.id)
})

test('Property Care prices appear only once set in admin settings', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  await adminSession(page)
  await page.goto('/roodber8/settings')
  await page.getByLabel('Property Care prices').fill('From ETB 4,000 a month for one apartment.')
  await page.getByLabel('Property Care prices').locator('xpath=ancestor::form').getByRole('button').last().click()
  await expect(page.getByText(/Saved/).first()).toBeVisible()
  await page.goto('/diaspora/property-care')
  await expect(page.getByText('From ETB 4,000 a month for one apartment.')).toBeVisible()
  await page.goto('/roodber8/settings')
  await page.getByLabel('Property Care prices').fill('')
  await page.getByLabel('Property Care prices').locator('xpath=ancestor::form').getByRole('button').last().click()
  await expect(page.getByText(/Saved/).first()).toBeVisible()
})
