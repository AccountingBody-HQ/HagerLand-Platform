import { expect, test } from '@playwright/test'
import { adminSession, db } from './helpers'

/** Pillar registry, operating modes, stage gates and licence settings (spec 26.1–26.3). */

test.describe.configure({ mode: 'serial' })

test('launch modes: jobs is live, finance and insurance are coming soon, vertical switches follow pillars', async ({ page }) => {
  const { data } = await db().from('verticals').select('key, status').in('key', ['jobs', 'finance', 'insurance', 'property', 'our-developments'])
  expect(Object.fromEntries((data ?? []).map((r) => [r.key, r.status]))).toEqual({ jobs: 'live', finance: 'coming_soon', insurance: 'coming_soon', property: 'live', 'our-developments': 'coming_soon' })
  await adminSession(page)
  await page.goto('/roodber8/verticals')
  await expect(page.getByRole('group', { name: 'Status of Jobs & Recruitment' })).toHaveCount(0)
  await expect(page.getByRole('group', { name: 'Status of Diaspora Services' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Follows pillar modes' }).first()).toBeVisible()
})

test('admin: aggregate needs enough verified partners; direct needs the checklist; switching off is immediate', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  await adminSession(page)
  await page.goto('/roodber8/pillars')
  await expect(page.getByRole('heading', { name: /^\d+\. / })).toHaveCount(10)

  // Finance: Aggregate is refused with no partners.
  await page.getByRole('switch', { name: 'Aggregate for Property Finance' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('status')).toContainText('Verified, live providers or partners for this pillar: 0')
  await expect(dialog.getByRole('button', { name: 'Switch on' })).toBeDisabled()
  await dialog.getByRole('button', { name: 'Cancel' }).click()

  // Build: Direct on with the checklist (regulatory note pre-filled), then off again.
  await page.getByRole('switch', { name: 'Direct for Build & Develop Property' }).click()
  await expect(dialog.getByLabel('Clearance note')).toHaveValue('Regulatory clearance confirmed by AB, 15 Oct 2026')
  await dialog.getByRole('button', { name: 'Switch on' }).click()
  await expect(page.getByText('Confirm that HagerLand (or its partners) can deliver this.')).toBeVisible()
  await dialog.getByLabel('HagerLand has the people and capacity to deliver this itself').check()
  await dialog.getByLabel('Named owner (responsible person)').fill('AB')
  await dialog.getByRole('button', { name: 'Switch on' }).click()
  await expect(page.getByText('Direct is now on for Build & Develop Property.')).toBeVisible()
  await expect(page.getByRole('switch', { name: 'Direct for Build & Develop Property' })).toHaveAttribute('aria-checked', 'true')
  const { data: gate } = await db().from('pillar_gate_checks').select('owner_name, regulatory_note, regulatory_date, actor').eq('pillar_key', 'build').eq('mode', 'direct').order('created_at', { ascending: false }).limit(1).single()
  expect(gate).toMatchObject({ owner_name: 'AB', regulatory_note: 'Regulatory clearance confirmed by AB, 15 Oct 2026', regulatory_date: '2026-10-15', actor: 'admin' })
  await page.getByRole('switch', { name: 'Direct for Build & Develop Property' }).click()
  await expect(page.getByText('Direct is now off for Build & Develop Property.')).toBeVisible()
  const { data: audit } = await db().from('audit_log').select('action').in('action', ['pillar.mode.on', 'pillar.mode.off']).order('created_at', { ascending: false }).limit(2)
  expect((audit ?? []).map((a) => a.action)).toEqual(['pillar.mode.off', 'pillar.mode.on'])

  // Interest capture switches without a gate.
  await page.getByRole('switch', { name: 'Interest capture for Knowledge & Advice' }).click()
  await expect(page.getByText('Interest capture is now on for Knowledge & Advice.')).toBeVisible()
  await page.getByRole('switch', { name: 'Interest capture for Knowledge & Advice' }).click()
  await expect(page.getByText('Interest capture is now off for Knowledge & Advice.')).toBeVisible()
})

test('licence references entered in Settings appear in the footer, and disappear when cleared', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  await adminSession(page)
  await page.goto('/roodber8/settings')
  const form = page.locator('form').filter({ has: page.getByLabel('Estate agency: licence or approval number') })
  await form.getByLabel('Estate agency: licence or approval number').fill('EA-2026-0042')
  await form.getByLabel('Issuing authority').first().fill('Addis Ababa Trade Bureau')
  await form.getByLabel('Licence holder (legal entity)').first().fill('HagerLand PLC')
  await form.getByRole('button', { name: 'Save' }).click()
  await expect(form.getByText('Saved. The website updates within a minute.')).toBeVisible()
  await page.goto('/about')
  await expect(page.getByTestId('footer-licence')).toContainText('Estate agency licence EA-2026-0042, issued by Addis Ababa Trade Bureau, to HagerLand PLC')
  await page.goto('/roodber8/settings')
  await form.getByLabel('Estate agency: licence or approval number').fill('')
  await form.getByRole('button', { name: 'Save' }).click()
  await expect(form.getByText('Saved. The website updates within a minute.')).toBeVisible()
  await page.goto('/about')
  await expect(page.getByTestId('footer-licence')).toHaveCount(0)
})
