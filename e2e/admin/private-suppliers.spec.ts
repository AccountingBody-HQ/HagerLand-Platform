import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { adminSession, assertLocalStack, createUser, db, randomPhone, signIn, SUPABASE_URL } from '../helpers'

test.beforeAll(() => assertLocalStack())

const anon = () => createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '', { auth: { persistSession: false } })

interface Target {
  orgId: string
  slug: string
  name: string
  token: string
  productId: string
  productSlug: string
}

/** Every public path a business (or something it owns) can appear on: true when the business is visible there. */
async function publicMatrix(request: APIRequestContext, visitor: Page, t: Target): Promise<Record<string, boolean>> {
  const a = anon()
  const text = async (path: string) => {
    const res = await request.get(path, { headers: { 'cache-control': 'no-cache' } })
    return { status: res.status(), body: res.ok() ? await res.text() : '' }
  }
  const [org, branches, services, categories, product, special, searchOrgs, searchAll, searchProducts] = await Promise.all([
    a.from('organisations_public').select('id').eq('id', t.orgId),
    a.from('org_branches_public').select('id').eq('org_id', t.orgId),
    a.from('organisation_services_public').select('org_id').eq('org_id', t.orgId),
    a.from('org_product_categories_public').select('org_id').eq('org_id', t.orgId),
    a.from('products_public').select('id').eq('id', t.productId),
    a.from('special_buys_public').select('id').eq('id', t.productId),
    a.rpc('search_organisations', { p_q: t.token }),
    a.rpc('search_all', { p_q: t.token }),
    a.rpc('search_products', { p_q: t.token }),
  ])
  const pages = await Promise.all(
    [`/company/${t.slug}`, `/og/company/${t.slug}`, `/supplies/product/${t.productSlug}`, `/suppliers?q=${t.token}`, `/search?q=${t.token}`, `/api/search/suggest?q=${t.token}`, '/sitemap/companies.xml', '/sitemap/products.xml', '/'].map(text),
  )
  const [company, og, productPage, suppliers, search, suggest, companiesXml, productsXml, home] = pages
  // Signed-out visitors are sent to sign in for any claim address, so the claim page is checked as a signed-in visitor.
  const claim = (await visitor.goto(`/company/${t.slug}/claim`))?.status() ?? 0
  return {
    'organisations_public view': (org.data ?? []).length > 0,
    'org_branches_public view': (branches.data ?? []).length > 0,
    'organisation_services_public view': (services.data ?? []).length > 0,
    'org_product_categories_public view': (categories.data ?? []).length > 0,
    'products_public view (its product)': (product.data ?? []).length > 0,
    'special_buys_public view (its product)': (special.data ?? []).length > 0,
    'search_organisations RPC': JSON.stringify(searchOrgs.data ?? '').includes(t.orgId),
    'search_all RPC': JSON.stringify(searchAll.data ?? '').includes(t.slug),
    'search_products RPC': JSON.stringify(searchProducts.data ?? '').includes(t.productId),
    '/company/<slug> (direct URL)': company.status === 200,
    '/company/<slug>/claim (signed in)': claim === 200,
    '/og/company/<slug> share image': og.status === 200,
    '/supplies/product/<its product>': productPage.status === 200,
    '/suppliers directory search': suppliers.body.includes(t.name),
    '/search page': search.body.includes(t.name),
    '/api/search/suggest': suggest.body.includes(t.slug),
    '/sitemap/companies.xml': companiesXml.body.includes(`/company/${t.slug}`),
    '/sitemap/products.xml': productsXml.body.includes(t.productSlug),
    'homepage': home.body.includes(t.name),
  }
}

// Shown on the homepage only when verified; a Listed business never is, so the homepage is checked for "hidden" only.
const NOT_EXPECTED_WHEN_PUBLISHED = new Set(['homepage'])

