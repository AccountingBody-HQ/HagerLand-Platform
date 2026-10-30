import { expect, test } from '@playwright/test'
import { adminSession, asFreshVisitor, createProvider, createUser, db, linkMatching, mailWithSubject, randomPhone, seedPublishedProperty, signIn, uniqueEmail } from './helpers'

/** Edge cases from spec 25.4: accounts, listings, search, forms, admin, email, privacy and legacy. */

const linkPath = (html: string, re: RegExp) => {
  const u = new URL(linkMatching(html, re))
  return u.pathname + u.search
}

test.describe('accounts', () => {
  test('magic links sign in once; a used link is refused with a clear message', async ({ page, browser }) => {
    const user = await createUser({ name: 'Magic Person' })
    await asFreshVisitor(page)
    await page.goto('/login')
    await page.getByRole('tab', { name: 'Email link' }).click()
    await page.fill('#magic-email', user.email)
    await page.getByRole('button', { name: 'Email me a sign-in link' }).click()
    await expect(page.getByText(/we've sent a sign-in link/)).toBeVisible()
    const mail = await mailWithSubject(user.email, '')
    const link = linkPath(mail.html, /\/auth\/(callback|v1\/verify)|token/)
    await page.goto(link.startsWith('/auth/v1') ? new URL(linkMatching(mail.html, /token/)).toString() : link)
    await page.waitForURL(/\/account/)
    const again = await browser.newPage()
    await again.goto(link.startsWith('/auth/v1') ? new URL(linkMatching(mail.html, /token/)).toString() : link)
    await again.waitForURL(/\/login\?error=link/)
    await expect(again.getByText('That link has expired or was already used. Request a new one below.')).toBeVisible()
  })

  test('password reset links work once and lead to a new password', async ({ page, browser }) => {
    const user = await createUser()
    await asFreshVisitor(page)
    await page.goto('/auth/reset-password')
    await page.fill('#rp-email', user.email)
    await page.getByRole('button', { name: 'Send reset link' }).click()
    const mail = await mailWithSubject(user.email, '')
    const url = new URL(linkMatching(mail.html, /token|callback/)).toString()
    await page.goto(url)
    await page.waitForURL(/\/auth\/update-password/)
    await page.fill('#up-password', 'a-brand-new-password-123')
    await page.fill('#up-confirm', 'a-brand-new-password-123')
    await page.getByRole('button', { name: 'Save new password' }).click()
    await expect(page.getByText('Your password has been updated.')).toBeVisible()
    const again = await browser.newPage()
    await again.goto(url)
    await again.waitForURL(/\/login\?error=link/)
  })

  test('signing up with an email that already has an account looks the same as a new sign-up (no enumeration)', async ({ page }) => {
    const user = await createUser()
    await asFreshVisitor(page)
    await page.goto('/signup?type=looking')
    await page.fill('#su-name', 'Someone Else')
    await page.fill('#su-email', user.email)
    await page.locator('#su-phone').fill(randomPhone())
    await page.fill('#su-password', 'another-long-password-1')
    await page.locator('#su-terms').check()
    await page.getByRole('button', { name: 'Create account', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible()
  })

  test('people who have not confirmed their email cannot sign in, so they cannot list or publish anything', async ({ page }) => {
    const email = uniqueEmail('unconfirmed')
    await db().auth.admin.createUser({ email, password: 'correct-horse-battery', email_confirm: false })
    await asFreshVisitor(page)
    await page.goto('/login')
    await page.fill('#login-email', email)
    await page.fill('#login-password', 'correct-horse-battery')
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await expect(page.getByText('Please confirm your email first. Check your inbox for the link we sent.')).toBeVisible()
    await page.goto('/account/listings/new')
    await page.waitForURL(/\/login/)
  })

  test('users sign out from the account menu; Google sign-in stays hidden unless configured', async ({ page }) => {
    const user = await createUser()
    await signIn(page, user.email, user.password)
    await page.goto('/account')
    await page.getByRole('button', { name: 'Sign out' }).first().click()
    await page.waitForURL((u) => u.pathname === '/')
    await page.goto('/account')
    await page.waitForURL(/\/login/)
    await expect(page.getByRole('button', { name: /Google/ })).toHaveCount(process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === 'true' ? 1 : 0)
  })

  test('a person in two organisations switches between them', async ({ page }) => {
    const user = await createUser({ name: 'Two Hats' })
    const stamp = Date.now()
    const { data: orgs } = await db()
      .from('organisations')
      .insert([
        { kind: 'agency', name: `E2E Hat One ${stamp}`, slug: `e2e-hat-one-${stamp}`, status: 'published' },
        { kind: 'contractor', name: `E2E Hat Two ${stamp}`, slug: `e2e-hat-two-${stamp}`, status: 'published' },
      ])
      .select('id')
    try {
      await db().from('organisation_members').insert((orgs ?? []).map((o) => ({ org_id: o.id, user_id: user.id, role: 'owner' as const })))
      await signIn(page, user.email, user.password)
      await page.goto('/account')
      const switcher = page.locator('#org-switch')
      await expect(switcher).toBeVisible()
      await switcher.selectOption({ label: `E2E Hat Two ${stamp}` })
      await expect(page.locator('#org-switch')).toHaveValue(orgs![1].id)
      await page.goto('/account/company')
      await expect(page.locator('main')).toContainText(`E2E Hat Two ${stamp}`)
    } finally {
      await db().from('organisations').delete().in('id', (orgs ?? []).map((o) => o.id))
    }
  })

  test('people can ask for their account to be deleted from settings', async ({ page }) => {
    const user = await createUser({ name: 'Leaving Person' })
    await signIn(page, user.email, user.password)
    await page.goto('/account/settings')
    await page.fill('#del-confirm', 'DELETE')
    await page.locator('#del-confirm').press('Enter')
    await expect(page.getByText(/We will delete your account and personal data within 30 days/)).toBeVisible()
    expect((await db().from('profiles').select('deletion_requested_at').eq('id', user.id).single()).data?.deletion_requested_at).not.toBeNull()
  })

  test('people can download their data as a file', async ({ page }) => {
    const user = await createUser({ name: 'Data Owner' })
    await db().from('saved_searches').insert({ user_id: user.id, name: 'Export check search', params: { purpose: 'sale' } })
    await signIn(page, user.email, user.password)
    await page.goto('/account/settings')
    const res = await page.request.get('/account/export')
    expect(res.status()).toBe(200)
    expect(res.headers()['content-disposition']).toContain('hagerland-my-data-')
    const body = await res.json()
    expect(body.account.email).toBe(user.email)
    expect(body.saved_searches[0].name).toBe('Export check search')
    expect(JSON.stringify(body)).not.toContain('unsubscribe_token')
    await expect(page.getByRole('link', { name: 'Download my data' })).toHaveAttribute('href', '/account/export')
  })
})

test.describe('listings', () => {
  test('expired listings stay reachable (noindex, "no longer available"); removed and rejected ones are 404', async ({ page }) => {
    const expired = await seedPublishedProperty({ title: `E2E expired ${Date.now()}` })
    const removed = await seedPublishedProperty({ title: `E2E removed ${Date.now()}` })
    const rejected = await seedPublishedProperty({ title: `E2E rejected ${Date.now()}` })
    const paused = await seedPublishedProperty({ title: `E2E paused ${Date.now()}` })
    try {
      await db().from('properties').update({ status: 'paused' }).eq('id', paused.id)
      expect((await page.goto(`/property/${paused.slug}?v=${Date.now()}`))?.status()).toBe(404)
      await db().from('properties').update({ status: 'expired' }).eq('id', expired.id)
      await db().from('properties').update({ status: 'removed' }).eq('id', removed.id)
      await db().from('properties').update({ status: 'rejected' }).eq('id', rejected.id)
      const r = await page.goto(`/property/${expired.slug}?v=${Date.now()}`)
      expect(r?.status()).toBe(200)
      await expect(page.getByRole('heading', { name: 'This property is no longer available' })).toBeVisible()
      await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/)
      expect((await page.goto(`/property/${removed.slug}?v=${Date.now()}`))?.status()).toBe(404)
      expect((await page.goto(`/property/${rejected.slug}?v=${Date.now()}`))?.status()).toBe(404)
    } finally {
      await db().from('properties').delete().in('id', [expired.id, removed.id, rejected.id, paused.id])
    }
  })

  test('prices show "on request", "Negotiable" and "/month" for rentals', async ({ page }) => {
    const onRequest = await seedPublishedProperty({ title: `E2E on request ${Date.now()}` })
    const rental = await seedPublishedProperty({ title: `E2E negotiable rent ${Date.now()}`, purpose: 'rent', price: 45_000 })
    try {
      await db().from('properties').update({ price_on_request: true, price_etb: null }).eq('id', onRequest.id)
      await db().from('properties').update({ price_negotiable: true, price_period: 'month' }).eq('id', rental.id)
      await page.goto(`/property/${onRequest.slug}?v=${Date.now()}`)
      await expect(page.getByText('Price on request').first()).toBeVisible()
      await page.goto(`/property/${rental.slug}?v=${Date.now()}`)
      await expect(page.getByText('ETB 45,000').first()).toBeVisible()
      await expect(page.getByText('/month').first()).toBeVisible()
      await expect(page.getByText('Negotiable', { exact: true }).first()).toBeVisible()
      // The current page stays readable at the end of a long breadcrumb trail on phones.
      await expect(page.getByRole('navigation', { name: 'Breadcrumb' }).locator('[aria-current="page"]')).toBeVisible()
    } finally {
      await db().from('properties').delete().in('id', [onRequest.id, rental.id])
    }
  })

  test('listings need at least 3 photos to be submitted and accept at most 25', async ({ page }) => {
    const user = await createUser({ name: 'Photo Owner' })
    const { data: loc } = await db().from('locations').select('id').eq('path', 'addis-ababa/bole').single()
    const stamp = Date.now()
    const { data: draft } = await db().from('properties').insert({ title: `E2E photos ${stamp}`, slug: `e2e-photos-${stamp}`, purpose: 'sale', property_type: 'apartment', location_id: loc!.id, bedrooms: 1, bathrooms: 1, price_etb: 2_000_000, description: 'A one-bedroom apartment used to test the minimum and maximum number of photos on a listing.', lister_type: 'owner', lister_user_id: user.id, contact_phone: '+251911223344', status: 'draft' }).select('id').single()
    const photo = (i: number) => ({ entity_type: 'property', entity_id: draft!.id, kind: 'image', storage_path: `property/${draft!.id}/p${i}.webp`, status: 'approved', sort: i })
    await db().from('media').insert([0, 1].map(photo))
    try {
      await signIn(page, user.email, user.password)
      await page.goto(`/account/listings/${draft!.id}/edit?step=review`)
      await page.locator('#w-d1').check()
      await page.locator('#w-d2').check()
      await page.getByRole('button', { name: 'Submit for review' }).click()
      await expect(page.getByText('Add at least 3 photos before submitting.')).toBeVisible()
      await db().from('media').insert(Array.from({ length: 23 }, (_, i) => photo(i + 2)))
      const res = await page.request.post('/api/uploads/sign', { data: { purpose: 'media', entity_type: 'property', entity_id: draft!.id, kind: 'image', content_type: 'image/jpeg', size: 1000 } })
      expect(res.status()).toBe(400)
      expect((await res.json()).error).toBe('You can add up to 25 photos here.')
    } finally {
      await db().from('media').delete().eq('entity_id', draft!.id)
      await db().from('properties').delete().eq('id', draft!.id)
    }
  })

  test('private owners are capped at the admin-set number of active listings', async ({ page }) => {
    const user = await createUser({ name: 'Capped Owner' })
    const { data: loc } = await db().from('locations').select('id').eq('path', 'addis-ababa/bole').single()
    const base = { purpose: 'sale', property_type: 'apartment', location_id: loc!.id, bedrooms: 2, bathrooms: 1, price_etb: 3_000_000, description: 'An apartment used to test the private owner listing cap.', lister_type: 'owner', lister_user_id: user.id, contact_phone: '+251911223344' }
    const stamp = Date.now()
    const { data: active } = await db().from('properties').insert([0, 1, 2].map((i) => ({ ...base, title: `E2E cap ${stamp} ${i}`, slug: `e2e-cap-${stamp}-${i}`, status: 'pending_review' as const }))).select('id')
    const { data: draft } = await db().from('properties').insert({ ...base, title: `E2E cap ${stamp} draft`, slug: `e2e-cap-${stamp}-d`, status: 'draft' }).select('id').single()
    await db().from('media').insert([0, 1, 2].map((i) => ({ entity_type: 'property', entity_id: draft!.id, kind: 'image', storage_path: `property/${draft!.id}/x${i}.webp`, status: 'approved', sort: i })))
    try {
      await signIn(page, user.email, user.password)
      await page.goto(`/account/listings/${draft!.id}/edit?step=review`)
      await page.locator('#w-d1').check()
      await page.locator('#w-d2').check()
      await page.getByRole('button', { name: 'Submit for review' }).click()
      await expect(page.getByText(/Private owners can have up to 3 active listings/)).toBeVisible()
      expect((await db().from('properties').select('status').eq('id', draft!.id).single()).data?.status).toBe('draft')
    } finally {
      await db().from('properties').delete().in('id', [...(active ?? []).map((a) => a.id), draft!.id])
    }
  })

  test('an owner renews a listing near expiry, edits it while changes wait for review, and archives it', async ({ page }) => {
    const user = await createUser({ name: 'Lifecycle Owner' })
    const { data: loc } = await db().from('locations').select('id').eq('path', 'addis-ababa/bole').single()
    const stamp = Date.now()
    const title = `E2E lifecycle flat ${stamp}`
    const { data: row } = await db()
      .from('properties')
      .insert({ title, slug: `e2e-life-${stamp}`, purpose: 'sale', property_type: 'apartment', location_id: loc!.id, bedrooms: 2, bathrooms: 1, price_etb: 4_000_000, description: 'A bright two-bedroom apartment in Bole used to test the owner listing lifecycle: renew, edit while in review, archive.', lister_type: 'owner', lister_user_id: user.id, contact_phone: '+251911223344', status: 'published', expires_at: new Date(Date.now() + 5 * 86_400_000).toISOString() })
      .select('id, expires_at')
      .single()
    await db().from('media').insert([0, 1, 2].map((i) => ({ entity_type: 'property', entity_id: row!.id, kind: 'image', storage_path: `property/${row!.id}/x${i}.webp`, status: 'approved', sort: i })))
    try {
      await signIn(page, user.email, user.password)
      await page.goto('/account/listings')
      await page.getByRole('button', { name: 'Renew' }).click()
      await expect(page.getByText(/Renewed for another \d+ days/)).toBeVisible()
      const renewed = (await db().from('properties').select('expires_at').eq('id', row!.id).single()).data?.expires_at
      expect(new Date(renewed!).getTime()).toBeGreaterThan(Date.now() + 50 * 86_400_000)

      // Edits to a live listing wait for review; a second edit adds to the first.
      await page.goto(`/account/listings/${row!.id}/edit?step=basics`)
      await page.fill('#w-title', `${title} with view`)
      await page.getByRole('button', { name: /Save and continue/ }).click()
      await page.waitForURL(/step=location/)
      await page.goto(`/account/listings/${row!.id}/edit?step=details`)
      await page.fill('#w-price', '3900000')
      await page.getByRole('button', { name: /Save and continue/ }).click()
      await page.waitForURL(/step=photos/)
      const { data: after } = await db().from('properties').select('title, price_etb, pending_changes').eq('id', row!.id).single()
      expect(after).toMatchObject({ title, price_etb: 4_000_000, pending_changes: { title: `${title} with view`, price_etb: 3_900_000 } })

      page.once('dialog', (d) => void d.accept())
      await page.goto('/account/listings')
      await page.getByRole('button', { name: 'Archive' }).click()
      await expect.poll(async () => (await db().from('properties').select('status').eq('id', row!.id).single()).data?.status).toBe('archived')
    } finally {
      await db().from('properties').delete().eq('id', row!.id)
    }
  })

  test('HagerLand sees possible duplicate listings flagged in the review queue', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'admin at desktop width')
    const user = await createUser()
    const { data: loc } = await db().from('locations').select('id').eq('path', 'addis-ababa/yeka').single()
    const stamp = Date.now()
    const base = { purpose: 'sale', property_type: 'house', location_id: loc!.id, bedrooms: 3, bathrooms: 2, price_etb: 9_000_000, description: 'A family house used to test duplicate listing detection.', lister_type: 'owner', lister_user_id: user.id, contact_phone: '+251911223344' }
    const { data: rows } = await db()
      .from('properties')
      .insert([
        { ...base, title: `E2E Dup house Yeka ${stamp}`, slug: `e2e-dup-a-${stamp}`, status: 'published' as const },
        { ...base, title: `E2E Dup house Yeka ${stamp} again`, slug: `e2e-dup-b-${stamp}`, status: 'pending_review' as const, price_etb: 9_100_000 },
      ])
      .select('id')
    try {
      await adminSession(page)
      await page.goto('/roodber8/review?tab=properties')
      await expect(page.getByText(`Possible duplicate of “E2E Dup house Yeka ${stamp}”`)).toBeVisible()
    } finally {
      await db().from('properties').delete().in('id', (rows ?? []).map((r) => r.id))
    }
  })
})

test.describe('search and forms', () => {
  test('search copes with empty, very long, special-character and Ethiopic queries, and bad page or filter values', async ({ page }) => {
    const bad = ['', 'a'.repeat(500), `%_,()'"\\`, 'ቦሌ አፓርትመንት', '<script>x</script>']
    for (const q of bad) {
      const res = await page.goto(`/search?q=${encodeURIComponent(q)}`)
      expect(res?.status(), q).toBe(200)
      await expect(page.locator('h1')).toBeVisible()
    }
    for (const path of ['/property/for-sale?page=99999', '/property/for-sale?beds=abc&price_min=-5&sort=bogus', '/professionals?page=-1&sort=nope', '/supplies/building-materials?page=abc&sort=zzz', '/jobs?page=999999']) {
      expect((await page.goto(path))?.status(), path).toBeLessThan(500)
    }
    const q = `nothing-matches-${Date.now()}`
    await page.goto(`/search?q=${q}`)
    await expect.poll(async () => (await db().from('search_misses').select('count').eq('q_normalised', q)).data?.length ?? 0).toBe(1)
  })

  test('a filled honeypot is silently dropped, and the submit button cannot be pressed twice', async ({ page }) => {
    await asFreshVisitor(page)
    await page.goto('/contact')
    const name = `E2E Bot ${Date.now()}`
    await page.fill('#contact-name', name)
    await page.fill('#contact-phone', randomPhone())
    await page.fill('#contact-message', 'This message comes from a bot.')
    await page.locator('#hl_zq9').evaluate((el: HTMLInputElement) => (el.value = 'spam'))
    await page.getByRole('button', { name: 'Send message' }).click()
    await expect(page.getByText('Your enquiry has been sent')).toBeVisible()
    expect((await db().from('enquiries').select('id').eq('name', name)).data).toHaveLength(0)

    await asFreshVisitor(page)
    await page.goto('/contact')
    const human = `E2E Human ${Date.now()}`
    await page.fill('#contact-name', human)
    await page.fill('#contact-phone', randomPhone())
    await page.fill('#contact-message', 'Clicking twice should send one message.')
    const button = page.getByRole('button', { name: 'Send message' })
    await button.dblclick()
    await expect(page.getByText('Your enquiry has been sent')).toBeVisible()
    await expect.poll(async () => (await db().from('enquiries').select('id').eq('name', human)).data?.length).toBe(1)
    await db().from('enquiries').delete().eq('name', human)
  })

  test('a validation error keeps everything the visitor typed', async ({ page }) => {
    await asFreshVisitor(page)
    await page.goto('/request-service/plumbers')
    await page.fill('#sr-title', 'Kept title after an error')
    await page.fill('#sr-details', 'These details must still be here after the error.')
    await page.fill('#sr-name', 'Kept Name')
    await page.fill('#sr-phone', '12')
    await page.getByRole('button', { name: 'Send my request' }).click()
    await expect(page.getByText(/phone/i).first()).toBeVisible()
    await expect(page.locator('#sr-title')).toHaveValue('Kept title after an error')
    await expect(page.locator('#sr-details')).toHaveValue('These details must still be here after the error.')
    await expect(page.locator('#sr-name')).toHaveValue('Kept Name')
  })
})

test.describe('admin, email and legacy', () => {
  test('two admins editing the same record: the second save is refused instead of overwriting', async ({ browser }, info) => {
    test.skip(info.project.name !== 'desktop', 'admin at desktop width')
    const stamp = Date.now()
    const { data: loc } = await db().from('locations').select('id').eq('path', 'addis-ababa').single()
    const { data: org } = await db().from('organisations').insert({ kind: 'contractor', name: `E2E Concurrent ${stamp}`, slug: `e2e-concurrent-${stamp}`, status: 'published', phone: '+251911000222', location_id: loc!.id }).select('id').single()
    try {
      const a = await browser.newPage()
      const b = await browser.newPage()
      await adminSession(a)
      await adminSession(b)
      await a.goto(`/roodber8/organisations/${org!.id}`)
      await b.goto(`/roodber8/organisations/${org!.id}`)
      await a.locator('#org-tagline').fill('Saved by the first admin')
      await a.getByRole('button', { name: 'Save changes' }).click()
      await expect(a.getByText(/Saved/).first()).toBeVisible()
      await b.locator('#org-tagline').fill('Saved by the second admin')
      await b.getByRole('button', { name: 'Save changes' }).click()
      await expect(b.getByText(/Someone else changed this since you opened it/)).toBeVisible()
      expect((await db().from('organisations').select('tagline').eq('id', org!.id).single()).data?.tagline).toBe('Saved by the first admin')
    } finally {
      await db().from('organisations').delete().eq('id', org!.id)
    }
  })

  test('bulk approval reports partial failures', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'admin at desktop width')
    const a = await seedPublishedProperty({ title: `E2E bulk A ${Date.now()}` })
    const b = await seedPublishedProperty({ title: `E2E bulk B ${Date.now()}` })
    await db().from('properties').update({ status: 'pending_review' }).in('id', [a.id, b.id])
    try {
      await adminSession(page)
      await page.goto('/roodber8/review?tab=properties')
      for (const id of [a, b]) await page.locator('li', { has: page.locator(`a[href="/roodber8/properties/${id.id}"]`) }).getByLabel('Select for bulk approval').check()
      // One of them is taken down by someone else before the bulk approval runs.
      await db().from('properties').update({ status: 'removed' }).eq('id', b.id)
      await page.getByRole('button', { name: /Approve selected \(2\)/ }).click()
      await expect(page.getByText('Approved 1 of 2.')).toBeVisible()
    } finally {
      await db().from('properties').delete().in('id', [a.id, b.id])
    }
  })

  test('merging a duplicate location moves its records and switches the old place off', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'admin at desktop width')
    const stamp = Date.now()
    const { data: locs } = await db()
      .from('locations')
      .insert([
        { level: 'region', name: `E2E Merge From ${stamp}`, slug: `e2e-merge-from-${stamp}`, path: `e2e-merge-from-${stamp}`, country_code: 'ET', sort: 999 },
        { level: 'region', name: `E2E Merge Into ${stamp}`, slug: `e2e-merge-into-${stamp}`, path: `e2e-merge-into-${stamp}`, country_code: 'ET', sort: 999 },
      ])
      .select('id, name')
    const from = locs!.find((l) => l.name.includes('From'))!
    const into = locs!.find((l) => l.name.includes('Into'))!
    const prop = await seedPublishedProperty({ title: `E2E merge listing ${stamp}` })
    await db().from('properties').update({ location_id: from.id }).eq('id', prop.id)
    try {
      await adminSession(page)
      await page.goto('/roodber8/locations')
      const row = page.locator('li').filter({ hasText: from.name }).first()
      await row.getByRole('button', { name: 'Edit' }).first().click()
      await row.getByLabel('Merge into', { exact: true }).selectOption({ label: into.name })
      await row.getByRole('button', { name: 'Merge…' }).click()
      await row.getByRole('button', { name: 'Yes, merge now' }).click()
      await expect.poll(async () => (await db().from('properties').select('location_id').eq('id', prop.id).single()).data?.location_id).toBe(into.id)
      await expect.poll(async () => (await db().from('locations').select('is_active').eq('id', from.id).single()).data?.is_active).toBe(false)
    } finally {
      await db().from('properties').delete().eq('id', prop.id)
      await db().from('locations').delete().in('id', [from.id, into.id])
    }
  })

  test('merging a duplicate company moves its team and services in one go and archives the duplicate', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'admin at desktop width')
    const stamp = Date.now()
    const dup = await createProvider({ name: `E2E Merge Dup ${stamp}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa' })
    const keep = await createProvider({ name: `E2E Merge Keep ${stamp}`, serviceSlug: 'electricians', locationPath: 'addis-ababa' })
    try {
      await adminSession(page)
      await page.goto(`/roodber8/organisations/${dup.orgId}`)
      await page.getByLabel('Find the organisation to merge into').fill(`E2E Merge Keep ${stamp}`)
      await page.getByRole('button', { name: 'Find', exact: true }).click()
      await page.getByLabel('Merge into', { exact: true }).selectOption(keep.orgId)
      await page.getByLabel('I understand this cannot be undone automatically').check()
      await page.getByRole('button', { name: 'Merge', exact: true }).click()
      await expect.poll(async () => (await db().from('organisations').select('status').eq('id', dup.orgId).single()).data?.status).toBe('archived')
      // The duplicate is archived first; services and links move after, so wait for the audit entry that ends the merge.
      await expect.poll(async () => (await db().from('audit_log').select('id', { count: 'exact', head: true }).eq('action', 'organisation.merge').eq('entity_id', keep.orgId)).count).toBe(1)
      const { data: members } = await db().from('organisation_members').select('user_id').eq('org_id', keep.orgId)
      expect((members ?? []).map((m) => m.user_id).sort()).toEqual([dup.user.id, keep.user.id].sort())
      const { count } = await db().from('organisation_services').select('service_id', { count: 'exact', head: true }).eq('org_id', keep.orgId)
      expect(count).toBe(2)
    } finally {
      await db().from('organisations').delete().in('id', [dup.orgId, keep.orgId])
    }
  })

  test('emails that failed to send are retried by the daily job and shown to HagerLand until delivered', async ({ page, request }, info) => {
    test.skip(info.project.name !== 'desktop', 'admin at desktop width')
    const to = uniqueEmail('outbox')
    const subject = `E2E queued email ${Date.now()}`
    const { data: row } = await db().from('email_outbox').insert({ to_addresses: [to], subject, html: '<!doctype html><p>Queued</p>', text_body: 'Queued', last_error: 'simulated outage', next_attempt_at: new Date(Date.now() - 60_000).toISOString() }).select('id').single()
    await adminSession(page)
    await page.goto('/roodber8/email-problems')
    await expect(page.getByText(subject)).toBeVisible()
    const res = await (await request.get('/api/cron/daily', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })).json()
    expect(res.emailsRetried).toBeGreaterThanOrEqual(1)
    await mailWithSubject(to, subject)
    expect((await db().from('email_outbox').select('status, attempts').eq('id', row!.id).single()).data).toMatchObject({ status: 'sent', attempts: 2 })
    await page.goto('/roodber8/email-problems')
    await expect(page.getByText(subject)).toHaveCount(0)
  })

  test('the daily job deletes interest registrations after 24 months', async ({ request }) => {
    const email = uniqueEmail('old-interest')
    await db().from('interest_registrations').insert({ vertical_key: 'finance', name: 'Old Interest', email, country_code: 'ET', created_at: new Date(Date.now() - 800 * 86_400_000).toISOString() })
    const res = await (await request.get('/api/cron/daily', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })).json()
    expect(res.interestPurged).toBeGreaterThanOrEqual(1)
    expect((await db().from('interest_registrations').select('id').eq('email', email)).data).toHaveLength(0)
  })

  test('old API addresses answer 410 Gone', async ({ request }) => {
    for (const path of ['/api/housing/manage', '/api/birrbank-fx-rates', '/api/enquiry', '/api/cron/admin-digest', '/api/jobs/manage']) {
      expect((await request.get(path)).status(), path).toBe(410)
    }
    expect((await request.get('/api/health')).status()).toBe(200)
  })
})
