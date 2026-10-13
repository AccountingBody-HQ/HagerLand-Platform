import 'server-only'
import type { AccountNavItem } from '@/components/account/AccountNav'
import type { Membership } from '@/lib/auth'

/** Account menu items, adapted to what the user's organisation does (spec 7.3). */
export function accountNavItems(active: Membership | null, newEnquiries: number): AccountNavItem[] {
  const kind = active?.org.kind
  const items: AccountNavItem[] = [{ href: '/account', label: 'Overview', icon: 'overview' }]
  if (!kind || ['agency', 'developer', 'hagerland'].includes(kind)) items.push({ href: '/account/listings', label: 'Listings', icon: 'listings' })
  if (kind === 'developer') items.push({ href: '/account/developments', label: 'Developments', icon: 'developments' })
  if (active) items.push({ href: '/account/company', label: 'Company profile', icon: 'company' })
  if (kind && ['contractor', 'professional_firm', 'sole_trader', 'developer'].includes(kind)) items.push({ href: '/account/company/portfolio', label: 'Portfolio', icon: 'portfolio' })
  items.push({ href: '/account/enquiries', label: 'Enquiries', icon: 'enquiries', badge: newEnquiries || undefined })
  items.push({ href: '/account/quotes', label: 'Quotes', icon: 'quotes' })
  items.push({ href: '/account/settings', label: 'Settings', icon: 'settings' })
  return items
}