test('private supplier journey: add, work on it privately, publish, make private again (J1–J8)', async ({ page, request, browser }) => {
  test.setTimeout(180_000)
  const stamp = Date.now()
  const token = `Pv${stamp}`
  const name = `Lideta Blocks ${token}`
  const phone = randomPhone()
  const d = db()
  const { data: loc } = await d.from('locations').select('id').eq('path', 'addis-ababa').single()
  // An existing business with the same phone: the form must warn about it (J3).
  const { data: twin } = await d.from('organisations').insert({ kind: 'supplier', name: `Twin Phone ${stamp}`, slug: `twin-phone-${stamp}`, phone: `+251${phone.slice(1)}`, location_id: loc!.id, status: 'published', source: 'admin' }).select('id').single()
  const { data: hl } = await d.from('organisations').select('id, status').or('kind.eq.hagerland,is_hagerland.eq.true')
  const { data: publishedBefore } = await d.from('organisations').select('id').eq('status', 'published')
  let orgId = ''
  const user = await createUser()
  const visitorContext = await browser.newContext()
  const visitor = await visitorContext.newPage()
  await signIn(visitor, user.email, user.password)
  try {
    await adminSession(page)
    // J1–J2
    await page.goto('/roodber8/supply/partners')
    await page.getByRole('link', { name: 'Add new supplier' }).click()
    await expect(page.getByRole('heading', { name: 'Add new supplier' })).toBeVisible()
    await expect(page.locator('#org-kind')).toHaveValue('supplier')
    await expect(page.locator('#pil-supplies')).toBeChecked()
    await expect(page.locator('#org-vis-private')).toBeChecked()
    await page.fill('#org-name', name)
    await page.fill('#org-location', 'Bole')
    await page.getByRole('option', { name: /Bole/ }).first().click()
    // J3: typed with spaces; the duplicate check normalises it.
    await page.fill('#org-phone', `${phone.slice(0, 4)} ${phone.slice(4, 6)} ${phone.slice(6, 8)} ${phone.slice(8)}`)
    await page.getByRole('button', { name: 'Create supplier' }).click()
    await expect(page.getByRole('heading', { name: 'Possible duplicates' })).toBeVisible()
    await expect(page.getByRole('link', { name: `Twin Phone ${stamp}` })).toHaveAttribute('href', `/roodber8/organisations/${twin!.id}`)
    await page.getByRole('button', { name: 'None of these is the same business. Create it.' }).click()
    // J4
    await page.waitForURL(/\/roodber8\/organisations\/[0-9a-f-]{36}\?created=1/)
    // Scrolled to the Supply partner panel.
    await expect(page.locator('#supply-partner')).toBeInViewport()
    orgId = /organisations\/([0-9a-f-]{36})/.exec(page.url())![1]
    await expect(page.getByText('Private: not shown on the public site.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Change status' })).toBeVisible()
    const { data: created } = await d.from('organisations').select('status, source, verification_level, slug').eq('id', orgId).single()
    expect(created).toMatchObject({ status: 'draft', source: 'admin', verification_level: 'listed' })
    expect((await d.from('supply_partners').select('relationship_status').eq('org_id', orgId).single()).data?.relationship_status).toBe('discovered')
    expect((await d.from('organisation_pillars').select('pillar_key').eq('org_id', orgId)).data).toEqual([{ pillar_key: 'supplies' }])
    const actions = (await d.from('audit_log').select('action').eq('entity_id', orgId)).data!.map((x) => x.action)
    expect(actions).toEqual(expect.arrayContaining(['organisation.create', 'supply.partner.create']))

    // J5: contact and status, as in Phase 1a.
    await page.getByRole('button', { name: 'Add contact' }).click()
    await page.locator('#sc-name').fill('Sales desk')
    await page.locator('#sc-phone').fill(randomPhone())
    await page.getByRole('button', { name: 'Add contact' }).click()
    await expect.poll(async () => (await d.from('supply_contacts').select('id').eq('org_id', orgId)).data?.length).toBe(1)
    await page.locator('#sp-status').selectOption('contacted')
    await page.getByRole('button', { name: 'Change status' }).click()
    await expect.poll(async () => (await d.from('supply_partners').select('relationship_status').eq('org_id', orgId).single()).data?.relationship_status).toBe('contacted')

    // Things the business owns: a branch, a category, a service, a published product on Special Buy.
    const { data: cat } = await d.from('product_categories').select('id').not('parent_id', 'is', null).limit(1).single()
    const { data: svc } = await d.from('service_categories').select('id').not('parent_id', 'is', null).limit(1).single()
    await d.from('org_branches').insert({ org_id: orgId, name: 'Merkato branch', location_id: loc!.id })
    await d.from('org_product_categories').insert({ org_id: orgId, product_category_id: cat!.id })
    await d.from('organisation_services').insert({ org_id: orgId, service_id: svc!.id })
    const productSlug = `hollow-block-${token.toLowerCase()}`
    const { data: product, error: productError } = await d
      .from('products')
      .insert({ name: `Hollow block ${token}`, slug: productSlug, category_id: cat!.id, seller_org_id: orgId, status: 'published', price_type: 'fixed', price_etb_cents: 4500, is_special_buy: true, special_ends_at: new Date(Date.now() + 7 * 86_400_000).toISOString() })
      .select('id')
      .single()
    expect(productError).toBeNull()
    const target: Target = { orgId, slug: created!.slug, name, token, productId: product!.id, productSlug }

    // J6: private → hidden everywhere.
    const hidden = await publicMatrix(request, visitor, target)
    // J7: publish with the confirmation.
    page.once('dialog', (dialog) => {
      expect(dialog.message()).toContain('Publish only after confirming the details with the business.')
      void dialog.accept()
    })
    await page.getByRole('button', { name: 'Publish', exact: true }).click()
    await expect(page.getByText('Published: visible on the public site.')).toBeVisible()
    const shown = await publicMatrix(request, visitor, target)
    // J8: make private again.
    page.once('dialog', (dialog) => void dialog.accept())
    await page.getByRole('button', { name: 'Make private' }).click()
    await expect(page.getByText('Private: not shown on the public site.')).toBeVisible()
    const hiddenAgain = await publicMatrix(request, visitor, target)

    const rows = Object.keys(hidden).map((path) => ({ path, privateHidden: !hidden[path], publishedShown: NOT_EXPECTED_WHEN_PUBLISHED.has(path) ? 'n/a' : shown[path], hiddenAgain: !hiddenAgain[path] }))
    test.info().annotations.push({ type: 'matrix', description: JSON.stringify(rows) })
    console.log(`MATRIX ${JSON.stringify(rows)}`)
    for (const r of rows) {
      expect(r.privateHidden, `${r.path} while private`).toBe(true)
      if (r.publishedShown !== 'n/a') expect(r.publishedShown, `${r.path} once published`).toBe(true)
      expect(r.hiddenAgain, `${r.path} after Make private`).toBe(true)
    }
    const audits = (await d.from('audit_log').select('action').eq('entity_id', orgId)).data!.map((x) => x.action)
    expect(audits).toEqual(expect.arrayContaining(['organisation.publish', 'organisation.unpublish']))

    // T3: never in a review queue, the Imports review tab or the "waiting for review" count.
    await page.goto('/roodber8/review')
    await expect(page.getByText(name)).toHaveCount(0)
    await page.goto('/roodber8/import?tab=review')
    await expect(page.getByText(name)).toHaveCount(0)
    expect((await d.from('organisations').select('id').eq('id', orgId).eq('status', 'pending_review')).data).toEqual([])

    // J10: the list shows it as private and can filter on it.
    await page.goto(`/roodber8/organisations?status=draft&q=${token}`)
    await expect(page.getByRole('link', { name })).toBeVisible()
    await expect(page.getByText('private', { exact: true }).first()).toBeVisible()
  } finally {
    // T6: nothing else changed status.
    const { data: hlAfter } = await d.from('organisations').select('id, status').or('kind.eq.hagerland,is_hagerland.eq.true')
    expect(hlAfter).toEqual(hl)
    const { data: publishedAfter } = await d.from('organisations').select('id').eq('status', 'published')
    expect(new Set((publishedAfter ?? []).map((o) => o.id))).toEqual(new Set((publishedBefore ?? []).map((o) => o.id)))
    if (orgId) await d.from('products').delete().eq('seller_org_id', orgId)
    await d.from('organisations').delete().in('id', [orgId, twin!.id].filter(Boolean))
    await visitorContext.close()
    await d.auth.admin.deleteUser(user.id)
  }
})

