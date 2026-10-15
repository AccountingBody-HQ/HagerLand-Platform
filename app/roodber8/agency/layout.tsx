import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'

const TABS = [
  ['/roodber8/agency', 'Overview'],
  ['/roodber8/agency/contacts', 'Contacts'],
  ['/roodber8/agency/instructions', 'Instructions'],
  ['/roodber8/agency/valuations', 'Valuations'],
  ['/roodber8/agency/viewings', 'Viewings'],
  ['/roodber8/agency/offers', 'Offers'],
  ['/roodber8/agency/applications', 'Applications'],
  ['/roodber8/agency/tenancies', 'Tenancies'],
  ['/roodber8/agency/settings', 'Checklists'],
] as const

/** HagerLand estate agency operations (spec 26.5, 26.6). */
export default async function AgencyLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage()
  return (
    <div className="space-y-5">
      <nav aria-label="Agency sections" className="-mx-1 overflow-x-auto">
        <ul className="flex min-w-max gap-1 px-1">
          {TABS.map(([href, label]) => (
            <li key={href}>
              <Link href={href} prefetch={false} className="inline-flex min-h-10 items-center rounded-md border border-border bg-white px-3 text-small font-semibold text-ink hover:border-green">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {children}
    </div>
  )
}
