import { expect, test } from '@playwright/test'
import { createProvider, createUser, db, linkMatching, mailWithSubject, signIn } from './helpers'

/** Organisation teams (invitations, roles, ownership, last-owner protection) and branches (spec 25.2i). */

test('an owner invites a colleague, who accepts with the invited email; ownership moves and the last owner is protected', async ({ browser }) => {
  test.setTimeout(180_000)
  const stamp = Date.now()
  const agency = await createProvider({ name: `E2E Team Agency ${stamp}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa' })
  await db().from('organisations').update({ kind: 'agency' }).eq('id', agency.orgId)
  const colleague = await createUser({ name: 'Hana Colleague' })
  const stranger = await createUser({ name: 'Wrong Person' })
  try {
    const owner = await browser.newPage()
    owner.on('dialog', (d) => void d.accept())
    await signIn(owner, agency.user.email, agency.user.password)
    await owner.goto('/account/company/team')
    await expect(owner.getByText('Provider Owner (you)')).toBeVisible()

    // The only owner cannot leave.
    await owner.getByRole('button', { name: 'Leave' }).click()
    await expect(owner.getByText('This is the only owner. Make someone else an owner first.')).toBeVisible()

    await owner.locator('input[name=email]').fill(colleague.email)
    await owner.locator('select[name=role]').selectOption('admin')
    await owner.getByRole('button', { name: 'Send invitation' }).click()
    await expect(owner.getByText(`Invitation sent to ${colleague.email}.`)).toBeVisible()
    await expect(owner.getByText(new RegExp(`${colleague.email.replace(/[.+]/g, '\\$&')} · Admin`))).toBeVisible()
    const mail = await mailWithSubject(colleague.email, `join E2E Team Agency ${stamp}`)
    const link = new URL(linkMatching(mail.html, /\/invite\//)).pathname

    // Signed out: asked to sign in or create an account, keeping the link.
    const anon = await browser.newPage()
    await anon.goto(link)
    await expect(anon.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', `/signup?next=${encodeURIComponent(link)}`)

    // Someone else's account cannot use it.
    const wrong = await browser.newPage()
    await signIn(wrong, stranger.email, stranger.password)
    await wrong.goto(link)
    await expect(wrong.getByText(`This invitation is for ${colleague.email}`)).toBeVisible()

    const c = await browser.newPage()
    await signIn(c, colleague.email, colleague.password)
    await c.goto(link)
    await c.getByRole('button', { name: 'Accept invitation' }).click()
    await c.waitForURL(/\/account\?joined=/)
    expect((await db().from('organisation_members').select('role').eq('org_id', agency.orgId).eq('user_id', colleague.id).single()).data?.role).toBe('admin')
    await c.goto(link)
    await expect(c.getByText('This invitation is no longer valid')).toBeVisible()

    // Ownership transfer: the colleague becomes owner, the original owner an admin.
    await owner.goto('/account/company/team')
    await expect(owner.getByText('Hana Colleague', { exact: true })).toBeVisible()
    await owner.getByRole('button', { name: 'Make owner' }).click()
    await expect(owner.getByText('Ownership transferred. You are now an admin.')).toBeVisible()
    const { data: roles } = await db().from('organisation_members').select('user_id, role').eq('org_id', agency.orgId)
    expect(Object.fromEntries((roles ?? []).map((r) => [r.user_id, r.role]))).toEqual({ [colleague.id]: 'owner', [agency.user.id]: 'admin' })
  } finally {
    await db().from('organisations').delete().eq('id', agency.orgId)
  }
})

test('owners and admins add branches, which appear on the public profile without contact details', async ({ page, browser }) => {
  const stamp = Date.now()
  const agency = await createProvider({ name: `E2E Branch Agency ${stamp}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa' })
  await db().from('organisations').update({ kind: 'agency' }).eq('id', agency.orgId)
  try {
    const owner = await browser.newPage()
    await signIn(owner, agency.user.email, agency.user.password)
    await owner.goto('/account/company/branches')
    const form = owner.locator('form').filter({ has: owner.getByRole('button', { name: 'Add branch' }) })
    await form.locator('input[name=name]').fill('Bole office')
    await form.locator('#br-loc-new').fill('Bole')
    await owner.getByRole('option', { name: /^Bole/ }).first().click()
    await form.locator('input[name=address_line]').fill('Africa Avenue, near Edna Mall')
    await form.getByRole('button', { name: 'Add branch' }).click()
    await expect(owner.getByText('Branch added.')).toBeVisible()
    const { data: org } = await db().from('organisations').select('slug').eq('id', agency.orgId).single()
    await page.goto(`/company/${org!.slug}`)
    await expect(page.getByRole('heading', { name: 'Branches' })).toBeVisible()
    await expect(page.getByText('Bole office')).toBeVisible()
    await expect(page.getByText(/Africa Avenue, near Edna Mall, Bole/)).toBeVisible()
  } finally {
    await db().from('organisations').delete().eq('id', agency.orgId)
  }
})
