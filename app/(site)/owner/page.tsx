import Link from 'next/link'
import { ArrowRight, KeyRound } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { getOwnedProperties } from '@/lib/data/owner'
import { Container, EmptyState } from '@/components/ui/Layout'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { ButtonLink } from '@/components/ui/Button'

export const metadata = { title: 'Owner portal' }

/** Properties HagerLand manages for this owner. Owners are linked to their properties by HagerLand. */
export default async function OwnerPortalPage() {
  const user = await requireUser('/owner')
  const properties = await getOwnedProperties(user)
  return (
    <Container className="py-10">
      <Breadcrumbs items={[{ label: 'Manage Property', href: '/manage' }, { label: 'Owner portal' }]} />
      <h1 className="hl-h1 mt-6">Owner portal</h1>
      <p className="mt-2 max-w-2xl text-muted">Inspections with photos, rent statements, the maintenance log, documents and messages for the properties HagerLand Property Care looks after for you.</p>
      {properties.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<KeyRound />}
            title="No property is linked to this account"
            description="When HagerLand manages a property for you, we link it to the email address you sign in with. If you are already a Property Care client, contact us and we will link it."
            actions={<ButtonLink href="/diaspora/property-care">About HagerLand Property Care</ButtonLink>}
          />
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {properties.map((p) => (
            <li key={p.id}>
              <Link href={`/owner/${p.id}`} className="group flex h-full flex-col rounded-xl border border-border bg-white p-5 hover:border-green">
                <span className="text-caption text-muted">{p.reference}</span>
                <span className="mt-1 font-display text-h3 font-bold text-ink">{p.title}</span>
                <span className="mt-1 text-small text-muted">{[(Array.isArray(p.location) ? p.location[0] : p.location)?.display_name, p.address_line].filter(Boolean).join(' · ')}</span>
                <span className="mt-4 inline-flex items-center gap-1 font-semibold text-green">
                  Open <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Container>
  )
}