test('the general New organisation form keeps "Publish now" working as before', async ({ page }) => {
  const stamp = Date.now()
  const name = `Kality Electricians ${stamp}`
  await adminSession(page)
  await page.goto('/roodber8/organisations/new')
  await expect(page.locator('#org-vis-private')).toBeChecked()
  await page.locator('#org-kind').selectOption('contractor')
  await page.fill('#org-name', name)
  await page.fill('#org-location', 'Bole')
  await page.getByRole('option', { name: /Bole/ }).first().click()
  await page.fill('#org-phone', randomPhone())
  await page.locator('#org-vis-publish').check()
  await page.getByRole('button', { name: 'Create organisation' }).click()
  await page.waitForURL(/\/roodber8\/organisations\/[0-9a-f-]{36}\?created=1$/)
  const orgId = /organisations\/([0-9a-f-]{36})/.exec(page.url())![1]
  try {
    await expect(page.getByText('Organisation created and published.')).toBeVisible()
    await expect(page.getByText('Published: visible on the public site.')).toBeVisible()
    const { data } = await db().from('organisations').select('status, source, verification_level, published_at').eq('id', orgId).single()
    expect(data).toMatchObject({ status: 'published', source: 'admin', verification_level: 'listed' })
    expect(data!.published_at).not.toBeNull()
    expect((await db().from('supply_partners').select('org_id').eq('org_id', orgId)).data).toEqual([])
  } finally {
    await db().from('organisations').delete().eq('id', orgId)
  }
})

test('if the supply record step fails, the page says so and offers to create it', async ({ page }) => {
  const stamp = Date.now()
  const { data: org } = await db().from('organisations').insert({ kind: 'supplier', name: `Half Made ${stamp}`, slug: `half-made-${stamp}`, status: 'draft', source: 'admin' }).select('id').single()
  try {
    await adminSession(page)
    await page.goto(`/roodber8/organisations/${org!.id}?created=1&supply=failed#supply-partner`)
    await expect(page.getByText('Organisation created. It is private until you publish it.')).toBeVisible()
    await expect(page.getByText('its supply partner record was not')).toBeVisible()
    await page.getByRole('button', { name: 'Create supply partner record' }).click()
    await expect.poll(async () => (await db().from('supply_partners').select('org_id').eq('org_id', org!.id)).data?.length).toBe(1)
  } finally {
    await db().from('organisations').delete().eq('id', org!.id)
  }
})

test('HagerLand’s own organisations cannot be made private', async ({ page }) => {
  const { data: hl } = await db().from('organisations').select('id, status').eq('kind', 'hagerland').limit(1).single()
  await adminSession(page)
  await page.goto(`/roodber8/organisations/${hl!.id}`)
  await expect(page.getByText('HagerLand’s own organisations always stay published.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Make private' })).toHaveCount(0)
  expect((await db().from('organisations').select('status').eq('id', hl!.id).single()).data?.status).toBe(hl!.status)
})
