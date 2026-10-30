import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { adminSession, assertLocalStack, createUser, db, SUPABASE_URL } from '../helpers'
import { addisDay } from '../../lib/jobs-privacy'

test.beforeAll(() => assertLocalStack())

// Addis Ababa dates, as the pages use (QC-1a: a UTC date failed every day from 21:00 to 24:00 UTC).
const iso = (days: number) => addisDay(new Date(Date.now() + days * 86_400_000))

async function seedPartner(name: string) {
  const d = db()
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`
  const { data: org } = await d.from('organisations').insert({ kind: 'supplier', name, slug, status: 'draft', source: 'admin' }).select('id').single()
  await d.from('supply_partners').insert({ org_id: org!.id, relationship_status: 'active' })
  return org!.id
}

async function cementCategory() {
  const { data } = await db().from('product_categories').select('id').eq('slug', 'cement-concrete').single()
  return data!.id
}

test('visitors and signed-in users cannot read or write supplier offers', async () => {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const anon = createClient(SUPABASE_URL, anonKey, { auth: { persistSession: false } })
  const user = await createUser()
  const signedIn = createClient(SUPABASE_URL, anonKey, { auth: { persistSession: false } })
  await signedIn.auth.signInWithPassword({ email: user.email, password: user.password })
  const orgId = await seedPartner('Offers Grants Check')
  const cat = await cementCategory()
  await db().from('supplier_offers').insert({ org_id: orgId, category_id: cat, item_name: 'Secret cement', item_key: 'secret cement', unit: 'bag', price_etb_cents: 100000, price_date: iso(0), valid_until: iso(7), source: 'direct_call' })
  try {
    for (const client of [anon, signedIn]) {
      const read = await client.from('supplier_offers').select('*').limit(1)
      expect(read.error).not.toBeNull()
      expect(read.data ?? []).toEqual([])
      const write = await client.from('supplier_offers').insert({ org_id: orgId, category_id: cat, item_name: 'x', item_key: 'x', unit: 'bag', price_etb_cents: 1, price_date: iso(0), valid_until: iso(0), source: 'other' })
      expect(write.error).not.toBeNull()
    }
  } finally {
    await db().from('organisations').delete().eq('id', orgId)
    await db().auth.admin.deleteUser(user.id)
  }
})

test('one current price per item: a near-simultaneous second save fails cleanly; a batch with a bad row saves nothing', async () => {
  const d = db()
  const orgId = await seedPartner('Race Check Supplies')
  const cat = await cementCategory()
  const row = (cents: number) => ({ org_id: orgId, category_id: cat, item_name: 'Race cement', item_key: 'race cement', unit: 'bag', price_etb_cents: cents, price_date: iso(0), valid_until: iso(7), source: 'direct_call' })
  try {
    await d.from('supplier_offers').insert(row(100000))
    const [a, b] = await Promise.all([d.from('supplier_offers').insert(row(110000)), d.from('supplier_offers').insert(row(120000))])
    const errors = [a.error, b.error].filter(Boolean)
    expect(errors.length).toBeLessThanOrEqual(1)
    if (errors.length) expect(errors[0]!.code).toBe('23505')
    const { data: current } = await d.from('supplier_offers').select('price_etb_cents').eq('org_id', orgId).eq('status', 'current')
    expect(current).toHaveLength(1)
    const { data: superseded } = await d.from('supplier_offers').select('superseded_by').eq('org_id', orgId).eq('status', 'superseded')
    expect((superseded ?? []).every((s) => s.superseded_by)).toBe(true)

    const before = (await d.from('supplier_offers').select('id').eq('org_id', orgId)).data!.length
    const batch = await d.from('supplier_offers').insert([{ ...row(5000), item_key: 'block a', item_name: 'Block A' }, { ...row(0), item_key: 'block b', item_name: 'Block B' }])
    expect(batch.error).not.toBeNull()
    expect((await d.from('supplier_offers').select('id').eq('org_id', orgId)).data!.length).toBe(before)
  } finally {
    await d.from('organisations').delete().eq('id', orgId)
  }
})

test('price lists journey J1–J8: add, paste, replace, freshness, withdraw, expiring list, nothing public', async ({ page, request }) => {
  test.setTimeout(180_000)
  const d = db()
  const stamp = Date.now()
  const name = `Merkato Cement House ${stamp}`
  const orgId = await seedPartner(name)
  await d.from('supply_contacts').insert({ org_id: orgId, name: 'Sales desk', phone: '0911 22 33 44', phone_normalised: '+251911223344', preferred_channel: 'phone' })
  const { data: productsBefore } = await d.from('products').select('id, price_etb_cents, price_type, updated_at').order('id')
  try {
    await adminSession(page)
    // J1
    await page.goto(`/roodber8/organisations/${orgId}`)
    await expect(page.getByText('Prices: 0 current · 0 expiring within 7 days · 0 expired')).toBeVisible()
    await page.getByRole('link', { name: 'Open price list' }).click()
    // J2
    await page.waitForURL(`**/roodber8/supply/partners/${orgId}/offers`)
    await expect(page.getByText('An offer is one price this partner gives HagerLand')).toBeVisible()

    // J3: one price by hand.
    await page.getByRole('button', { name: 'Add price' }).click()
    await page.locator('#of-category').selectOption({ label: 'Building materials › Cement & concrete' })
    await page.locator('#of-item').fill(`Dangote OPC 42.5 cement 50 kg ${stamp}`)
    await page.locator('#of-unit').selectOption('bag')
    await page.locator('#of-pack').fill('50')
    await page.locator('#of-price').fill('1,250')
    await expect(page.locator('#of-valid')).toHaveValue(iso(7))
    await page.locator('#of-lead').fill('2')
    await page.locator('#of-source').selectOption('direct_call')
    await page.locator('#of-conf').selectOption('high')
    await page.getByRole('button', { name: 'Save price' }).click()
    await expect(page.getByRole('cell', { name: /ETB 1,250/ }).first()).toBeVisible()
    const { data: first } = await d.from('supplier_offers').select('id, status, price_etb_cents, valid_until, item_key').eq('org_id', orgId).single()
    expect(first).toMatchObject({ status: 'current', price_etb_cents: 125000, valid_until: iso(7) })

    // J4: paste a price list.
    await page.getByRole('button', { name: 'Paste a price list' }).click()
    await page.locator('#pl-text').fill(`Dangote cement 50kg ${stamp}, bag, 1250\nRebar 12mm ${stamp}, piece, 980\nHollow block 20cm ${stamp}, piece, 38.5`)
    await page.getByRole('button', { name: 'Check the list' }).click()
    await expect(page.getByRole('cell', { name: 'ETB 38.50' })).toBeVisible()
    expect((await d.from('supplier_offers').select('id').eq('org_id', orgId)).data).toHaveLength(1)
    await page.getByLabel('Category for line 1').selectOption({ label: 'Building materials › Cement & concrete' })
    await page.getByLabel('Category for line 2').selectOption({ label: 'Building materials › Steel & rebar' })
    await page.getByLabel('Category for line 3').selectOption({ index: 1 })
    await page.locator('#pl-source').selectOption('price_list_photo')
    await page.getByRole('button', { name: 'Save 3 prices' }).click()
    await expect.poll(async () => (await d.from('supplier_offers').select('id').eq('org_id', orgId).eq('status', 'current')).data?.length).toBe(4)
    const { data: rebar } = await d.from('supplier_offers').select('valid_until, unit, price_etb_cents').eq('org_id', orgId).ilike('item_name', 'Rebar%').single()
    expect(rebar).toMatchObject({ valid_until: iso(7), unit: 'piece', price_etb_cents: 98000 })
    const audits = (await d.from('audit_log').select('action, diff').eq('entity_id', orgId)).data!
    expect(audits.find((a) => a.action === 'supply.offer.paste_import')?.diff).toMatchObject({ rows: 3 })

    // J5: a new price for the same item replaces the old one, which stays in the history.
    await page.getByRole('button', { name: 'Add price' }).click()
    await page.locator('#of-category').selectOption({ label: 'Building materials › Cement & concrete' })
    await page.locator('#of-item').fill(`dangote opc 42.5 cement, 50 kg ${stamp}`)
    await page.locator('#of-unit').selectOption('bag')
    await page.locator('#of-price').fill('1300')
    await page.locator('#of-source').selectOption('direct_call')
    await page.getByRole('button', { name: 'Save price' }).click()
    await expect.poll(async () => (await d.from('supplier_offers').select('status').eq('id', first!.id).single()).data?.status).toBe('superseded')
    const { data: same } = await d.from('supplier_offers').select('status, price_etb_cents').eq('org_id', orgId).eq('item_key', first!.item_key).order('price_etb_cents')
    expect(same).toEqual([{ status: 'superseded', price_etb_cents: 125000 }, { status: 'current', price_etb_cents: 130000 }])
    expect((await d.from('audit_log').select('action').eq('entity_id', orgId).eq('action', 'supply.offer.supersede')).data).toHaveLength(1)
    await page.reload()
    await page.getByRole('button', { name: 'History (1)' }).click()
    await expect(page.getByText(/ETB 1,250 · dated/)).toBeVisible()

    // J6: freshness and withdraw. Two older prices: one ageing, one expired.
    const cat = await cementCategory()
    await d.from('supplier_offers').insert([
      { org_id: orgId, category_id: cat, item_name: `Ageing sand ${stamp}`, item_key: `ageing sand ${stamp}`, unit: 'm3', price_etb_cents: 90000, price_date: iso(-20), valid_until: iso(5), source: 'direct_call' },
      { org_id: orgId, category_id: cat, item_name: `Expired gravel ${stamp}`, item_key: `expired gravel ${stamp}`, unit: 'm3', price_etb_cents: 80000, price_date: iso(-30), valid_until: iso(-1), source: 'direct_call' },
    ])
    await page.reload()
    const rowOf = (item: string) => page.locator('tr', { hasText: item })
    await expect(rowOf(`Ageing sand ${stamp}`).getByText('Ageing', { exact: true })).toBeVisible()
    await expect(rowOf(`Expired gravel ${stamp}`).getByText('Expired', { exact: true })).toBeVisible()
    await expect(rowOf(`Rebar 12mm ${stamp}`).getByText('Fresh', { exact: true })).toBeVisible()
    page.once('dialog', (dialog) => void dialog.accept())
    await rowOf(`Hollow block 20cm ${stamp}`).getByRole('button', { name: 'Withdraw' }).click()
    await expect.poll(async () => (await d.from('supplier_offers').select('status').eq('org_id', orgId).ilike('item_name', 'Hollow block%').single()).data?.status).toBe('withdrawn')

    // J7: counts on the list, the filter, and whom to call.
    await page.goto('/roodber8/organisations/' + orgId)
    await expect(page.getByText('Prices: 5 current · 4 expiring within 7 days · 1 expired')).toBeVisible()
    await page.goto('/roodber8/supply/partners?prices=expiring')
    await expect(page.getByRole('link', { name })).toBeVisible()
    await expect(page.getByText('5 current · 4 expiring within 7 days · 1 expired')).toBeVisible()
    await page.goto('/roodber8/supply/partners/expiring')
    const expiring = page.locator('tr', { hasText: `Ageing sand ${stamp}` })
    await expect(expiring.getByText('Sales desk')).toBeVisible()
    await expect(expiring.getByText('+251 91 122 3344')).toBeVisible()
    await expect(page.locator('tr', { hasText: `Expired gravel ${stamp}` }).getByText('Expired', { exact: true })).toBeVisible()
    await d.from('supply_contacts').update({ do_not_contact: true }).eq('org_id', orgId)
    await page.reload()
    await expect(page.locator('tr', { hasText: `Ageing sand ${stamp}` }).getByText('Do not contact')).toBeVisible()

    // J8: none of it is public; public product prices are untouched.
    const publicPaths = [`/search?q=${stamp}`, `/api/search/suggest?q=${stamp}`, '/supplies', '/supplies/special-buys', '/sitemap/products.xml', '/']
    // The search pages repeat the search words, so look for the item and partner names, never the bare number.
    const secrets = [name, `Rebar 12mm ${stamp}`, `Dangote cement 50kg ${stamp}`, `Ageing sand ${stamp}`]
    for (const path of publicPaths) {
      const res = await request.get(path)
      expect(res.status(), path).toBeLessThan(500)
      const body = await res.text()
      for (const secret of secrets) expect(body, `${path} shows ${secret}`).not.toContain(secret)
    }
    const anon = createClient(SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '', { auth: { persistSession: false } })
    expect(JSON.stringify((await anon.rpc('search_all', { p_q: String(stamp) })).data ?? '')).not.toContain(String(stamp))
    expect(JSON.stringify((await anon.rpc('search_products', { p_q: String(stamp) })).data ?? '')).not.toContain(String(stamp))
    const { data: productsAfter } = await d.from('products').select('id, price_etb_cents, price_type, updated_at').order('id')
    expect(productsAfter).toEqual(productsBefore)
  } finally {
    await d.from('organisations').delete().eq('id', orgId)
  }
})

test('merging a duplicate moves its prices; for the same item the newer stays current', async ({ page }) => {
  const d = db()
  const stamp = Date.now()
  const cat = await cementCategory()
  const dup = await seedPartner(`Piassa Steel Dup ${stamp}`)
  const keep = await seedPartner(`Piassa Steel Keep ${stamp}`)
  const offer = (orgId: string, cents: number, priceDate: string, key = 'rebar 12mm') => ({ org_id: orgId, category_id: cat, item_name: key, item_key: key, unit: 'piece', price_etb_cents: cents, price_date: priceDate, valid_until: iso(7), source: 'direct_call' })
  try {
    const seeded = await d.from('supplier_offers').insert([offer(dup, 99000, iso(0)), offer(dup, 4000, iso(0), 'hollow block'), offer(keep, 95000, iso(-3))])
    expect(seeded.error).toBeNull()
    await adminSession(page)
    await page.goto(`/roodber8/organisations/${dup}`)
    await page.getByLabel('Find the organisation to merge into').fill(`Piassa Steel Keep ${stamp}`)
    await page.getByRole('button', { name: 'Find', exact: true }).click()
    await page.getByLabel('Merge into', { exact: true }).selectOption(keep)
    await page.getByLabel('I understand this cannot be undone automatically').check()
    await page.getByRole('button', { name: 'Merge', exact: true }).click()
    await expect.poll(async () => (await d.from('audit_log').select('id', { count: 'exact', head: true }).eq('action', 'organisation.merge').eq('entity_id', keep)).count).toBe(1)
    const { data } = await d.from('supplier_offers').select('item_key, price_etb_cents, status').eq('org_id', keep).order('price_etb_cents')
    expect(data).toEqual([
      { item_key: 'hollow block', price_etb_cents: 4000, status: 'current' },
      { item_key: 'rebar 12mm', price_etb_cents: 95000, status: 'superseded' },
      { item_key: 'rebar 12mm', price_etb_cents: 99000, status: 'current' },
    ])
    expect((await d.from('supplier_offers').select('id').eq('org_id', dup)).data).toEqual([])
    expect((await d.from('admin_notes').select('note').eq('entity_id', keep).ilike('note', 'Prices from%')).data).toHaveLength(1)
  } finally {
    await d.from('organisations').delete().in('id', [dup, keep])
  }
})
