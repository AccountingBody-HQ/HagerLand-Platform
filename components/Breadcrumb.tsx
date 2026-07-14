import Link from 'next/link'

type Crumb = { href: string; label: string }

export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex items-center gap-1.5 text-sm text-muted flex-wrap">
        {crumbs.map((crumb, i) => (
          <li key={crumb.href} className="flex items-center gap-1.5">
            {i < crumbs.length - 1 ? (
              <>
                <Link
                  href={crumb.href}
                  className="hover:text-ink transition-colors"
                >
                  {crumb.label}
                </Link>
                <span aria-hidden="true" className="select-none">
                  /
                </span>
              </>
            ) : (
              <span className="text-ink font-medium truncate max-w-[200px]">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
