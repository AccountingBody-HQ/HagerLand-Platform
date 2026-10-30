import { expect, test } from '@playwright/test'
import sharp from 'sharp'
import { adminSession, createUser, db, mailWithSubject, randomPhone, setPillarModes, signIn, uniqueEmail, tickTransferConsent } from './helpers'

/** Manage Property: the owner portal (spec 26.7) and HagerLand's own team in Repair & Maintain (spec 26.8). */

test.describe.configure({ mode: 'serial' })

test('owner portal: only linked owners see their property, with inspections, statements, documents, messages and repairs', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(180_000)
  const owner = await createUser({ name: 'Owner Abroad' })
  const stranger = await createUser({ name: 'Not An Owner' })
  await db().from('profiles').update({ phone: '+447700900123' }).eq('id', owner.id)
  const { data: mp } = await db().from('managed_properties').insert({ owner_name: 'Owner Abroad', owner_email: owner.email, title: `E2E villa ${Date.now()}`, status: 'active', currency: 'GBP' }).select('id, reference').single()
  const photo = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#1C7C4C' } }).webp().toBuffer()
  const photoPath = `docs/inspection/${mp!.id}/${crypto.randomUUID()}.webp`
  await db().storage.from('private-docs').upload(photoPath, photo, { contentType: 'image/webp' })
  await db().from('property_inspections').insert({ managed_property_id: mp!.id, inspected_on: '2026-10-10', inspector: 'Agent Hana', condition: 'good', notes: 'Roof and water tank checked.', photo_paths: [photoPath] })
  await db().from('rent_statements').insert({ managed_property_id: mp!.id, period_start: '2026-09-01', period_end: '2026-09-30', currency: 'GBP', rent_due_minor: 50000, rent_received_minor: 50000, expenses_minor: 5000, fees_minor: 4000 })
  const docPath = `docs/agency/${mp!.id}/${crypto.randomUUID()}.pdf`
  await db().storage.from('private-docs').upload(docPath, Buffer.from('%PDF-1.4\n%test\n'), { contentType: 'application/pdf' })
  await db().from('managed_property_documents').insert([
    { managed_property_id: mp!.id, label: 'Management agreement', storage_path: docPath, visible_to_owner: true },
    { managed_property_id: mp!.id, label: 'Internal cost sheet', storage_path: docPath, visible_to_owner: false },
  ])

  // Not linked yet: the owner sees nothing, and nobody can open the property directly.
  const op = await browser.newPage()
  await signIn(op, owner.email, owner.password)
  await op.goto('/owner')
  await expect(op.getByText('No property is linked to this account')).toBeVisible()
  expect((await op.goto(`/owner/${mp!.id}`))?.status()).toBe(404)

  // Admin links the owner's account.
  await adminSession(page)
  await page.goto(`/roodber8/managed-properties/${mp!.id}`)
  await page.getByLabel("Owner's account email").fill(owner.email)
  await page.getByRole('button', { name: 'Link account' }).click()
  await expect(page.getByText(`Linked: ${owner.email}`)).toBeVisible()

  await op.goto('/owner')
  await op.getByRole('link', { name: /E2E villa/ }).click()
  await expect(op.getByText('Roof and water tank checked.')).toBeVisible()
  await expect(op.getByRole('img', { name: /Inspection .*photo 1/ })).toHaveAttribute('src', /token=/)
  await expect(op.getByRole('cell', { name: '£410', exact: true })).toBeVisible()
  await expect(op.getByRole('link', { name: 'Management agreement' })).toBeVisible()
  await expect(op.getByText('Internal cost sheet')).toHaveCount(0)
  await op.goto('/account')
  await expect(op.getByRole('link', { name: 'Owner portal' })).toBeVisible()

  // Messages both ways.
  await op.goto(`/owner/${mp!.id}`)
  await op.getByLabel('Message to HagerLand').fill('Please check the garden gate.')
  await tickTransferConsent(op)
  await op.getByRole('button', { name: 'Send message' }).click()
  await expect(op.getByText('Message sent.')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Please check the garden gate.')).toBeVisible()
  await page.getByLabel('Your name (shown to the owner)').fill('Hana')
  await page.getByLabel('Reply').fill('We will check it on Friday.')
  await page.getByRole('button', { name: 'Send reply' }).click()
  await expect(page.getByText('Reply sent and the owner emailed.')).toBeVisible()
  const notice = await mailWithSubject(owner.email, 'New message about')
  expect(notice.text).not.toContain('We will check it on Friday.')
  await op.reload()
  await expect(op.getByText('We will check it on Friday.')).toBeVisible()

  // A repair from the owner goes to Repair & Maintain.
  await op.getByLabel('What is the problem?').fill('Gate lock broken')
  await op.getByLabel('Details').fill('The garden gate lock does not close any more.')
  await op.getByRole('button', { name: 'Report a repair' }).click()
  await expect(op.getByText(/Your repair request HLS-\d{4}-\d{6}/)).toBeVisible()
  const { data: sr } = await db().from('service_requests').select('vertical_key, source').eq('requester_user_id', owner.id).single()
  expect(sr).toEqual({ vertical_key: 'repairs-maintenance', source: 'owner_portal' })

  // Someone else cannot see it.
  const sp = await browser.newPage()
  await signIn(sp, stranger.email, stranger.password)
  expect((await sp.goto(`/owner/${mp!.id}`))?.status()).toBe(404)
  await sp.close()
  await op.close()
})

