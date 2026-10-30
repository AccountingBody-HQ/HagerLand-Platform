import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { compliance, daysLeft, deadlineText, googleAgeDays, isExpired, type FieldSourceRow, type ImportedOrg } from '@/lib/imports/compliance'
import { clearingPatch } from '@/lib/imports/compliance-data'

const TODAY = '2026-10-24'
// Fetched at noon in Addis Ababa, N days before TODAY.
const fetched = (daysAgo: number) => new Date(Date.parse(`${TODAY}T09:00:00Z`) - daysAgo * 86_400_000).toISOString()
const google = (field: FieldSourceRow['field'], daysAgo: number, cleared = false): FieldSourceRow => ({ field, source: 'google_places', fetchedAt: fetched(daysAgo), confirmedAt: null, clearedAt: cleared ? fetched(0) : null })
const own = (field: FieldSourceRow['field']): FieldSourceRow => ({ field, source: 'confirmed_with_business', fetchedAt: null, confirmedAt: fetched(1), clearedAt: null })
const org = (sources: FieldSourceRow[], status = 'draft', claimed = false): ImportedOrg => ({ id: 'o', status, claimed, sources })

describe('the 30 days (Google: “up to 30 consecutive calendar days”; the fetch day is day 1)', () => {
  it('day 29 after fetching is the last allowed day; day 30 and 31 are expired', () => {
    expect(daysLeft(fetched(28), TODAY)).toBe(1)
    expect(daysLeft(fetched(29), TODAY)).toBe(0)
    expect(isExpired(fetched(29), TODAY)).toBe(false)
    expect(isExpired(fetched(30), TODAY)).toBe(true)
    expect(isExpired(fetched(31), TODAY)).toBe(true)
    expect(daysLeft(fetched(0), TODAY)).toBe(29)
  })

  it('counts days by the calendar date in Addis Ababa', () => {
    // 21:30 UTC on 23 Oct is already 24 Oct in Addis Ababa: fetched "today".
    expect(googleAgeDays('2026-10-23T21:30:00Z', TODAY)).toBe(0)
    expect(googleAgeDays('2026-10-23T20:30:00Z', TODAY)).toBe(1)
  })

  it('says it plainly', () => {
    expect(deadlineText(12)).toBe('Confirm within 12 days')
    expect(deadlineText(1)).toBe('Confirm within 1 day')
    expect(deadlineText(0)).toBe('Last day to confirm')
    expect(deadlineText(-3)).toBe('Expired — will be cleared')
    expect(deadlineText(null)).toBe('No Google data stored')
  })
})

describe('what happens to each business', () => {
  it('fresh Google data: within 30 days, nothing to clear, cannot be published', () => {
    const c = compliance(org([google('name', 5), google('phone', 5)]), TODAY)
    expect(c).toMatchObject({ state: 'within', daysLeft: 24, plan: { action: 'none', fields: [] } })
    expect(c.publishBlock).toMatch(/Confirm the business’s name/)
  })

  it('expired private business: clear the expired fields, rename it as a lead', () => {
    const c = compliance(org([google('name', 40), google('phone', 40), google('lat_lng', 40), google('description', 40)]), TODAY)
    expect(c.state).toBe('expired')
    // QC-1a: always in FIELD_LABEL order.
    expect(c.plan).toEqual({ action: 'clear', fields: ['name', 'phone', 'description', 'lat_lng'], rename: true })
  })

  it('expired public or claimed business: never cleared automatically, the owner decides', () => {
    expect(compliance(org([google('name', 40)], 'published'), TODAY).plan.action).toBe('decision')
    expect(compliance(org([google('name', 40)], 'draft', true), TODAY).plan.action).toBe('decision')
  })

  it('partly confirmed: only the remaining Google fields keep the timer and are cleared', () => {
    const c = compliance(org([own('name'), own('phone'), google('website', 40), google('address_line', 10)]), TODAY)
    expect(c.googleFields).toEqual(['website', 'address_line'])
    expect(c.plan).toEqual({ action: 'clear', fields: ['website'], rename: false })
    expect(c.publishBlock).toMatch(/Still from Google: website, address/)
  })

  it('fully confirmed: nothing from Google, can be published', () => {
    const c = compliance(org([own('name'), own('phone'), google('lat_lng', 40, true)]), TODAY)
    expect(c).toMatchObject({ state: 'confirmed', daysLeft: null, plan: { action: 'none' }, publishBlock: null })
  })

  it('a new lead (place ID only): nothing stored from Google, but the name must be confirmed before publishing', () => {
    const c = compliance(org([]), TODAY)
    expect(c).toMatchObject({ state: 'lead', googleFields: [], plan: { action: 'none' } })
    expect(c.publishBlock).not.toBeNull()
  })

  it('cleared Google fields no longer count', () => {
    expect(compliance(org([google('name', 40, true), google('phone', 40, true)]), TODAY)).toMatchObject({ state: 'lead', plan: { action: 'none' } })
  })
})

describe('clearing', () => {
  it('empties the columns behind each field; a cleared name becomes the lead placeholder and the slug loses Google’s name', () => {
    const patch = clearingPatch(['phone', 'lat_lng', 'description', 'name'])
    expect(patch).toMatchObject({ phone: null, lat: null, lng: null, description: null, name: 'Unconfirmed lead — refetch from Google' })
    expect(patch.slug).toMatch(/^unconfirmed-lead-[a-z0-9]{6}$/)
    expect(clearingPatch(['website'])).toEqual({ website: null })
  })

  it('the clean-up only clears private, unclaimed businesses, never deletes rows, and audits field names only', () => {
    const src = readFileSync('lib/imports/compliance-data.ts', 'utf8')
    expect(src).toContain(".neq('status', 'published').is('claimed_at', null)")
    expect(src).not.toMatch(/\.delete\(/)
    expect(src).toContain("diff: { fields, reason: opts.reason }")
    // Live only when the owner set the mode; a forced dry run never clears.
    expect(src).toContain("opts.forceDryRun ? 'dry_run' : await getCleanupMode()")
    expect(src).toContain("data?.value === 'live' ? 'live' : 'dry_run'")
  })

  it('the Imports tool stores only the place ID: no Google name, details, AI description or coordinates', () => {
    const src = readFileSync('app/roodber8/actions/imports.ts', 'utf8')
    const insert = src.slice(src.indexOf(".from('organisations')\n    .insert({"), src.indexOf('.select(\'id\')'))
    for (const banned of ['phone', 'website', 'address_line', 'lat', 'lng', 'description', 'place.name']) expect(insert, banned).not.toContain(banned)
    expect(insert).toContain('name: UNCONFIRMED_NAME')
    expect(src).toContain("listing_name: ''")
    expect(src).not.toContain('draftDescription')
  })
})
