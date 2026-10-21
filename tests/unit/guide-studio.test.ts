import { describe, expect, it } from 'vitest'
import { buildGuidePrompt, GUIDE_JSON_LIMITS, type GuidePromptInput } from '@/lib/guides/studio-prompt'
import { checkGuideJson, extractJsonText, sanitiseContent, uniqueSlug } from '@/lib/guides/studio-import'
import { APPROVED_GUIDE_LINKS, approvedInternalPath } from '@/lib/guides/studio-options'
import { GUIDE_TOPIC_BANK, ideaExists } from '@/lib/content/guide-topic-bank'
import { findCheckMarkers, guideCheckMarkers, guideSchema, GUIDE_TOPICS, parseGuideBody, visibleGuide } from '@/lib/guides'

const input: GuidePromptInput = { mode: 'topic', text: 'checking a title deed', topic: 'buying', reader: 'diaspora', guideType: 'how-to', length: 'standard' }

const body = `If you live abroad and want to buy a home, this guide shows you how to check a title deed step by step.\n\n## Step 1: Ask for the documents\nAsk the seller for the title deed [CHECK: name of the title document in Addis Ababa].\n\n- Title deed\n- Seller's ID\n\n## Key points\n- One.\n- Two.\n- Three.\n- Four.`

const good = {
  title: 'How to check a title deed in Ethiopia',
  slug: 'how-to-check-a-title-deed',
  topic: 'buying',
  summary: 'Check who owns a property before you pay anything.',
  content: `${body}\n\nSee [our buying page](/buy) and [property care](https://www.hagerland.com/diaspora/property-care).`,
  faq: [{ question: 'Can I check from abroad?', answer: 'Yes, through a trusted representative.' }],
  seo_title: 'How to check a title deed in Ethiopia',
  seo_description: 'A plain guide to checking ownership before you buy.',
  reader: 'diaspora',
  guide_type: 'how-to',
  read_time_minutes: 7,
  check_markers_count: 99,
}
const none = { slugs: [] as string[], titles: [] as string[] }

describe('buildGuidePrompt', () => {
  const prompt = buildGuidePrompt(input)

  it('sets the role and the brief', () => {
    expect(prompt).toContain('senior property and construction writer')
    expect(prompt).toContain('Guide topic: checking a title deed')
    expect(prompt).toContain('Main reader: Diaspora buyer or owner')
    expect(prompt).toContain('Guide type: Step-by-step how-to')
    expect(prompt).toContain('1,200 to 1,800 words')
    expect(prompt).toContain('"## Step N: <action>"')
    expect(prompt).toContain('"## Doing this from abroad" section (required for this reader)')
  })

  it('carries the accuracy rules and the exact marker format', () => {
    expect(prompt).toContain('Accuracy rules (non-negotiable)')
    expect(prompt).toContain('Never invent laws, proclamation numbers')
    expect(prompt).toContain('[CHECK: what needs verifying]')
    expect(prompt).toContain('as of 2026')
    expect(prompt).toMatch(/consult a lawyer/)
  })

  it('lists only approved links and states HagerLand honestly', () => {
    for (const l of APPROVED_GUIDE_LINKS) expect(prompt).toContain(`- ${l.href} (`)
    expect(prompt).not.toMatch(/- \/(finance|insurance|our-developments)\b/)
    expect(prompt).toContain('[anchor text](/path)')
    expect(prompt).toContain('Include 2 to 4 links')
    expect(prompt).toMatch(/Never use "click here"/)
    expect(prompt).not.toContain('.gov.et')
    expect(prompt).toContain('"coming soon" only')
    expect(prompt).toMatch(/Never say or imply that HagerLand is a lender/)
  })

  it('asks for the exact JSON schema and limits', () => {
    for (const key of ['title', 'slug', 'topic', 'summary', 'content', 'faq', 'seo_title', 'seo_description', 'reader', 'guide_type', 'read_time_minutes', 'check_markers_count']) expect(prompt).toContain(`"${key}":`)
    expect(prompt).toContain(`at most ${GUIDE_JSON_LIMITS.seoTitle} characters`)
    expect(prompt).toContain(`at most ${GUIDE_JSON_LIMITS.seoDescription} characters`)
    expect(prompt).toContain('Reply with ONLY one valid JSON object')
    for (const t of GUIDE_TOPICS) expect(prompt).toContain(`"${t.value}"`)
  })

  it('follows the chosen length, type, reader and mode', () => {
    const p = buildGuidePrompt({ ...input, mode: 'url', text: 'https://example.com/x', reader: 'tenant', guideType: 'glossary', length: 'short' })
    expect(p).toContain('700 to 1,000 words')
    expect(p).toContain('Terms in strict alphabetical order')
    expect(p).toContain('Main reader: Tenant')
    expect(p).toContain('only if the topic genuinely suits')
    expect(p).toContain('thematic inspiration only')
  })
})

