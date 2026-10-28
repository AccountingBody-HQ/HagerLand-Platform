import { expect, test, type Page } from '@playwright/test'
import { adminSession, asFreshVisitor, createProvider, db, linkMatching, mailWithSubject, signIn, testPhotos, uniqueEmail, randomPhone } from '../helpers'

/** Service request engine (spec 24.5): customer → HagerLand → provider → quote → choice. */

const QUESTIONS = JSON.stringify([
  { id: 'problem', label: 'What is the problem?', type: 'select', options: ['Leaking pipe', 'Blocked drain', 'New installation'], required: true },
  { id: 'floors', label: 'Which floor?', type: 'number' },
])

/** Sets the plumbers questions through the real admin editor (which also refreshes the public form). */
async function setPlumberQuestions(page: Page, json: string, emergency: boolean) {
  const { data: cat } = await db().from('service_categories').select('id').eq('slug', 'plumbers').single()
  await adminSession(page)
  await page.goto(`/roodber8/request-questions/${cat!.id}`)
  await page.getByLabel('Questions (JSON)').fill(json)
  const box = page.getByLabel('Customers can mark requests as an emergency')
  if ((await box.isChecked()) !== emergency) await box.click()
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByText(/Saved \d+ question/)).toBeVisible()
}

async function submitRequest(page: Page, email: string, opts: { emergency?: boolean; withFile?: boolean; phone?: string } = {}): Promise<string> {
  await page.goto('/request-service')
  await page.getByRole('link', { name: 'Plumbers' }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Request plumbers')
  await page.fill('#sr-title', 'Leaking pipe in the kitchen')
  await page.getByText('Leaking pipe', { exact: true }).click()
  await page.fill('#sr-q-floors', '2')
  await page.fill('#sr-details', 'Water is leaking under the kitchen sink of a two-storey house. Please bring parts.')
  if (opts.emergency) await page.getByText('Emergency', { exact: true }).click()
  await page.fill('#sr-location', 'Bole')
  await page.getByRole('option', { name: /^Bole/ }).first().click()
  if (opts.withFile) {
    const [photo] = await testPhotos(1)
    await page.locator('input[type=file]').setInputFiles(photo)
    await expect(page.getByRole('button', { name: /Remove/ })).toHaveCount(1, { timeout: 20_000 })
  }
  await page.fill('#sr-name', 'Hanna Customer')
  await page.fill('#sr-phone', opts.phone ?? randomPhone())
  await page.fill('#sr-email', email)
  await page.getByRole('button', { name: 'Send my request' }).click()
  await page.waitForURL(/\/request-service\/sent\?ref=HLS-/)
  const ref = new URL(page.url()).searchParams.get('ref') ?? ''
  await expect(page.getByText(ref)).toBeVisible()
  return ref
}

// Tidy T-2 (T2-14a): the Plumbers questions and the emergency option are put back as they were, through the same admin
// editor (which also refreshes the public form), so later tests (the English snapshot) see the usual form.
let original: { json: string; emergency: boolean } | null = null
test.beforeAll(async () => {
  const { data } = await db().from('service_categories').select('question_schema, allows_emergency').eq('slug', 'plumbers').single()
  original = { json: JSON.stringify(data?.question_schema ?? [], null, 2), emergency: Boolean(data?.allows_emergency) }
})
test.afterAll(async ({ browser }) => {
  if (!original) return
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await setPlumberQuestions(page, original.json, original.emergency)
  await page.close()
})

test('a guest requests a plumber, HagerLand matches a provider, the provider quotes and the guest chooses it', async ({ page, browser }) => {
  test.setTimeout(240_000)
  await setPlumberQuestions(page, QUESTIONS, true)
  await db().from('organisations').delete().like('name', 'E2E % Plumbing %')
  const proName = `E2E Fast Plumbing ${Date.now()}`
  const provider = await createProvider({ name: proName, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole', verified: true })

  const guest = await browser.newPage()
  await asFreshVisitor(guest)
  const email = uniqueEmail('requester')
  const phone = randomPhone()
  // Shown to the provider as +251 9X XXX XXXX once they accept.
  const shown = `+251 ${phone.slice(1, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`
  const ref = await submitRequest(guest, email, { emergency: true, withFile: true, phone })
  const { data: req } = await db().from('service_requests').select('id, status, urgency, answers, attachment_paths, country_code, currency').eq('reference', ref).single()
  expect(req).toMatchObject({ status: 'submitted', urgency: 'emergency', answers: { problem: 'Leaking pipe', floors: 2 }, country_code: 'ET', currency: 'ETB' })
  expect(req!.attachment_paths).toHaveLength(1)

  const received = await mailWithSubject(email, ref)
  expect(received.text).toContain('emergency')
  const firstLink = new URL(linkMatching(received.html, /\/requests\//)).pathname
  await guest.goto(firstLink)
  await expect(guest.getByText('No quotes yet')).toBeVisible()
  await expect(guest.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  const admin = await mailWithSubject('admin@test.hagerland.invalid', `EMERGENCY Service request ${ref}`)
  expect(admin.text).toContain('Leaking pipe')

  // HagerLand matches the provider from the suggestions.
  await page.goto('/roodber8/service-requests')
  await page.getByRole('link', { name: ref }).click()
  await page.getByRole('checkbox', { name: new RegExp(`^${proName}`) }).check()
  await page.getByRole('button', { name: /Send to 1 selected provider/ }).click()
  await expect(page.getByText(/Sent to 1 provider/)).toBeVisible()
  const { data: match } = await db().from('service_request_matches').select('id, status').eq('request_id', req!.id).single()
  expect(match?.status).toBe('offered')
  const offer = await mailWithSubject(provider.user.email, 'Emergency request')
  expect(new URL(linkMatching(offer.html, /\/account\/requests\//)).pathname).toBe(`/account/requests/${match!.id}`)

  // The provider accepts, sees the customer, and quotes.
  const pro = await browser.newPage()
  await signIn(pro, provider.user.email, provider.user.password)
  await pro.goto('/account/requests')
  await pro.getByRole('link', { name: /Leaking pipe in the kitchen/ }).click()
  await expect(pro.getByText(shown)).toHaveCount(0)
  await pro.getByRole('button', { name: 'Accept and see contact details' }).click()
  await expect(pro.getByText(shown)).toBeVisible()
  await expect(pro.getByRole('link', { name: 'File 1' })).toBeVisible()
  await pro.fill('#mq-amount', '25,000')
  await pro.fill('#mq-message', 'Replace the waste pipe and seal. Parts included.')
  await pro.fill('#mq-valid', new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10))
  await pro.getByRole('button', { name: 'Send quote' }).click()
  await expect(pro.getByText(/Quote sent. The customer has been emailed/)).toBeVisible()

  // The guest gets a fresh link with the quote; the first link no longer works.
  const quoteMail = await mailWithSubject(email, 'New quote')
  const link = new URL(linkMatching(quoteMail.html, /\/requests\//)).pathname
  expect(link).not.toBe(firstLink)
  expect((await guest.goto(firstLink))?.status()).toBe(404)
  await guest.goto(link)
  await expect(guest.getByText('ETB 25,000')).toBeVisible()
  await guest.getByRole('button', { name: 'Choose this quote' }).click()
  await guest.getByRole('button', { name: 'Yes, choose' }).click()
  await expect(guest.getByText(/^You chose E2E Fast Plumbing/)).toBeVisible()
  await expect(guest.getByText('You chose this quote')).toBeVisible()

  const [{ data: after }, { data: deal }] = await Promise.all([
    db().from('service_requests').select('status').eq('id', req!.id).single(),
    db().from('deals').select('status, value_minor, currency, source_type').eq('source_id', req!.id).single(),
  ])
  expect(after?.status).toBe('won')
  expect(deal).toMatchObject({ status: 'won', value_minor: 2_500_000, currency: 'ETB', source_type: 'service_request' })
  await mailWithSubject(provider.user.email, 'chose your quote')

  // HagerLand records its lead fee; providers never see these figures.
  await page.reload()
  await page.getByLabel('Lead fee (ETB)').fill('500')
  await page.getByRole('button', { name: 'Save', exact: true }).first().click()
  await expect(page.getByText('Saved.')).toBeVisible()
  const { data: fee } = await db().from('service_request_matches').select('lead_fee_minor').eq('id', match!.id).single()
  expect(fee?.lead_fee_minor).toBe(50_000)

  await db().from('service_requests').delete().eq('id', req!.id)
  await db().from('deals').delete().eq('source_id', req!.id)
  await db().from('organisations').delete().eq('id', provider.orgId)
  await setPlumberQuestions(page, '[]', false)
})

test('when every provider declines, the request goes back to HagerLand and admins are told', async ({ page, browser }) => {
  test.setTimeout(180_000)
  await setPlumberQuestions(page, '[]', false)
  const busyName = `E2E Busy Plumbing ${Date.now()}`
  const provider = await createProvider({ name: busyName, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  const guest = await browser.newPage()
  await asFreshVisitor(guest)
  const email = uniqueEmail('requester')
  await guest.goto('/request-service/plumbers')
  await guest.fill('#sr-title', 'New bathroom pipes')
  await guest.fill('#sr-details', 'Install new pipes for a bathroom in a new apartment.')
  await guest.fill('#sr-location', 'Bole')
  await guest.getByRole('option', { name: /^Bole/ }).first().click()
  await guest.fill('#sr-name', 'Dawit Customer')
  await guest.fill('#sr-phone', randomPhone())
  await guest.fill('#sr-email', email)
  await guest.getByRole('button', { name: 'Send my request' }).click()
  await guest.waitForURL(/\/request-service\/sent/)
  const ref = new URL(guest.url()).searchParams.get('ref') ?? ''
  const { data: req } = await db().from('service_requests').select('id').eq('reference', ref).single()

  await adminSession(page)
  await page.goto(`/roodber8/service-requests/${req!.id}?find=${encodeURIComponent(busyName)}`)
  await page.getByRole('checkbox', { name: new RegExp(`^${busyName}`) }).check()
  await page.getByRole('button', { name: /Send to 1 selected provider/ }).click()
  await expect(page.getByText(/Sent to 1 provider/)).toBeVisible()

  const pro = await browser.newPage()
  await signIn(pro, provider.user.email, provider.user.password)
  await pro.goto('/account/requests')
  await pro.getByRole('link', { name: /New bathroom pipes/ }).click()
  await pro.getByRole('button', { name: "I can't take this on" }).click()
  await pro.getByLabel(/Why can't you take it on/).fill('Fully booked this month')
  await pro.getByRole('button', { name: 'Decline request' }).click()
  await expect(pro.getByText(/Declined/).first()).toBeVisible()

  await expect.poll(async () => (await db().from('service_requests').select('status, admin_alerted_at').eq('id', req!.id).single()).data?.status).toBe('triaged')
  await mailWithSubject('admin@test.hagerland.invalid', `All providers declined ${ref}`)

  // Nobody else is suitable: HagerLand closes it and the customer is told politely.
  await page.goto(`/roodber8/service-requests/${req!.id}`)
  await page.getByRole('button', { name: 'No suitable provider…' }).click()
  await page.getByRole('button', { name: 'Close and tell them' }).click()
  await expect(page.getByText(/Closed and the customer was emailed/)).toBeVisible()
  await mailWithSubject(email, `About your request (${ref})`)

  await db().from('service_requests').delete().eq('id', req!.id)
  await db().from('organisations').delete().eq('id', provider.orgId)
})

test('guest links expire, and a new one can be requested without revealing whether a request exists', async ({ page }) => {
  await setPlumberQuestions(page, '[]', false)
  await page.context().clearCookies()
  await asFreshVisitor(page)
  const email = uniqueEmail('requester')
  await page.goto('/request-service/plumbers')
  await page.fill('#sr-title', 'Fix a dripping tap')
  await page.fill('#sr-details', 'A tap in the bathroom drips all day and night.')
  await page.getByRole('button', { name: "Can't find your place? Type it instead" }).click()
  await page.locator('#sr-country').selectOption('GB')
  await page.getByLabel('City or area').fill('London')
  await page.fill('#sr-name', 'Meron Abroad')
  await page.fill('#sr-phone', `+4477009${String(Date.now()).slice(-5)}`)
  await page.fill('#sr-email', email)
  await page.getByRole('button', { name: 'Send my request' }).click()
  await page.waitForURL(/\/request-service\/sent/)
  const ref = new URL(page.url()).searchParams.get('ref') ?? ''
  const { data: req } = await db().from('service_requests').select('id, country_code, currency, location_text').eq('reference', ref).single()
  expect(req).toMatchObject({ country_code: 'GB', currency: 'GBP', location_text: 'London' })
  const first = await mailWithSubject(email, ref)
  const link = new URL(linkMatching(first.html, /\/requests\//)).pathname

  await db().from('service_requests').update({ access_token_expires_at: new Date(Date.now() - 1000).toISOString() }).eq('id', req!.id)
  await page.goto(link)
  await expect(page.getByText('This link has expired')).toBeVisible()

  await page.goto('/requests/resend')
  await page.getByLabel('Email').fill('nobody@test.hagerland.invalid')
  await page.getByLabel('Reference').fill(ref)
  await page.getByRole('button', { name: 'Email me a new link' }).click()
  const generic = await page.getByRole('status').textContent()
  await page.goto('/requests/resend')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Reference').fill(ref.toLowerCase())
  await page.getByRole('button', { name: 'Email me a new link' }).click()
  await expect(page.getByRole('status')).toHaveText(generic ?? '')
  const fresh = await mailWithSubject(email, `Your link to request ${ref}`)
  await page.goto(new URL(linkMatching(fresh.html, /\/requests\//)).pathname)
  await expect(page.getByRole('heading', { name: 'Fix a dripping tap' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel this request' }).click()
  await page.getByRole('button', { name: 'Yes, cancel' }).click()
  await expect(page.getByText('Your request is cancelled')).toBeVisible()
  await db().from('service_requests').delete().eq('id', req!.id)
})

test('a provider cannot open a request that was not sent to them', async ({ browser }) => {
  const a = await createProvider({ name: `E2E Provider A ${Date.now()}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  const b = await createProvider({ name: `E2E Provider B ${Date.now()}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  const { data: req } = await db().from('service_requests').insert({ vertical_key: 'contractors', title: 'E2E private request', details: 'Only for provider A', name: 'Private Person', phone: '+251911000999', email: 'p@test.hagerland.invalid' }).select('id').single()
  const { data: m } = await db().from('service_request_matches').insert({ request_id: req!.id, org_id: a.orgId }).select('id').single()
  const page = await browser.newPage()
  await signIn(page, b.user.email, b.user.password)
  expect((await page.goto(`/account/requests/${m!.id}`))?.status()).toBe(404)
  await db().from('service_requests').delete().eq('id', req!.id)
  await db().from('organisations').delete().in('id', [a.orgId, b.orgId])
})

test('the daily job reminds providers who have not answered within 48 hours, once', async ({ request }) => {
  const p = await createProvider({ name: `E2E Slow Plumbing ${Date.now()}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  const { data: req } = await db().from('service_requests').insert({ vertical_key: 'contractors', title: 'E2E waiting request', details: 'Waiting for an answer', name: 'Waiting Person', phone: '+251911000888', email: 'w@test.hagerland.invalid', status: 'matched' }).select('id').single()
  await db().from('service_request_matches').insert({ request_id: req!.id, org_id: p.orgId, offered_at: new Date(Date.now() - 50 * 3_600_000).toISOString() })
  const res = await request.get('/api/cron/daily', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })
  expect(res.status()).toBe(200)
  expect((await res.json()).matchReminders).toBeGreaterThanOrEqual(1)
  await mailWithSubject(p.user.email, 'Reminder: a customer is waiting')
  const again = await (await request.get('/api/cron/daily', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })).json()
  const { count } = await db().from('service_request_matches').select('id', { count: 'exact', head: true }).eq('request_id', req!.id).is('reminder_sent_at', null)
  expect(count).toBe(0)
  expect(again.ok).toBe(true)
  await db().from('service_requests').delete().eq('id', req!.id)
  await db().from('organisations').delete().eq('id', p.orgId)
})
