import { SearchBox } from '@/components/SearchBox'
import Link from 'next/link'

type Action = {
  href: string
  label: string
  variant?: 'primary' | 'secondary'
}

export function SectionHeader({
  title,
  description,
  actions = [],
  showSearch = true,
}: {
  title: string
  description: string
  actions?: Action[]
  showSearch?: boolean
}) {
  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16 text-center">
      <h1 className="text-3xl sm:text-4xl font-bold text-ink tracking-tight">
        {title}
      </h1>
      <p className="text-muted text-base sm:text-lg mt-4">{description}</p>
      {showSearch && <SearchBox className="mt-6 max-w-lg mx-auto" />}
      {actions.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 mt-6 max-w-xs sm:max-w-sm mx-auto">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={
                action.variant === 'secondary'
                  ? 'flex-1 border border-ink text-ink font-semibold rounded-full px-6 py-2.5 transition-colors hover:bg-section'
                  : 'flex-1 bg-green hover:bg-green-dark text-white font-semibold rounded-full px-6 py-2.5 transition-colors'
              }
            >
              {action.label}
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
