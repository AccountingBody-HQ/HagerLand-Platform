import Link from 'next/link'
import { FolderKanban, House, MapPin } from 'lucide-react'
import type { OrganisationListItem } from '@/lib/data/organisations'
import { ORG_KIND_LABEL } from '@/lib/org-labels'
import { publicMediaUrl } from '@/lib/media'
import { VerificationBadge } from './VerificationBadge'
import { Badge } from '@/components/ui/Badge'

export function OrgAvatar({ name, logoPath, size = 'md' }: { name: string; logoPath: string | null; size?: 'md' | 'lg' }) {
  const url = publicMediaUrl(logoPath)
  const dim = size === 'lg' ? 'size-20 text-h2' : 'size-14 text-h3'
  return (
    <div className={`flex ${dim} shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-stone-50 font-display font-bold text-ink`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`${name} logo`} className="size-full object-cover" loading="lazy" />
      ) : (
        name
          .split(/\s+/)
          .slice(0, 2)
          .map((w) => w[0]?.toUpperCase())
          .join('')
      )}
    </div>
  )
}

export function CompanyCard({ org }: { org: OrganisationListItem }) {
  return (
    <article className="relative flex h-full flex-col rounded-lg border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        <OrgAvatar name={org.name ?? ''} logoPath={org.logo_path} />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 font-sans text-body font-semibold text-ink">
            <Link href={`/company/${org.slug}`} className="after:absolute after:inset-0">
              {org.name}
            </Link>
          </h3>
          <p className="text-small text-muted">{ORG_KIND_LABEL[org.kind ?? ''] ?? ''}</p>
          <div className="relative z-10 mt-2 flex flex-wrap gap-1.5">
            <VerificationBadge level={org.verification_level} verifiedAt={org.verified_at} />
            {org.is_hagerland && <Badge tone="gold">HagerLand</Badge>}
          </div>
        </div>
      </div>
      {org.tagline && <p className="mt-4 line-clamp-2 text-small text-muted">{org.tagline}</p>}
      {org.services?.length > 0 && <p className="mt-3 line-clamp-1 text-small text-ink">{org.services.slice(0, 4).map((s) => s.name).join(' · ')}</p>}
      <div className="mt-auto flex flex-wrap gap-x-4 gap-y-1 pt-4 text-small text-muted">
        {org.location_display && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4" aria-hidden /> {org.location_display}
          </span>
        )}
        {org.portfolio_count > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <FolderKanban className="size-4" aria-hidden /> {org.portfolio_count} project{org.portfolio_count === 1 ? '' : 's'}
          </span>
        )}
        {org.listings_count > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <House className="size-4" aria-hidden /> {org.listings_count} listing{org.listings_count === 1 ? '' : 's'}
          </span>
        )}
      </div>
    </article>
  )
}
