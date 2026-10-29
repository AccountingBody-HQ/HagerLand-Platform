import type { PillarKey } from '@/lib/pillars'

/**
 * Customer-facing copy for the ten services: one short benefit line and one clear action each, in plain UK English.
 * Used on the homepage, in the "All services" panel, the mobile menu and the "next steps" on each service page.
 * The service names themselves come from the pillar registry (admin → Pillars and modes).
 */
export const SERVICE_COPY: Record<PillarKey, { benefit: string; action: string; soonAction: string }> = {
  buy: { benefit: 'Homes, land and commercial property, and our own estate agents to sell yours.', action: 'Buy or sell', soonAction: 'Register interest' },
  rent: { benefit: 'Places to rent across Ethiopia, and letting handled for landlords.', action: 'Rent or let', soonAction: 'Register interest' },
  build: { benefit: 'Architects, engineers and contractors, with quotes for your project.', action: 'Find a contractor', soonAction: 'Register interest' },
  maintain: { benefit: 'Tradespeople for repairs, servicing and emergencies, matched by HagerLand.', action: 'Request a repair', soonAction: 'Register interest' },
  manage: { benefit: 'HagerLand Property Care looks after your property and tenants.', action: 'Explore Property Care', soonAction: 'Register interest' },
  finance: { benefit: 'Mortgages and construction finance through licensed partners.', action: 'Explore finance', soonAction: 'Register interest' },
  insurance: { benefit: 'Home, landlord and construction cover through licensed partners.', action: 'Explore insurance', soonAction: 'Register interest' },
  advice: { benefit: 'Practical help on buying, renting and building in Ethiopia.', action: 'Get advice', soonAction: 'Register interest' },
  supplies: { benefit: 'Building materials with one clear quote and delivery to your site.', action: 'Get a quote', soonAction: 'Register interest' },
  jobs: { benefit: 'Construction and property jobs, and staff for your business.', action: 'Browse jobs', soonAction: 'Register interest' },
}

/**
 * How customers think about the services: four groups, each in a fixed order. The first group (Supplies, Jobs,
 * Knowledge & Advice) is HagerLand's priority: the homepage shows it as the "Start here" band, the menus list it
 * first. `soonTitle` replaces the title while every service in the group is coming soon.
 */
export const SERVICE_GROUPS: { id: string; title: string; soonTitle?: string; text: string; keys: PillarKey[] }[] = [
  { id: 'start', title: 'Supplies, jobs and advice', text: 'Materials for every build, the people to do the work, and advice before you start.', keys: ['supplies', 'jobs', 'advice'] },
  { id: 'property', title: 'Property', text: 'Buy, sell, rent and look after property, with our own estate agents and Property Care.', keys: ['buy', 'rent', 'manage'] },
  { id: 'build', title: 'Build and improve', text: 'From the first drawing to repairs years later.', keys: ['build', 'maintain'] },
  { id: 'money', title: 'Finance and insurance', soonTitle: 'Coming soon', text: 'Finance and insurance through licensed partners.', keys: ['finance', 'insurance'] },
]
