import { SearchX } from 'lucide-react'
import type { OrganisationListItem } from '@/lib/data/organisations'
import { CompanyCard } from './CompanyCard'
import { EmptyState } from '@/components/ui/Layout'
import { Pagination } from '@/components/ui/Pagination'
import { ButtonLink } from '@/components/ui/Button'
import { formatNumber } from '@/lib/format'

export function OrgResults({
  items,
  total,
  page,
  pageSize,
  hrefFor,
  countLabel,
  emptyTitle,
  emptyDescription,
  joinHref,
  joinLabel,
}: {
  items: OrganisationListItem[]
  total: number
  page: number
  pageSize: number
  hrefFor: (page: number) => string
  countLabel: string
  emptyTitle: string
  emptyDescription: string
  joinHref: string
  joinLabel: string
}) {
  return (
    <div className="min-w-0">
      <p className="mb-4 font-semibold" aria-live="polite">
        {formatNumber(total)} {countLabel}
      </p>
      {items.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title={emptyTitle}
          description={emptyDescription}
          actions={
            <>
              <ButtonLink href={joinHref}>{joinLabel}</ButtonLink>
              <ButtonLink href="/contact?topic=find-a-professional" variant="secondary">
                Ask us to help
              </ButtonLink>
            </>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((o) => (
            <li key={o.id}>
              <CompanyCard org={o} />
            </li>
          ))}
        </ul>
      )}
      <Pagination className="mt-10" page={page} totalPages={Math.ceil(total / pageSize)} hrefFor={hrefFor} />
    </div>
  )
}
