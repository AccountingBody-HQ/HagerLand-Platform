import 'server-only'
import { cache } from 'react'
import { buildSiteNav, type SiteNav } from '@/lib/navigation'
import { serviceOn } from '@/lib/pillars'
import { getAgencyAvailability, getPillars } from './pillars'
import { getVerticals } from './verticals'

/** Header, drawer and "All services" data from the pillar and vertical registries (spec 26.4). */
export const getSiteNav = cache(async (): Promise<SiteNav> => {
  const [pillars, verticals, agency] = await Promise.all([getPillars(), getVerticals(), getAgencyAvailability()])
  return buildSiteNav(pillars, verticals, { agencySales: agency.sales, agencyLettings: agency.lettings, ownerPortal: serviceOn(pillars, 'manage', 'owner-portal') })
})