describe('guide JSON import', () => {
  it('accepts good JSON, ignores the stated marker count and keeps approved links', () => {
    const r = checkGuideJson(JSON.stringify(good), none)
    expect(r.ok).toBe(true)
    expect(r.guide?.body).toContain('See [our buying page](/buy) and [property care](/diaspora/property-care).')
    expect(r.notes).toEqual([])
    expect(r.markers).toEqual(['name of the title document in Addis Ababa'])
    expect(r.guide).toMatchObject({ slug: 'how-to-check-a-title-deed', topic: 'buying', seo_title: good.seo_title })
  })

  it('strips fences and text around the JSON', () => {
    const r = checkGuideJson(`Here you go:\n\`\`\`json\n${JSON.stringify(good, null, 2)}\n\`\`\`\nHope this helps!`, none)
    expect(r.ok).toBe(true)
    expect(extractJsonText('```json\n{"a":1}\n```')).toBe('{"a":1}')
  })

  it('explains broken JSON with a line hint', () => {
    const r = checkGuideJson('{\n"title": "x",\n"slug": "y"\n"topic": "buying"\n}', none)
    expect(r.ok).toBe(false)
    expect(r.errors[0].message).toMatch(/not valid JSON \(around line \d+\)/)
  })

  it('rejects an unknown topic but accepts a topic label', () => {
    expect(checkGuideJson(JSON.stringify({ ...good, topic: 'finance' }), none).errors.map((e) => e.field)).toContain('topic')
    expect(checkGuideJson(JSON.stringify({ ...good, topic: 'Building and renovating' }), none).guide?.topic).toBe('building')
  })

  it('rejects HTML tags', () => {
    const r = checkGuideJson(JSON.stringify({ ...good, content: `${body}\n\n<script>alert(1)</script><p>Hi</p>` }), none)
    expect(r.ok).toBe(false)
    expect(r.errors.find((e) => e.field === 'content')?.message).toContain('<script>, <p>')
  })

  it('turns every other link into plain words and lists each change', () => {
    const r = checkGuideJson(JSON.stringify({ ...good, content: `${body}\n\nRead [this blog](https://example.com/post), [the ministry](https://www.mudi.gov.et), [admin](/roodber8), [x](javascript:alert(1)) or https://spam.example. Also [jobs](/jobs#latest).` }), none)
    expect(r.ok).toBe(true)
    expect(r.guide?.body).toContain('Read this blog, the ministry, admin, x')
    expect(r.guide?.body).not.toMatch(/example\.com|gov\.et|roodber8|javascript/)
    expect(r.guide?.body).toContain('[jobs](/jobs#latest)')
    expect(r.notes).toEqual(expect.arrayContaining([expect.stringContaining('https://example.com/post'), expect.stringContaining('https://www.mudi.gov.et'), expect.stringContaining('/roodber8'), expect.stringContaining('https://spam.example')]))
  })

  it('shows no links in the title, summary or FAQ', () => {
    const r = checkGuideJson(JSON.stringify({ ...good, summary: 'See [buying](/buy) before you pay.', faq: [{ question: 'Where?', answer: 'On [the rent page](/rent).' }] }), none)
    expect(r.guide?.summary).toBe('See buying before you pay.')
    expect(r.guide?.faq[0].answer).toBe('On the rent page.')
  })

  it('reports fields that are too long, missing or a bad slug', () => {
    const r = checkGuideJson(JSON.stringify({ ...good, title: 'x'.repeat(101), summary: '', seo_title: 'y'.repeat(61), seo_description: 'z'.repeat(156), slug: 'Bad Slug!' }), none)
    const fields = r.errors.map((e) => e.field)
    expect(fields).toEqual(expect.arrayContaining(['title', 'summary', 'seo_title', 'seo_description', 'slug']))
    expect(r.errors.find((e) => e.field === 'summary')?.message).toBe('Summary is missing.')
    expect(r.errors.find((e) => e.field === 'title')?.message).toContain('101 characters')
  })

  it('tidies formatting slips into the guide format', () => {
    const notes: string[] = []
    const { body: out } = sanitiseContent('### Heading\n\n1. First\n2. Second\n\n* Star **bold**', notes)
    expect(out).toBe('## Heading\n\n- First\n- Second\n\n- Star bold')
    expect(parseGuideBody(out).map((b) => b.type)).toEqual(['h2', 'ul', 'ul'])
    expect(notes).toHaveLength(1)
  })

  it('takes the next free slug and flags a duplicate title', () => {
    expect(uniqueSlug('a-guide', [])).toBe('a-guide')
    expect(uniqueSlug('a-guide', ['a-guide', 'a-guide-2'])).toBe('a-guide-3')
    expect(uniqueSlug('x'.repeat(80), ['x'.repeat(80)])).toHaveLength(80)
    const r = checkGuideJson(JSON.stringify(good), { slugs: [good.slug], titles: ['HOW TO CHECK A TITLE DEED IN ETHIOPIA'] })
    expect(r.guide?.slug).toBe(`${good.slug}-2`)
    expect(r.slugChanged).toBe(true)
    expect(r.duplicateTitle).toBe('HOW TO CHECK A TITLE DEED IN ETHIOPIA')
  })

  it('accepts only approved internal paths', () => {
    expect(approvedInternalPath('/supplies/materials-list')).toBe('/supplies/materials-list')
    expect(approvedInternalPath('https://www.hagerland.com/jobs/')).toBe('/jobs')
    expect(approvedInternalPath('/finance')).toBeNull()
    expect(approvedInternalPath('/roodber8')).toBeNull()
  })
})

