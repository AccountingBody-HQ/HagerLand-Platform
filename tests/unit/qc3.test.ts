import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PILLAR_CONTENT } from '@/lib/content/pillars'
import { callbackSchema } from '@/lib/callbacks'
import { REGISTER_PATH } from '@/lib/supply/partner-rules'

/** QC-3 small tidy-up (AB, 31 Oct 2026): partner registration links, market appraisal wording, call-back defaults. */

const read = (p: string) => readFileSync(p, 'utf8')
const ROW_CONDITION = 'supplySwitches.homeBusinessRow && supplySwitches.registration'

describe('QC-3: "Sell through HagerLand" links', () => {
  it('List with us: the approved section, at the end, linking to the register page', () => {
    const page = read('app/(site)/list-with-us/page.tsx')
    expect(page).toContain('Supply building materials?')
    expect(page).toContain('<p className="mt-2 text-muted">Reach builders, homeowners and contractors across Ethiopia through HagerLand Supply.</p>')
    expect(page).toMatch(/<ButtonLink href=\{REGISTER_PATH\} className="lg:min-w-52">\s+Sell through HagerLand\s+<\/ButtonLink>/)
    expect(page.indexOf('Supply building materials?')).toBeGreaterThan(page.indexOf('Questions</h2>'))
    expect(REGISTER_PATH).toBe('/sell-through-hagerland/register')
  })
  it('homepage professionals card: one extra link under the existing pair, in the card\'s own secondary style', () => {
    const section = read('components/home/ServicesSection.tsx')
    expect(section).toContain("{t('Sell through HagerLand')}")
    expect(section).toMatch(/\{sellThrough && \(\s+<Link href=\{lh\(REGISTER_PATH\)\} className="mt-3 inline-flex min-h-12 items-center justify-center rounded-md px-5 font-semibold text-white ring-1 ring-white\/30 hover:bg-white\/10">/)
    expect(section.match(/REGISTER_PATH\)/g)).toHaveLength(1)
  })
  it('both new links follow the homepage row\'s two switches', () => {
    const home = read('app/(site)/page.tsx')
    expect(home).toContain(`{${ROW_CONDITION} && <BusinessRow t={t} lh={lh} />}`)
    expect(home).toContain(`sellThrough={${ROW_CONDITION}}`)
    const list = read('app/(site)/list-with-us/page.tsx')
    expect(list).toContain(`const sellThrough = ${ROW_CONDITION}`)
    expect(list).toContain('readSupplySwitchesCached()')
    expect(list).toContain('{sellThrough && (')
  })
})

describe('QC-3: market appraisal wording', () => {
  it('Property hub: "Book a market appraisal", never "Book a valuation"', () => {
    const labels = [...PILLAR_CONTENT.buy.actions, ...PILLAR_CONTENT.buy.direct].filter((a) => a.href === '/agency/valuation').map((a) => a.label)
    expect(labels).toEqual(['Book a market appraisal', 'Book a market appraisal'])
    expect(read('lib/content/pillars.ts')).not.toContain('Book a valuation')
  })
  it('account agency page', () => {
    const page = read('app/(account)/account/agency/page.tsx')
    expect(page).toContain('description="Book a market appraisal, or a viewing on a property marketed by HagerLand, and you can follow it here."')
    expect(page).toContain('<ButtonLink href="/agency/valuation">Book a market appraisal</ButtonLink>')
    expect(page).toContain('<Group title="Market appraisals"')
    expect(page).toContain('title={`Market appraisal for ${')
    expect(page).not.toMatch(/"Book a valuation|>Book a valuation<|"Valuations"|`Valuation for/)
  })
})

describe('QC-3: call-back form starts with nothing chosen', () => {
  it('no chip group has a default; the other phone forms keep theirs', () => {
    const form = read('components/jobs/CallbackForm.tsx')
    expect(form).toMatch(/name="language" options=\{[^}]+\}\)\)\} invalid=/)
    expect(form).toMatch(/name="time_of_day" options=\{[^}]+\}\)\)\} invalid=/)
    expect(form).not.toContain('defaultValue="am"')
    expect(form).not.toContain('defaultValue="any"')
    expect(read('components/jobs/ChoiceChips.tsx')).toContain('defaultValue?: string')
    expect(read('components/jobs/PhoneApplyForm.tsx')).toContain('defaultValue="am"')
    expect(read('components/jobs/WorkerRegisterForm.tsx')).toContain('defaultValue="now"')
  })
  it('the country list starts empty and no tick starts ticked', () => {
    const form = read('components/jobs/CallbackForm.tsx')
    expect(form).toContain('<Select id="cb-country" name="country_code" defaultValue=""')
    expect(form).not.toMatch(/defaultChecked/)
    expect(form).toContain('useState(false)')
  })
  it('language and time stay required on the server (the existing highlighted-fields answer)', () => {
    const base = { name: 'Abebe', phone: '0911234567', need: 'Ten masons', area: 'Bole', consent: 'on', based_abroad: '' }
    const empty = callbackSchema.safeParse(base)
    expect(empty.success).toBe(false)
    expect(empty.error?.issues.map((i) => i.path[0]).sort()).toEqual(['language', 'time_of_day'])
    expect(callbackSchema.safeParse({ ...base, language: 'am', time_of_day: 'afternoon' }).success).toBe(true)
  })
})

describe('QC-3: notes', () => {
  it('runbook, launch report and CLAUDE.md lines', () => {
    expect(read('docs/RUNBOOK.md')).toContain('Uptime monitor (D4, 31 Oct 2026): UptimeRobot (free plan) checks https://www.hagerland.com/api/health every 5 minutes')
    expect(read('docs/RUNBOOK.md')).toContain('Rate-limit clean-up (D5): Vercel Production environment variable CRON_PURGE_RATE_LIMITS=true since 31 Oct 2026 (Config type).')
    expect(read('docs/LAUNCH_REPORT.md')).toContain("LR-2 done (31 Oct 2026): Supply Partner Agreement version 2")
    expect(read('CLAUDE.md')).toContain("Single plan: AB's Claude Doc 'HagerLand Development Roadmap to v1 Complete' (31 Oct 2026)")
  })
})
