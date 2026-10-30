import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { adminSession, assertLocalStack, createUser, db, SUPABASE_URL, trackErrors } from '../helpers'

test.beforeAll(() => assertLocalStack())

const TABLES = ['supply_partners', 'supply_contacts'] as const

test('visitors and signed-in users cannot read or write supply partner records', async () => {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const anon = createClient(SUPABASE_URL, anonKey, { auth: { persistSession: false } })
  const user = await createUser()
  const signedIn = createClient(SUPABASE_URL, anonKey, { auth: { persistSession: false } })
  const { error: signInError } = await signedIn.auth.signInWithPassword({ email: user.email, password: user.password })
  expect(signInError).toBeNull()
  const { data: org } = await db().from('organisations').insert({ kind: 'supplier', name: 'Grants Check Supplies', slug: `grants-check-${Date.now()}` }).select('id').single()
  await db().from('supply_partners').insert({ org_id: org!.id, notes: 'secret' })

  for (const client of [anon, signedIn]) {
    for (const table of TABLES) {
      const read = await client.from(table).select('*').limit(1)
      expect(read.error, `${table} select`).not.toBeNull()
      expect(read.data ?? []).toEqual([])
    }
    const insertPartner = await client.from('supply_partners').insert({ org_id: org!.id })
    expect(insertPartner.error).not.toBeNull()
    const insertContact = await client.from('supply_contacts').insert({ org_id: org!.id, name: 'Intruder' })
    expect(insertContact.error).not.toBeNull()
  }
  await db().from('organisations').delete().eq('id', org!.id)
  await db().auth.admin.deleteUser(user.id)
})

test('admin creates a supply partner record, adds a contact and finds it by phone', async ({ page }) => {
  const errors = trackErrors(page)
  const name = `Tesfaye Cement ${Date.now()}`
  const { data: org } = await db().from('organisations').insert({ kind: 'supplier', name, slug: `tesfaye-cement-${Date.now()}`, status: 'published' }).select('id').single()
  await adminSession(page)

  await page.goto(`/roodber8/organisations/${org!.id}`)
  await expect(page.getByText('Private to HagerLand')).toBeVisible()
  await page.locator('#sp-role-wholesaler').check()
  await page.locator('#sp-source').selectOption('direct_call')
  await page.getByRole('button', { name: 'Create supply partner record' }).click()
  await expect(page.getByRole('button', { name: 'Change status' })).toBeVisible()

  await page.locator('#sp-status').selectOption('contacted')
  await page.getByRole('button', { name: 'Change status' }).click()
  await expect.poll(async () => (await db().from('supply_partners').select('relationship_status').eq('org_id', org!.id).single()).data?.relationship_status).toBe('contacted')

  await page.getByRole('button', { name: 'Add contact' }).click()
  await page.locator('#sc-name').fill('Tesfaye Alemu')
  await page.locator('#sc-phone').fill('0911 23 45 67')
  await page.getByRole('button', { name: 'Add contact' }).click()
  await expect.poll(async () => (await db().from('supply_contacts').select('phone_normalised').eq('org_id', org!.id).maybeSingle()).data?.phone_normalised).toBe('+251911234567')

  await page.goto('/roodber8/supply/partners')
  await page.getByPlaceholder('Name, other name or phone').fill('+251911234567')
  await page.getByRole('button', { name: 'Filter' }).click()
  await expect(page.getByRole('link', { name })).toBeVisible()
  await expect(page.getByText('1 partner')).toBeVisible()

  const audit = await db().from('audit_log').select('action').eq('entity_id', org!.id)
  expect((audit.data ?? []).map((a) => a.action)).toEqual(expect.arrayContaining(['supply.partner.create', 'supply.partner.status', 'supply.contact.create']))
  expect(errors).toEqual([])
  await db().from('organisations').delete().eq('id', org!.id)
})

test('merging a duplicate combines supply partner records and moves its contacts', async ({ page }) => {
  const stamp = Date.now()
  const { data: orgs } = await db()
    .from('organisations')
    .insert([
      { kind: 'supplier', name: `Merkato Steel Dup ${stamp}`, slug: `merkato-steel-dup-${stamp}` },
      { kind: 'supplier', name: `Merkato Steel Keep ${stamp}`, slug: `merkato-steel-keep-${stamp}` },
    ])
    .select('id, name')
  const [dup, keep] = orgs!
  try {
    const seeded = await db().from('supply_partners').insert([
      { org_id: dup.id, roles: ['importer'], aka: ['መርካቶ ብረት'], evidence_paths: ['docs/supply/a.jpg'] },
      { org_id: keep.id, roles: ['wholesaler'], aka: [], evidence_paths: [] },
    ])
    expect(seeded.error).toBeNull()
    await db().from('supply_contacts').insert({ org_id: dup.id, name: 'Sales desk', phone: '0911000000', phone_normalised: '+251911000000' })
    await adminSession(page)
    await page.goto(`/roodber8/organisations/${dup.id}`)
    await page.getByLabel('Find the organisation to merge into').fill(keep.name)
    await page.getByRole('button', { name: 'Find', exact: true }).click()
    await page.getByLabel('Merge into', { exact: true }).selectOption(keep.id)
    await page.getByLabel('I understand this cannot be undone automatically').check()
    await page.getByRole('button', { name: 'Merge', exact: true }).click()
    await expect.poll(async () => (await db().from('audit_log').select('id', { count: 'exact', head: true }).eq('action', 'organisation.merge').eq('entity_id', keep.id)).count).toBe(1)
    const { data: kept } = await db().from('supply_partners').select('roles, aka, evidence_paths').eq('org_id', keep.id).single()
    expect(kept).toEqual({ roles: ['wholesaler', 'importer'], aka: ['መርካቶ ብረት', dup.name], evidence_paths: ['docs/supply/a.jpg'] })
    expect((await db().from('supply_partners').select('org_id').eq('org_id', dup.id)).data).toEqual([])
    expect((await db().from('supply_contacts').select('org_id').eq('name', 'Sales desk').eq('phone_normalised', '+251911000000')).data).toEqual([{ org_id: keep.id }])
  } finally {
    await db().from('organisations').delete().in('id', [dup.id, keep.id])
  }
})