test('the owner portal switch: off returns 404', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  const user = await createUser()
  await adminSession(page)
  try {
    await page.goto('/roodber8/pillars')
    await page.getByRole('switch', { name: 'Direct for Owner portal' }).click()
    await expect(page.getByText('Direct is now off for Owner portal.')).toBeVisible()
    await signIn(page, user.email, user.password)
    expect((await page.goto('/owner'))?.status()).toBe(404)
  } finally {
    await setPillarModes('owner-portal', { direct: true }, { service: true })
    await adminSession(page)
    await page.goto('/roodber8/pillars')
    const sw = page.getByRole('switch', { name: 'Interest capture for Owner portal' })
    await sw.click()
    await expect(page.getByText('Interest capture is now on for Owner portal.')).toBeVisible()
    await page.reload()
    await sw.click()
    await expect(page.getByText('Interest capture is now off for Owner portal.')).toBeVisible()
  }
  // Still signed in as the user from above.
  expect((await page.goto('/owner'))?.status()).toBe(200)
})

test('Repair & Maintain Direct: admin assigns HagerLand’s own team and sends its quote; the customer gets the usual quote email', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  const email = uniqueEmail('repair')
  const { data: cat } = await db().from('service_categories').select('id').eq('slug', 'plumbing-repairs').single()
  const { data: r } = await db().from('service_requests').insert({ vertical_key: 'repairs-maintenance', service_category_id: cat!.id, title: 'E2E leaking pipe', details: 'Pipe under the sink leaks.', name: 'Customer Kebede', phone: randomPhone(), email }).select('id, reference').single()
  await adminSession(page)
  await page.goto(`/roodber8/service-requests/${r!.id}`)
  await page.getByRole('button', { name: 'Assign HagerLand’s own team' }).click()
  await expect(page.getByText('Assigned to HagerLand’s own team.')).toBeVisible()
  await page.reload()
  await expect(page.getByText('HagerLand Services').first()).toBeVisible()
  await page.getByLabel('Amount').fill('3500')
  await page.getByRole('button', { name: 'Send HagerLand’s quote' }).click()
  await expect(page.getByText('Quote sent to the customer.')).toBeVisible()
  const mail = await mailWithSubject(email, r!.reference)
  expect(mail.text).toContain('HagerLand Services')
  expect((await db().from('service_requests').select('status').eq('id', r!.id).single()).data?.status).toBe('quoted')
})
