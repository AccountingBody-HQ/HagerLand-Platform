/** The admin menu (spec 18.2, 26), in groups. Staff see the items their role may open (lib/admin/roles.ts). */
import {
  type LucideIcon, BadgePercent, BarChart3, MailWarning, BookOpen, Calculator, Briefcase, Building2, LayoutGrid, Handshake, UserPlus, Coins, Wrench, ListChecks, Receipt, KeyRound, ClipboardCheck, ClipboardList, FileClock, FolderTree, Gauge, Import, Inbox, MapPin, Megaphone, Package, Settings, Store, Users, HandCoins, House, Layers, HardHat, Mail, Star, TrendingUp, Activity, UserCog, Truck, PackageCheck, BookText,
} from 'lucide-react'
import { roleCanAccess, type StaffRole } from '@/lib/admin/roles'

export interface AdminNavItem {
  href: string
  label: string
  icon: LucideIcon
  /** Key of the count shown next to the item (lib/admin/counts.ts). */
  badgeKey?: string
}

export interface AdminNavGroup {
  label: string
  items: readonly AdminNavItem[]
}

export const ADMIN_NAV_GROUPS: readonly AdminNavGroup[] = [
  {
    label: 'Overview',
    items: [
      { href: '/roodber8', label: 'Dashboard', icon: Gauge },
      { href: '/roodber8/review', label: 'Review queue', icon: ClipboardCheck, badgeKey: 'review' },
    ],
  },
  {
    label: 'Customer requests',
    items: [
      { href: '/roodber8/enquiries', label: 'Enquiries', icon: Inbox },
      { href: '/roodber8/quotes', label: 'Quotes', icon: ClipboardList, badgeKey: 'quotes' },
      { href: '/roodber8/service-requests', label: 'Service requests', icon: Wrench, badgeKey: 'requests' },
      { href: '/roodber8/projects', label: 'Building projects', icon: HardHat },
      { href: '/roodber8/interest', label: 'Interest registrations', icon: UserPlus, badgeKey: 'interest' },
    ],
  },
  {
    label: 'Supplies',
    items: [
      { href: '/roodber8/supply/partners', label: 'Supply partners', icon: Truck },
      { href: '/roodber8/supply/orders', label: 'Supply orders', icon: PackageCheck },
      { href: '/roodber8/products', label: 'Products', icon: Package },
      { href: '/roodber8/categories', label: 'Categories', icon: FolderTree },
      { href: '/roodber8/trade-accounts', label: 'Trade accounts', icon: BadgePercent, badgeKey: 'trade' },
    ],
  },
  {
    label: 'Jobs',
    items: [{ href: '/roodber8/jobs', label: 'Jobs and applications', icon: Briefcase }],
  },
  {
    label: 'Property',
    items: [
      { href: '/roodber8/properties', label: 'Properties', icon: House },
      { href: '/roodber8/developments', label: 'Developments', icon: Building2 },
      { href: '/roodber8/agency', label: 'Agency', icon: Handshake, badgeKey: 'agency' },
      { href: '/roodber8/property-care', label: 'Property Care', icon: KeyRound, badgeKey: 'care' },
      { href: '/roodber8/sales', label: 'HagerLand sales', icon: HandCoins },
    ],
  },
  {
    label: 'Businesses & people',
    items: [
      { href: '/roodber8/organisations', label: 'Organisations', icon: Store },
      { href: '/roodber8/users', label: 'Users', icon: Users },
      { href: '/roodber8/partners', label: 'Partner applications', icon: Handshake },
      { href: '/roodber8/import', label: 'Imports', icon: Import },
      { href: '/roodber8/reviews', label: 'Reviews', icon: Star, badgeKey: 'reviews' },
    ],
  },
  {
    label: 'Money',
    items: [
      { href: '/roodber8/deals', label: 'Deals and commissions', icon: Receipt },
      { href: '/roodber8/supply/ledger', label: 'Supply ledger', icon: BookText },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/roodber8/guides', label: 'Guides', icon: BookOpen },
      { href: '/roodber8/area-guides', label: 'Area guides', icon: MapPin },
      { href: '/roodber8/newsletter', label: 'Newsletter', icon: Mail },
      { href: '/roodber8/promotions', label: 'Promotions', icon: Megaphone },
    ],
  },
  {
    label: 'Insights',
    items: [
      { href: '/roodber8/demand', label: 'Demand', icon: TrendingUp },
      { href: '/roodber8/performance', label: 'Performance', icon: Activity },
      { href: '/roodber8/reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    label: 'Setup',
    items: [
      { href: '/roodber8/settings', label: 'Settings', icon: Settings },
      { href: '/roodber8/pillars', label: 'Pillars and modes', icon: Layers },
      { href: '/roodber8/verticals', label: 'Verticals', icon: LayoutGrid },
      { href: '/roodber8/locations', label: 'Locations', icon: MapPin },
      { href: '/roodber8/exchange-rates', label: 'Exchange rates', icon: Coins },
      { href: '/roodber8/build-costs', label: 'Build-cost rates', icon: Calculator },
      { href: '/roodber8/request-questions', label: 'Request questions', icon: ListChecks },
      { href: '/roodber8/staff', label: 'Staff', icon: UserCog },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/roodber8/email-problems', label: 'Email problems', icon: MailWarning, badgeKey: 'email' },
      { href: '/roodber8/audit', label: 'Audit log', icon: FileClock },
    ],
  },
]

/** Every item in menu order (the staff dashboard lists their areas from it). */
export const ADMIN_NAV: readonly AdminNavItem[] = ADMIN_NAV_GROUPS.flatMap((g) => g.items)

/** Other words people use for a section, for "Find a section". */
export const NAV_SYNONYMS: Record<string, string[]> = {
  money: ['/roodber8/deals', '/roodber8/supply/ledger'],
  commission: ['/roodber8/deals', '/roodber8/supply/ledger'],
  orders: ['/roodber8/supply/orders'],
  delivery: ['/roodber8/supply/orders'],
  proof: ['/roodber8/supply/orders'],
  ledger: ['/roodber8/supply/ledger'],
  payments: ['/roodber8/supply/ledger'],
  agreement: ['/roodber8/supply/partners'],
  agreements: ['/roodber8/supply/partners'],
  invoice: ['/roodber8/deals'],
  suppliers: ['/roodber8/supply/partners'],
  supplier: ['/roodber8/supply/partners'],
  prices: ['/roodber8/supply/partners'],
  price: ['/roodber8/supply/partners'],
  staff: ['/roodber8/staff'],
  team: ['/roodber8/staff'],
  jobs: ['/roodber8/jobs'],
  recruitment: ['/roodber8/jobs'],
  blog: ['/roodber8/guides'],
  articles: ['/roodber8/guides'],
  advice: ['/roodber8/guides'],
  companies: ['/roodber8/organisations'],
  businesses: ['/roodber8/organisations'],
  customers: ['/roodber8/users'],
  accounts: ['/roodber8/users'],
  leads: ['/roodber8/enquiries'],
  messages: ['/roodber8/enquiries'],
  emails: ['/roodber8/email-problems'],
  google: ['/roodber8/import'],
  currency: ['/roodber8/exchange-rates'],
  rates: ['/roodber8/exchange-rates', '/roodber8/build-costs'],
  log: ['/roodber8/audit'],
  history: ['/roodber8/audit'],
  listings: ['/roodber8/properties'],
  rentals: ['/roodber8/properties'],
}

/** Groups and items this role may open; empty groups (heading included) are left out. No role: everything. */
export function navForRole(role: StaffRole | null): AdminNavGroup[] {
  return ADMIN_NAV_GROUPS.map((g) => ({ label: g.label, items: g.items.filter((i) => !role || roleCanAccess(role, i.href)) })).filter((g) => g.items.length > 0)
}

/** "Find a section": label contains the words (any case), or a synonym starts with them (3+ letters). Empty groups are dropped. */
export function filterNav(groups: readonly AdminNavGroup[], query: string): AdminNavGroup[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...groups]
  const viaSynonym = new Set(Object.entries(NAV_SYNONYMS).filter(([word]) => (q.length >= 3 && word.startsWith(q)) || q.startsWith(word)).flatMap(([, hrefs]) => hrefs))
  return groups.map((g) => ({ label: g.label, items: g.items.filter((i) => i.label.toLowerCase().includes(q) || viaSynonym.has(i.href)) })).filter((g) => g.items.length > 0)
}

export function isNavActive(path: string, href: string): boolean {
  return href === '/roodber8' ? path === '/roodber8' : path === href || path.startsWith(`${href}/`)
}
