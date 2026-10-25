import { describe, expect, it } from 'vitest'
import { ADMIN_NAV, ADMIN_NAV_GROUPS, filterNav, isNavActive, navForRole } from '@/components/admin/admin-nav-items'
import { roleCanAccess, STAFF_ROLES } from '@/lib/admin/roles'

/** The flat menu as it was before it was grouped (href, label): nothing may be lost, renamed or moved to another URL. */
const BEFORE: [string, string][] = [
  ['/roodber8', 'Dashboard'],
  ['/roodber8/review', 'Review queue'],
  ['/roodber8/pillars', 'Pillars and modes'],
  ['/roodber8/verticals', 'Verticals'],
  ['/roodber8/properties', 'Properties'],
  ['/roodber8/developments', 'Developments'],
  ['/roodber8/organisations', 'Organisations'],
  ['/roodber8/products', 'Products'],
  ['/roodber8/trade-accounts', 'Trade accounts'],
  ['/roodber8/categories', 'Categories'],
  ['/roodber8/locations', 'Locations'],
  ['/roodber8/exchange-rates', 'Exchange rates'],
  ['/roodber8/enquiries', 'Enquiries'],
  ['/roodber8/quotes', 'Quotes'],
  ['/roodber8/supply/partners', 'Supply partners'],
  ['/roodber8/service-requests', 'Service requests'],
  ['/roodber8/projects', 'Building projects'],
  ['/roodber8/reviews', 'Reviews'],
  ['/roodber8/request-questions', 'Request questions'],
  ['/roodber8/deals', 'Deals and commissions'],
  ['/roodber8/agency', 'Agency'],
  ['/roodber8/property-care', 'Property Care'],
  ['/roodber8/sales', 'HagerLand sales'],
  ['/roodber8/jobs', 'Jobs and applications'],
  ['/roodber8/interest', 'Interest registrations'],
  ['/roodber8/partners', 'Partner applications'],
  ['/roodber8/users', 'Users'],
  ['/roodber8/guides', 'Guides'],
  ['/roodber8/area-guides', 'Area guides'],
  ['/roodber8/newsletter', 'Newsletter'],
  ['/roodber8/build-costs', 'Build-cost rates'],
  ['/roodber8/promotions', 'Promotions'],
  ['/roodber8/import', 'Imports'],
  ['/roodber8/demand', 'Demand'],
  ['/roodber8/performance', 'Performance'],
  ['/roodber8/reports', 'Reports'],
  ['/roodber8/settings', 'Settings'],
  ['/roodber8/staff', 'Staff'],
  ['/roodber8/email-problems', 'Email problems'],
  ['/roodber8/audit', 'Audit log'],
]

const labels = (groups: { label: string; items: readonly { label: string }[] }[]) => groups.map((g) => [g.label, g.items.map((i) => i.label)])

describe('admin menu', () => {
  it('keeps every earlier item exactly once, with the same label and address (plus the Phase 4 and 5 supply items and the worker register)', () => {
    const now = ADMIN_NAV.map((i) => [i.href, i.label])
    const added = [['/roodber8/supply/orders', 'Supply orders'], ['/roodber8/supply/ledger', 'Supply ledger'], ['/roodber8/supply/performance', 'Partner performance'], ['/roodber8/reports/supply', 'Supply report'], ['/roodber8/imports/compliance', 'Imports compliance'], ['/roodber8/jobs/register', 'Worker register']]
    expect(new Set(now.map((x) => x.join('|'))).size).toBe(now.length)
    expect([...now].sort()).toEqual([...BEFORE, ...added].sort())
  })

  it('has the agreed groups, in order', () => {
    expect(labels([...ADMIN_NAV_GROUPS])).toEqual([
      ['Overview', ['Dashboard', 'Review queue']],
      ['Customer requests', ['Enquiries', 'Quotes', 'Service requests', 'Building projects', 'Interest registrations']],
      ['Supplies', ['Supply partners', 'Supply orders', 'Partner performance', 'Products', 'Categories', 'Trade accounts']],
      ['Jobs', ['Jobs and applications', 'Worker register']],
      ['Property', ['Properties', 'Developments', 'Agency', 'Property Care', 'HagerLand sales']],
      ['Businesses & people', ['Organisations', 'Users', 'Partner applications', 'Imports', 'Imports compliance', 'Reviews']],
      ['Money', ['Deals and commissions', 'Supply ledger']],
      ['Content', ['Guides', 'Area guides', 'Newsletter', 'Promotions']],
      ['Insights', ['Demand', 'Performance', 'Reports', 'Supply report']],
      ['Setup', ['Settings', 'Pillars and modes', 'Verticals', 'Locations', 'Exchange rates', 'Build-cost rates', 'Request questions', 'Staff']],
      ['System', ['Email problems', 'Audit log']],
    ])
  })

  it('keeps the counts shown next to items', () => {
    expect(ADMIN_NAV.filter((i) => i.badgeKey).map((i) => i.badgeKey).sort()).toEqual(['agency', 'care', 'email', 'interest', 'quotes', 'requests', 'review', 'reviews', 'trade'])
  })
})

