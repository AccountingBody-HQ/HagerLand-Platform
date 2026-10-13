import type { ReactNode } from 'react'
import { Container } from '@/components/ui/Layout'

export function AuthCard({ title, subtitle, children, wide }: { title: string; subtitle?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <div className="bg-stone-50">
      <Container className="py-10 sm:py-16">
        <div className={`mx-auto ${wide ? 'max-w-3xl' : 'max-w-md'}`}>
          <h1 className="hl-h1 text-center">{title}</h1>
          {subtitle && <p className="mt-3 text-center text-muted">{subtitle}</p>}
          <div className="mt-8 rounded-xl border border-border bg-white p-5 shadow-sm sm:p-8">{children}</div>
        </div>
      </Container>
    </div>
  )
}
