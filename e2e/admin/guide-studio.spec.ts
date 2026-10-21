import { expect, test } from '@playwright/test'
import { adminSession, db } from '../helpers'

/** Guide studio: prompt builder and JSON import (local stack only; nothing here runs against live or preview). */

test.describe.configure({ mode: 'serial' })

const TITLE = `Studio test guide ${Date.now()}`

const sample = {
  title: TITLE,
  slug: `studio-test-guide-${Date.now()}`,
  topic: 'building',
  summary: 'A test guide imported through the Guide studio.',
  content:
    'If you are planning a build, this guide shows you what to check first.\n\n## Step 1: Check the permit\nAsk the city office about the permit [CHECK: which office issues building permits].\n\n- Drawings\n- Title deed\n\n## Key points\n- One.\n- Two.\n- Three.\n- Four.\n\n## How HagerLand can help\nSend your list through [our materials list page](/supplies/materials-list).',
  faq: [{ question: 'Do I need an engineer?', answer: 'Usually, yes.' }],
  seo_title: 'Studio test guide',
  seo_description: 'A test guide.',
  reader: 'self-builder',
  guide_type: 'how-to',
  read_time_minutes: 1,
  check_markers_count: 0,
}

test('signed out, the studio and import pages send you to the admin login', async ({ page }) => {
  for (const path of ['/roodber8/guides/studio', '/roodber8/guides/import']) {
    await page.goto(path)
    await expect(page).toHaveURL(/\/roodber8-login/)
  }
})

test('admin builds and copies a prompt, and an idea fills the form', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await adminSession(page)
  await page.goto('/roodber8/guides')
  await page.getByRole('link', { name: 'Guide studio' }).click()
  await expect(page.getByRole('heading', { name: 'Guide studio', level: 1 })).toBeVisible()
  await page.getByRole('radio', { name: 'Idea' }).click()
  await page.getByLabel(/^Idea/).fill('What to agree with a contractor before work starts')
  await page.getByLabel('Main reader').selectOption('self-builder')
  await page.getByLabel('Guide type').selectOption('checklist')
  await page.getByLabel('Length').selectOption('short')
  await page.getByRole('button', { name: 'Build prompt' }).click()
  const prompt = page.getByLabel('Prompt')
  await expect(prompt).toHaveValue(/Guide idea from the editor: What to agree with a contractor/)
  await expect(prompt).toHaveValue(/\[CHECK: what needs verifying\]/)
  await expect(prompt).toHaveValue(/700 to 1,000 words/)
  await page.getByRole('button', { name: 'Copy prompt' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Copied' })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('senior property and construction writer')
  await expect(page.getByRole('link', { name: '→ Import guide JSON' })).toHaveAttribute('href', '/roodber8/guides/import')
  await page.getByRole('button', { name: /Solar power for homes in Ethiopia/ }).click()
  await expect(page.getByLabel(/^Idea/)).toHaveValue('Solar power for homes in Ethiopia: sizing and costs')
  await expect(page.getByLabel('Guide type')).toHaveValue('cost')
})

test('admin validates JSON, sees the preview and CHECK notes, imports a draft that cannot be checked or published', async ({ page }) => {
  test.setTimeout(90_000)
  await adminSession(page)
  await page.goto('/roodber8/guides/import')
  await page.getByLabel('Guide JSON').fill('{ "title": "broken" "slug": "x" }')
  await page.getByRole('button', { name: 'Validate' }).click()
  await expect(page.getByText(/not valid JSON/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Import as draft' })).toBeDisabled()

  await page.getByLabel('Guide JSON').fill(`Here is the guide:\n\`\`\`json\n${JSON.stringify(sample, null, 2)}\n\`\`\``)
  await page.getByRole('button', { name: 'Validate' }).click()
  await expect(page.getByText('The JSON is valid and ready to import.')).toBeVisible()
  await expect(page.getByText('1 CHECK note to resolve before this guide can be published')).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'which office issues building permits' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: TITLE })).toBeVisible()
  await expect(page.getByText('Send your list through our materials list page.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'our materials list page' })).toHaveAttribute('href', '/supplies/materials-list')

  await page.getByRole('button', { name: 'Import as draft' }).click()
  await expect(page.getByText('Imported as a draft marked “Needs AB review”.')).toBeVisible()
  const { data: g } = await db().from('guides').select('id, slug, status, needs_review, published_at').eq('title', TITLE).single()
  expect(g).toMatchObject({ status: 'draft', needs_review: true, published_at: null })
  try {
    const { data: logs } = await db().from('audit_log').select('action, diff').eq('entity_id', g!.id)
    expect(logs?.[0]).toMatchObject({ action: 'guide.import', diff: { source: 'Guide studio import' } })

    await page.getByRole('link', { name: 'Open the guide to review it' }).click()
    await expect(page.getByText('Remove or resolve the CHECK notes first (1 remaining).').first()).toBeVisible()
    await expect(page.getByLabel(/Content checked/)).toBeDisabled()
    await page.getByLabel('Status').selectOption('published')
    await page.getByRole('button', { name: 'Save guide' }).click()
    await expect(page.getByRole('alert').filter({ hasText: 'Remove or resolve the CHECK notes first (1 remaining).' })).toBeVisible()
    expect((await db().from('guides').select('status').eq('id', g!.id).single()).data?.status).toBe('draft')
    expect((await page.goto(`/guides/${g!.slug}`))?.status()).toBe(404)
  } finally {
    await db().from('guides').delete().eq('id', g!.id)
  }
})
