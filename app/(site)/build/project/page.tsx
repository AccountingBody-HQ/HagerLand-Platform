import { notFound } from 'next/navigation'
import { Check } from 'lucide-react'
import { buildMetadata } from '@/lib/seo'
import { getUser, getProfile } from '@/lib/auth'
import { getPillar } from '@/lib/data/pillars'
import { getVerticals } from '@/lib/data/verticals'
import { PROJECT_SERVICES } from '@/lib/build-projects'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Container } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { ProjectForm } from '@/components/build/ProjectForm'

export const dynamic = 'force-dynamic'

export const metadata = buildMetadata({
  title: 'Start a building project',
  description: 'Describe your plot and plans once. HagerLand links the design, engineering, contractor, materials and finance requests you need under one project reference.',
  path: '/build/project',
})

const SERVICE_VERTICAL: Record<string, string> = { design: 'professionals', engineering: 'professionals', contractor: 'contractors', materials: 'building-supplies', finance: 'finance' }

/** "Start a building project" (spec 26.9). Needs an account so the customer can follow the whole project. */
export default async function StartProjectPage() {
  const pillar = await getPillar('build')
  if (!pillar || pillar.status !== 'live') notFound()
  const [user, verticals] = await Promise.all([getUser(), getVerticals()])
  const profile = user ? await getProfile() : null
  const unavailable = PROJECT_SERVICES.filter((s) => verticals.find((v) => v.key === SERVICE_VERTICAL[s.value])?.status !== 'live').map((s) => s.value)
  return (
    <Container className="max-w-3xl py-10">
      <Breadcrumbs items={[{ label: 'Build & Develop', href: '/build' }, { label: 'Start a building project' }]} />
      <h1 className="hl-h1 mt-6">Start a building project</h1>
      <p className="mt-3 text-muted">Tell us about your plot and plans once. We create one project reference and the requests you need (design, engineering, a contractor, materials and finance) and match each one to suitable providers.</p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {['One reference for the whole project', 'Quotes from providers matched by HagerLand', 'A materials quote from HagerLand Supply', 'Everything on one project page'].map((t) => (
          <li key={t} className="flex gap-2 text-small">
            <Check className="mt-0.5 size-4 shrink-0 text-green" aria-hidden /> {t}
          </li>
        ))}
      </ul>
      <div className="mt-8 rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
        {user ? (
          <ProjectForm defaults={{ name: profile?.full_name ?? '', email: user.email ?? '', phone: profile?.phone ?? '' }} unavailable={unavailable} />
        ) : (
          <div className="text-center">
            <h2 className="hl-h3">Sign in to start your project</h2>
            <p className="mt-2 text-muted">A building project runs over months, so you follow it from your free account.</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <ButtonLink href="/login?next=/build/project" className="sm:flex-1">
                Sign in
              </ButtonLink>
              <ButtonLink href="/signup?type=looking&next=/build/project" variant="secondary" className="sm:flex-1">
                Create an account
              </ButtonLink>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}
