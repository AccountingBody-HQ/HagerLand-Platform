import { expect, test } from '@playwright/test'
import { adminSession, createProvider, createUser, db, mailWithSubject, randomPhone, signIn } from './helpers'

/** Provider pillars and verified reviews (spec 26.12). */

test.describe.configure({ mode: 'serial' })

async function wonJob(customer: { id: string; email: string }, orgId: string) {
  const d = db()
  const { data: cat } = await d.from('service_categories').select('id').eq('slug', 'plumbers').single()
  const { data: r } = await d.from('service_requests').insert({ vertical_key: 'contractors', service_category_id: cat!.id, title: 'E2E reviewed job', details: 'Fix the pipes', name: 'Hanna Customer', phone: randomPhone(), email: customer.email, requester_user_id: customer.id, status: 'won' }).select('id').single()
  const { data: m } = await d.from('service_request_matches').insert({ request_id: r!.id, org_id: orgId, status: 'won', quote_amount_minor: 100000, quote_currency: 'ETB' }).select('id').single()
  return { requestId: r!.id, matchId: m!.id }
}

test('reviews: only for a won job, one per job, moderated, one reply; shown with an average; rating data only from three', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'admin at desktop width')
  test.setTimeout(240_000)
  const provider = await createProvider({ name: `E2E Reviewed Plumbers ${Date.now()}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole', verified: true })
  const customer = await createUser({ name: 'Hanna Customer' })

  // Not won: the database refuses a review.
  const { data: open } = await db().from('service_requests').insert({ vertical_key: 'contractors', title: 'E2E open job', name: 'Open Job', phone: randomPhone(), status: 'matched' }).select('id').single()
  const { data: openMatch } = await db().from('service_request_matches').insert({ request_id: open!.id, org_id: provider.orgId, status: 'accepted' }).select('id').single()
  const refused = await db().from('reviews').insert({ org_id: provider.orgId, request_id: open!.id, match_id: openMatch!.id, author_name: 'X', rating: 5, body: 'This should never be allowed to exist.' })
  expect(refused.error?.message).toContain('Reviews are only for jobs')

  const job = await wonJob(customer, provider.orgId)
  const cp = await browser.newPage()
  await signIn(cp, customer.email, customer.password)
  await cp.goto(`/account/service-requests/${job.requestId}`)
  await expect(cp.getByRole('heading', { name: /How did it go with E2E Reviewed Plumbers/ })).toBeVisible()
  await cp.locator('label').filter({ hasText: '4 stars' }).click()
  await expect(cp.getByRole('radio', { name: '4 stars' })).toBeChecked()
  await cp.getByLabel('How did the job go?').fill('On time, tidy and fairly priced. Would use again.')
  await cp.getByRole('button', { name: 'Send my review' }).click()
  await expect(cp.getByText('Your review will appear once our team has checked it.')).toBeVisible()
  const dup = await db().from('reviews').insert({ org_id: provider.orgId, request_id: job.requestId, match_id: job.matchId, author_name: 'Again', rating: 1, body: 'A second review of the same job.' })
  expect(dup.error?.code).toBe('23505')

  await page.goto(`/company/${provider.orgSlug}`)
  await expect(page.getByRole('heading', { name: 'Reviews' })).toHaveCount(0)

  await adminSession(page)
  await page.goto('/roodber8/reviews')
  const row = page.getByRole('row').filter({ hasText: 'On time, tidy' })
  await row.getByRole('button', { name: 'Publish' }).click()
  await expect(page.getByText('Published.')).toBeVisible()
  expect((await mailWithSubject(provider.user.email, 'New review on HagerLand')).text).toContain('reply once')

  const pp = await browser.newPage()
  await signIn(pp, provider.user.email, provider.user.password)
  await pp.goto('/account/reviews')
  await pp.getByLabel('Your reply').fill('Thank you, Hanna.')
  await pp.getByRole('button', { name: 'Publish reply' }).click()
  await expect(pp.getByText('Your reply: Thank you, Hanna.')).toBeVisible()
  const again = await db().from('reviews').update({ provider_reply: 'Changed' }).eq('match_id', job.matchId)
  expect(again.error?.message).toContain('already replied')

  await page.goto(`/company/${provider.orgSlug}`)
  await expect(page.getByRole('heading', { name: 'Reviews' })).toBeVisible()
  await expect(page.getByText('4 out of 5 from 1 verified review')).toBeVisible()
  await expect(page.getByText('Reply from E2E Reviewed Plumbers')).toBeVisible()
  let ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join('')
  expect(ld).not.toContain('AggregateRating')

  // Two more published reviews from other won jobs: now three, so rating data appears.
  for (const n of [5, 3]) {
    const other = await createUser({ name: `Customer ${n}` })
    const j = await wonJob(other, provider.orgId)
    await db().from('reviews').insert({ org_id: provider.orgId, request_id: j.requestId, match_id: j.matchId, author_name: `Customer ${n}`, rating: n, body: 'A verified review from a test job.', status: 'published', published_at: new Date().toISOString() })
  }
  await page.goto('/roodber8/reviews')
  await page.goto('/roodber8/reviews?status=published')
  // Moderating any review refreshes the cache; here force a fresh render with a pending one rejected.
  const extra = await createUser({ name: 'Rejected One' })
  const j4 = await wonJob(extra, provider.orgId)
  await db().from('reviews').insert({ org_id: provider.orgId, request_id: j4.requestId, match_id: j4.matchId, author_name: 'Rejected One', rating: 1, body: 'Contains a phone number 0911 000000.' })
  await page.goto('/roodber8/reviews')
  const r4 = page.getByRole('row').filter({ hasText: 'Contains a phone number' })
  await r4.getByRole('button', { name: 'Reject' }).click()
  await expect(page.getByText('Give a reason for rejecting')).toBeVisible()
  await r4.getByLabel('Reason for rejecting (private)').fill('Personal details')
  await r4.getByRole('button', { name: 'Reject' }).click()
  await expect(page.getByText('Rejected.')).toBeVisible()
  await page.goto(`/company/${provider.orgSlug}`)
  await expect(page.getByText('4 out of 5 from 3 verified reviews')).toBeVisible()
  ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).join('')
  expect(ld).toContain('"AggregateRating"')
  expect(ld).toContain('"reviewCount":3')
  await cp.close()
  await pp.close()
})

test('providers choose the pillars they serve; their lead list shows the pillar of each lead', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'one width is enough')
  const provider = await createProvider({ name: `E2E Pillar Provider ${Date.now()}`, serviceSlug: 'plumbers', locationPath: 'addis-ababa/bole' })
  await signIn(page, provider.user.email, provider.user.password)
  await page.goto('/account/company')
  await page.getByLabel('Repairs and maintenance').check()
  await page.getByLabel('Design, building and development').check()
  await page.getByRole('button', { name: 'Submit changes' }).click()
  await expect(page.getByText(/Your changes are with our team/)).toBeVisible()
  const { data } = await db().from('organisation_pillars').select('pillar_key').eq('org_id', provider.orgId)
  expect((data ?? []).map((r) => r.pillar_key).sort()).toEqual(['build', 'maintain'])

  const { data: cat } = await db().from('service_categories').select('id').eq('slug', 'plumbing-repairs').single()
  const { data: r } = await db().from('service_requests').insert({ vertical_key: 'repairs-maintenance', service_category_id: cat!.id, title: 'E2E leak lead', name: 'Lead', phone: randomPhone(), status: 'matched' }).select('id').single()
  await db().from('service_request_matches').insert({ request_id: r!.id, org_id: provider.orgId })
  await page.goto('/account/requests')
  await expect(page.getByText(/Repair & Maintain Property/).first()).toBeVisible()
})
