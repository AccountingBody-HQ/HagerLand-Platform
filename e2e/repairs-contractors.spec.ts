import { expect, test } from '@playwright/test'
import { asFreshVisitor, db, uniqueEmail } from './helpers'

/** Repairs & Maintenance and Contractors on the request engine (spec 24.5, PLATFORM_VISION §4–6). */

test('the repairs hub lists every repair service with a way to get quotes and an emergency route', async ({ page }) => {
  await page.goto('/repairs-maintenance')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Repairs and maintenance, without the search.')
  for (const name of ['Plumbing repairs', 'Electrical repairs', 'Roofing repairs', 'Painting & touch-ups', 'Appliance repair', 'Carpentry repairs', 'Locksmiths', 'Drainage', 'Cleaning', 'Landscaping & gardening', 'Pest control', 'Property inspections', 'General handyman', 'Preventative maintenance', 'Emergency repairs', 'Property refurbishment', 'Property management support']) {
    await expect(page.getByRole('link', { name: `Get quotes: ${name}` })).toBeVisible()
  }
  await expect(page.getByRole('link', { name: 'Emergency repair', exact: true })).toHaveAttribute('href', '/request-service/emergency-repairs')
})

test('an emergency plumbing repair asks its own questions, keeps answers on errors, and is stored as an emergency', async ({ page }) => {
  await asFreshVisitor(page)
  await page.goto('/request-service/plumbing-repairs')
  await expect(page.getByText('Emergency', { exact: true })).toBeVisible()
  await page.fill('#sr-title', 'Burst pipe in the bathroom')
  await page.fill('#sr-details', 'Water is pouring from a pipe behind the toilet.')
  await page.getByText('Emergency', { exact: true }).click()
  await page.fill('#sr-location', 'Bole')
  await page.getByRole('option', { name: /^Bole/ }).first().click()
  await page.fill('#sr-name', 'Kidist Emergency')
  await page.fill('#sr-phone', '0911667788')
  const email = uniqueEmail('emergency')
  await page.fill('#sr-email', email)
  await page.getByRole('button', { name: 'Send my request' }).click()
  await expect(page.getByText('Please answer this question').first()).toBeVisible()
  await expect(page.locator('#sr-title')).toHaveValue('Burst pipe in the bathroom')
  await page.getByText('Leak', { exact: true }).click()
  await page.getByRole('button', { name: 'Send my request' }).click()
  await page.waitForURL(/\/request-service\/sent/)
  const ref = new URL(page.url()).searchParams.get('ref') ?? ''
  const { data } = await db().from('service_requests').select('id, urgency, vertical_key, answers').eq('reference', ref).single()
  expect(data).toMatchObject({ urgency: 'emergency', vertical_key: 'repairs-maintenance', answers: { problem: 'Leak' } })
  await db().from('service_requests').delete().eq('id', data!.id)
})

test('the contractors hub offers building quotes with project questions, and links to the directory', async ({ page }) => {
  await page.goto('/contractors')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Builders and contractors, with quotes on request.')
  for (const name of ['House builders', 'General contractors', 'Renovation & remodelling', 'Electrical contractors', 'Plumbing contractors', 'Interior fit-out contractors', 'Groundworks contractors', 'Roofers', 'Tilers', 'HVAC & ventilation']) {
    await expect(page.getByRole('link', { name: `Get quotes: ${name}` })).toBeVisible()
  }
  await expect(page.getByRole('link', { name: 'Browse House builders' })).toHaveAttribute('href', '/professionals/house-builders')
  await page.getByRole('link', { name: 'Get quotes: House builders' }).click()
  await expect(page.getByText('What kind of project?')).toBeVisible()
  await expect(page.getByText('Do you have a building permit?')).toBeVisible()
  await expect(page.getByText('Emergency', { exact: true })).toHaveCount(0)
})

test('a professional profile shows qualifications', async ({ page }) => {
  const stamp = Date.now()
  const { data: org } = await db().from('organisations').insert({ kind: 'professional_firm', name: `E2E Qualified Engineers ${stamp}`, slug: `e2e-qualified-${stamp}`, qualifications: 'BSc Civil Engineering; registered structural engineer', source: 'admin', status: 'published' }).select('id, slug').single()
  await page.goto(`/company/${org!.slug}`)
  await expect(page.getByText('Qualifications and memberships')).toBeVisible()
  await expect(page.getByText('registered structural engineer')).toBeVisible()
  await db().from('organisations').delete().eq('id', org!.id)
})