describe('CHECK markers', () => {
  it('counts markers in every visible field', () => {
    expect(findCheckMarkers('a [CHECK: one] b [check: two]', null, '[CHECK:three]')).toEqual(['one', 'two', 'three'])
    expect(guideCheckMarkers({ title: 'T', summary: 'S', body: 'B', faq: [{ question: 'Q', answer: 'A [CHECK: fee]' }] })).toEqual(['fee'])
  })

  const base = { title: 'A good title', slug: 'a-good-title', topic: 'building', summary: 'A short summary.', body: 'x'.repeat(60), faq_text: '', status: 'draft' }

  it('blocks "Content checked" and publishing while a marker remains', () => {
    const withMarker = { ...base, body: `${'x'.repeat(60)} [CHECK: permit fee] [CHECK: office]` }
    const checked = guideSchema.safeParse({ ...withMarker, reviewed: 'on' })
    expect(checked.success).toBe(false)
    expect(checked.error?.issues.map((i) => i.message)).toContain('Remove or resolve the CHECK notes first (2 remaining).')
    expect(guideSchema.safeParse({ ...withMarker, reviewed: 'on', status: 'published' }).success).toBe(false)
    expect(guideSchema.safeParse({ ...withMarker, status: 'draft' }).success).toBe(true)
    expect(guideSchema.safeParse({ ...base, reviewed: 'on', status: 'published' }).success).toBe(true)
  })

  it('the public guide guard hides any guide with a marker', () => {
    const g = { title: 'T', summary: 'S', body: 'Clean text', faq: [] }
    expect(visibleGuide(g)).toBe(g)
    expect(visibleGuide({ ...g, body: 'Fee [CHECK: amount]' })).toBeNull()
    expect(visibleGuide({ ...g, seo_description: '[CHECK: x]' })).toBeNull()
    expect(visibleGuide(null)).toBeNull()
  })
})

describe('topic ideas bank', () => {
  it('has 40 ideas with valid topics and no repeats', () => {
    expect(GUIDE_TOPIC_BANK).toHaveLength(40)
    expect(new Set(GUIDE_TOPIC_BANK.map((i) => i.title)).size).toBe(40)
    for (const i of GUIDE_TOPIC_BANK) expect(GUIDE_TOPICS.map((t) => t.value)).toContain(i.topic)
  })

  it('marks an idea that already exists (case-insensitive, near-identical)', () => {
    expect(ideaExists('How to choose a contractor for your house', ['HOW TO CHOOSE A CONTRACTOR FOR YOUR HOUSE'])).toBe(true)
    expect(ideaExists('How to choose a contractor for your house', ['How to choose a contractor for your home'])).toBe(true)
    expect(ideaExists('How to choose a contractor for your house', ['Questions to ask a contractor before you sign'])).toBe(false)
  })
})
