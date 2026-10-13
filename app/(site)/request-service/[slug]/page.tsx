import { notFound } from 'next/navigation'
import { getRequestableCategory } from '@/lib/data/service-requests'
import { getProfile, getUser } from '@/lib/auth'
import { buildMetadata } from '@/lib/seo'
import { Container } from '@/components/ui/Layout'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { ServiceRequestForm } from '@/components/service-requests/ServiceRequestForm'
import { HowRequestsWork } from '@/components/service-requests/HowRequestsWork'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const c = await getRequestableCategory(params.slug)
  if (!c) return {}
  return buildMetadata({
    title: `Request ${c.name.toLowerCase()}`,
    description: `Describe what you need and get quotes from up to three ${c.name.toLowerCase()} on HagerLand. Free for customers; you choose who to hire.`,
    path: `/request-service/${c.slug}`,
  })
}

export default async function RequestCategoryPage({ params, searchParams }: { params: { slug: string }; searchParams: { abroad?: string } }) {
  const category = await getRequestableCategory(params.slug)
  if (!category) notFound()
  const [user, profile] = await Promise.all([getUser(), getProfile()])
  return (
    <Container className="py-8 lg:py-12">
      <Breadcrumbs items={[{ label: 'Request a service', href: '/request-service' }, { label: category.name }]} />
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <p className="hl-eyebrow text-green">{category.groupName}</p>
          <h1 className="hl-h1 mt-2">Request {category.name.toLowerCase()}</h1>
          {category.description && <p className="mt-3 max-w-2xl text-muted">{category.description}</p>}
          <div className="mt-8">
            <ServiceRequestForm
              categorySlug={category.slug}
              categoryName={category.name}
              questions={category.questions}
              allowsEmergency={category.allowsEmergency}
              abroad={searchParams.abroad === '1'}
              defaults={{ name: profile?.full_name, phone: profile?.phone, email: user?.email }}
            />
          </div>
        </div>
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <h2 className="hl-h3 mb-4">How it works</h2>
          <HowRequestsWork compact />
        </aside>
      </div>
    </Container>
  )
}
