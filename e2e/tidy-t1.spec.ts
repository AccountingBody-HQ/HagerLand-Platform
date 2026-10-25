import { expect, test, type Page } from '@playwright/test'
import { asFreshVisitor, createUser, db, linkMatching, mailWithSubject, randomPhone, uniqueEmail } from './helpers'

/** Tidy T-1: the "new link" email states the real number of days its link works, for guests and signed-in customers. */

async function send(page: Page, slug: string, email: string) {
  const title = `E2E T1 ${slug} ${Date.now()}`
  await page.goto(`/request-service/${slug}`)
  if (slug === 'staffing') {
    await page.getByLabel('Which roles do you need to fill?').fill('Ten masons')
    await page.getByLabel('How many people?').fill('10')
    await page.getByText('Temporary or day labour', { exact: true }).click()
    await page.getByLabel('Describe the roles and the work').fill('Block work on a G+2 house in Bole.')
  } else {
    await page.getByLabel('Describe what you need').fill('Work on a house in Bole, details to follow.')
  }
  await page.getByLabel('Give your request a short title').fill(title)
  await page.locator('#sr-location').fill('Bole')
  await page.getByRole('option', { name: /^Bole/ }).first().click()
  await page.getByLabel('Your name').fill('Tigist Customer')
  await page.locator('#sr-phone').fill(randomPhone())
  await page.getByLabel('Email').fill(email)
  await page.getByRole('button', { name: 'Send my request' }).click()
  await page.waitForURL('**/request-service/sent?ref=*')
  const { data } = await db().from('service_requests').select('id, reference').eq('title', title).single()
  return { id: data!.id as string, reference: data!.reference as string }
}

async function newLink(page: Page, email: string, reference: string, id: string) {
  await page.goto('/requests/resend')
  await page.locator('#rl-email').fill(email)
  await page.locator('#rl-ref').fill(reference)
  await page.getByRole('button', { name: 'Email me a new link' }).click()
  await expect(page.getByText('If the details match a request, we have emailed a new link.')).toBeVisible()
  const mail = await mailWithSubject(email, `Your link to request ${reference}`)
  const days = Number(/The link works for (\d+) days/.exec(mail.text)?.[1])
  const { data } = await db().from('service_requests').select('access_token_expires_at').eq('id', id).single()
  const real = Math.round((new Date(data!.access_token_expires_at as string).getTime() - Date.now()) / 86_400_000)
  return { mail, days, real }
}

for (const slug of ['staffing', 'plumbers', 'renovation']) {
  test(`${slug}: guest and signed-in customers are told the link's real lifetime (never 0)`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'the email does not depend on screen width')
    test.setTimeout(180_000)
    await asFreshVisitor(page)
    // Guest.
    const guestEmail = uniqueEmail(`t1-guest-${slug}`)
    const g = await send(page, slug, guestEmail)
    const guest = await newLink(page, guestEmail, g.reference, g.id)
    expect(guest.days).toBe(guest.real)
    expect(guest.days).toBeGreaterThan(0)

    // Signed in.
    const user = await createUser({ name: 'Signed In Customer' })
    await page.goto('/login')
    await page.fill('#login-email', user.email)
    await page.fill('#login-password', user.password)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.waitForURL((u) => u.pathname.startsWith('/account') || u.pathname.startsWith('/onboarding'))
    const s = await send(page, slug, user.email)
    const signed = await newLink(page, user.email, s.reference, s.id)
    expect(signed.days).toBe(signed.real)
    expect(signed.days).toBeGreaterThan(0)
    expect(signed.mail.text).not.toContain('works for 0 days')
    // The link in the email opens the request.
    const link = new URL(linkMatching(signed.mail.html, /\/requests\//))
    await page.context().clearCookies()
    await page.goto(`${link.pathname}${link.search}`)
    await expect(page.getByText(s.reference)).toBeVisible()
    // Only the number changed: the wording is the service's own.
    const body = slug === 'staffing' ? `Use the button to see request ${s.reference}. The link works for ${signed.days} days. Older links no longer work.` : `Use the button to see request ${s.reference} and any quotes. The link works for ${signed.days} days. Older links no longer work.`
    expect(signed.mail.text).toContain(body)
  })
}
