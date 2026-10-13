import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getDevelopmentBySlug } from '@/lib/data/developments'
import { buildMetadata, truncateDescription } from '@/lib/seo'
import { brand } from '@/lib/brand'
import { Container } from '@/components/ui/Layout'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { DevelopmentDetail } from '@/components/development/DevelopmentDetail'
import { RegisterInterest } from '@/components/development/RegisterInterest'
import { ViewTracker } from '@/components/analytics/ViewTracker'

export const revalidate = 600

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const d = await getDevelopmentBySlug(params.slug)
  if (!d) return { title: 'Project not found' }
  return buildMetadata({
    title: `${d.name} by ${brand.divisions.developments}`,
    description: truncateDescription(d.summary ?? d.description ?? `${d.name}: homes built by HagerLand in ${d.location_display}.`),
    path: `/our-developments/${d.slug}`,
    image: `/og/development/${d.slug}`,
  })
}

export default async function OwnDevelopmentPage({ params }: { params: { slug: string } }) {
  const d = await getDevelopmentBySlug(params.slug)
  if (!d || !d.id) notFound()
  if (!d.is_hagerland) permanentRedirect(`/developments/${d.slug}`)
  return (
    <>
      <Container className="py-6 lg:py-8">
        <Breadcrumbs items={[{ label: brand.divisions.developments, href: '/our-developments' }, { label: d.name ?? '' }]} />
        <DevelopmentDetail d={d} premium />
        <section className="mt-14 rounded-xl border border-gold/30 bg-gold-soft/40 p-6 sm:p-8">
          <h2 className="hl-h3">Built with {brand.divisions.supply}</h2>
          <p className="mt-2 max-w-2xl text-muted">Materials for this project are sourced through {brand.divisions.supply}, so we control quality and cost from the first brick to the front door.</p>
        </section>
        <section id="register" className="mt-10 grid gap-8 lg:grid-cols-[1fr_440px]">
          <div>
            <h2 className="hl-h2">Register interest or book a visit</h2>
            <p className="mt-2 text-muted">Our sales team will contact you with plans, prices and the payment plan.</p>
          </div>
          <div className="rounded-lg border border-border bg-white p-5 shadow-sm">
            <RegisterInterest developmentId={d.id} projectName={d.name ?? undefined} idPrefix="ri-project" />
          </div>
        </section>
      </Container>
      <ViewTracker entityType="development" id={d.id} label="hagerland_development" />
    </>
  )
}
