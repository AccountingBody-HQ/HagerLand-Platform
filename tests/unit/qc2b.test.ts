import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { VERIFICATION_INFO } from '@/lib/org-labels'
import { badgeExplain } from '@/lib/verification'

/** QC-2b wording tidy (AB, 30 Oct 2026): "market appraisal" for our price opinion, "delivery in Addis Ababa", older badges. */

const read = (p: string) => readFileSync(p, 'utf8')

describe('QC-2b wording tidy', () => {
  it('our price opinion is a market appraisal (V1–V6)', () => {
    const agency = read('app/(site)/agency/page.tsx')
    expect(agency).toContain('<h2 className="hl-h3">Book a market appraisal</h2>')
    expect(agency).toContain('Book a market appraisal <ArrowRight')
    expect(agency).not.toContain('Book a valuation')
    expect(read('app/(site)/agency/[service]/page.tsx')).toContain('Book a market appraisal first')
    expect(read('lib/content/pillars.ts')).toContain("'Market appraisal, marketing, viewings and offers handled by our agents.'")
    const content = read('lib/content/agency.ts')
    expect(content).toContain("'Advice on the asking price, with a market appraisal if you want one'")
    expect(content).toContain("{ label: 'Market appraisal coordination', slug: 'sell' }")
    expect(read('app/(site)/diaspora/property-care/page.tsx')).toContain('Yes. We can coordinate a managed sale on your behalf, from market appraisal and marketing to viewings.')
    expect(read('lib/email/agency.ts')).toContain('You are receiving this because you asked ${brand.name} for a market appraisal of a property.')
  })

  it('every supplies promise says delivery in Addis Ababa (D1–D6)', () => {
    expect(read('app/(site)/page.tsx')).toContain("'Get one clear price, including delivery in Addis Ababa'")
    expect(read('app/(site)/supplies/page.tsx')).toContain('Send your materials list to HagerLand Supply and get one clear price with delivery in Addis Ababa.')
    expect(read('app/(site)/supplies/[category]/page.tsx')).toContain('Add items to a quote list and get one clear price with delivery in Addis Ababa.')
    expect(read('components/supplies/CategoryPage.tsx')).toContain('or send your full materials list for one clear price with delivery in Addis Ababa.')
    expect(read('app/(site)/supplies/product/[slug]/page.tsx')).toContain('Add to your quote list for a clear price with delivery in Addis Ababa.')
    expect(read('app/(site)/supplies/quote/page.tsx')).toContain('for one clear price, including delivery to your site in Addis Ababa.')
    expect(read('lib/content/help.ts')).toContain('We reply with one clear price including VAT and delivery in Addis Ababa.')
    expect(read('lib/content/services.ts')).toContain("'Building materials with one clear quote and delivery to your site in Addis Ababa.'")
    expect(read('lib/content/verticals.ts')).toContain('with clear quotes and delivery to site in Addis Ababa.')
    expect(read('lib/verticals.ts')).toContain("'Construction materials with one clear quote, delivered to site in Addis Ababa.'")
  })

  it('an older Verified badge with no check record and no date says what was checked (B1)', () => {
    const fallback = VERIFICATION_INFO.verified.explain
    expect(fallback).toBe("Verified: HagerLand checked this business's trade licence.")
    const fmt = (d: string) => d
    expect(badgeExplain('verified', null, null, fmt, fallback)).toBe("Verified: HagerLand checked this business's trade licence.")
    expect(badgeExplain('verified', '2025-01-01', null, fmt, fallback)).toBe("Verified: HagerLand checked this business's trade licence on 2025-01-01.")
    expect(badgeExplain('verified', null, { verified_at: '', ends_on: '2027-11-01' }, fmt, fallback)).toBe("Verified: HagerLand checked this business's trade licence and tax number.")
    expect(badgeExplain('verified', null, { verified_at: '2026-11-01', ends_on: '2027-11-01' }, fmt, fallback)).toBe("Verified: HagerLand checked this business's trade licence and tax number on 2026-11-01. Next check due by 2027-11-01.")
    expect(VERIFICATION_INFO.claimed.explain).toBe('Claimed: the owner manages this profile. HagerLand confirmed they represent the business.')
    expect(VERIFICATION_INFO.listed.explain).toBe('Listed: HagerLand added this business from public information. It has not been claimed by its owner yet.')
  })
})
