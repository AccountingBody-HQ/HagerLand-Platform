import Link from 'next/link'
import type { ReactNode } from 'react'
import { Container } from '@/components/ui/Layout'

const HELPFUL_LINKS = [
  { label: 'Property for sale', href: '/property/for-sale' },
  { label: 'Property to rent', href: '/property/to-rent' },
  { label: 'Construction supplies', href: '/supplies' },
  { label: 'Find a professional', href: '/professionals' },
  { label: 'Help & FAQs', href: '/help' },
]

export function ErrorPanel({ code, title, message, actions }: { code: string; title: string; message: string; actions: ReactNode }) {
  return (
    <Container className="py-20 sm:py-28">
      <div className="mx-auto max-w-xl text-center">
        <p className="hl-eyebrow text-green">{code}</p>
        <h1 className="hl-h1 mt-3">{title}</h1>
        <p className="mt-4 text-muted">{message}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center [&>*]:sm:flex-1">{actions}</div>
        <nav aria-label="Helpful links" className="mt-12 border-t border-border pt-8">
          <p className="text-small font-semibold text-ink">You might be looking for</p>
          <ul className="mt-1 flex flex-wrap justify-center gap-x-5">
            {HELPFUL_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-flex min-h-11 items-center text-small font-medium text-green hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </Container>
  )
}