describe('Find a section', () => {
  const all = navForRole(null)
  const found = (q: string) => filterNav(all, q).flatMap((g) => g.items.map((i) => i.label))
  it('matches anywhere in the label, in any case', () => {
    expect(found('quo')).toEqual(['Quotes'])
    expect(found('QUO')).toEqual(['Quotes'])
    expect(found('guides')).toEqual(['Guides', 'Area guides'])
    expect(found('  ')).toHaveLength(ADMIN_NAV.length)
  })
  it('understands other words for a section', () => {
    expect(found('money')).toEqual(['Deals and commissions', 'Supply ledger'])
    expect(found('orders')).toEqual(['Supply orders'])
    expect(found('delivery')).toEqual(['Supply orders'])
    expect(found('ledger')).toEqual(['Supply ledger'])
    expect(found('payments')).toEqual(['Supply ledger'])
    expect(found('agreement')).toEqual(['Supply partners'])
    expect(found('suppliers')).toEqual(['Supply partners'])
    expect(found('prices')).toEqual(['Supply partners'])
    expect(found('staff')).toEqual(['Staff'])
    expect(found('jobs')).toEqual(['Jobs and applications'])
    expect(found('blog')).toEqual(['Guides'])
    expect(found('articles')).toEqual(['Guides'])
  })
  it('keeps matches under their group and drops empty groups', () => {
    expect(labels(filterNav(all, 'quo'))).toEqual([['Customer requests', ['Quotes']]])
    expect(filterNav(all, 'zzzz')).toEqual([])
  })
})

describe('menu by role', () => {
  it('shows the owner (and the master login) every group', () => {
    expect(navForRole('owner')).toHaveLength(ADMIN_NAV_GROUPS.length)
    expect(navForRole(null)).toHaveLength(ADMIN_NAV_GROUPS.length)
  })
  it('shows each staff role only its permitted items, and hides groups it has nothing in', () => {
    for (const role of STAFF_ROLES) {
      const groups = navForRole(role)
      const items = groups.flatMap((g) => g.items)
      expect(items.map((i) => i.href)).toEqual(ADMIN_NAV.filter((i) => roleCanAccess(role, i.href)).map((i) => i.href))
      expect(groups.every((g) => g.items.length > 0)).toBe(true)
    }
    expect(navForRole('operations').map((g) => g.label)).toEqual(['Overview', 'Customer requests', 'Supplies', 'Jobs', 'Property', 'Businesses & people', 'Setup'])
    expect(navForRole('content').map((g) => g.label)).toEqual(['Overview', 'Content', 'Setup'])
    expect(navForRole('agent').map((g) => g.label)).toEqual(['Overview', 'Customer requests', 'Property'])
  })
})

describe('active item', () => {
  it('highlights the section for nested pages', () => {
    expect(isNavActive('/roodber8/quotes/abc', '/roodber8/quotes')).toBe(true)
    expect(isNavActive('/roodber8/supply/partners/abc/offers', '/roodber8/supply/partners')).toBe(true)
    expect(isNavActive('/roodber8/quotes', '/roodber8')).toBe(false)
    expect(isNavActive('/roodber8', '/roodber8')).toBe(true)
  })
})
