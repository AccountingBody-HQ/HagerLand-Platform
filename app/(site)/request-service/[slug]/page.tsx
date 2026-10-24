import { notFound } from 'next/navigation'
import { getRequestableCategory } from '@/lib/data/service-requests'
import { getProfile, getUser } from '@/lib/auth'
import { buildMetadata } from '@/lib/seo'
import { Container } from '@/components/ui/Layout'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { ServiceRequestForm } from '@/components/service-requests/ServiceRequestForm'
import { HowRequestsWork } from '@/components/service-requests/HowRequestsWork'
import { askedQuestions, requestFormCopy } from '@/lib/service-requests/form-copy'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params
  const c = await getRequestableCategory(params.slug)
  if (!c) return {}
  return buildMetadata({
    title: requestFormCopy(c.slug).tabTitle(c.name),
    description: requestFormCopy(c.slug).metaDescription(c.name),
    path: `/request-service/${c.slug}`,
  })
}

export default async function RequestCategoryPage(
  props: { params: Promise<{ slug: string }>; searchParams: Promise<{ abroad?: string }> }
) {
  const searchParams = await props.searchParams
  const params = await props.params
  const category = await getRequestableCategory(params.slug)
  if (!category) notFound()
  const [user, profile] = await Promise.all([getUser(), getProfile()])
  const copy = requestFormCopy(category.slug)
  return (
    <Container className="py-8 lg:py-12">
      <Breadcrumbs items={[{ label: 'Request a service', href: '/request-service' }, { label: category.name }]} />
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <p className="hl-eyebrow text-green">{category.groupName}</p>
          <h1 className="hl-h1 mt-2">{copy.heading(category.name)}</h1>
          {category.description && <p className="mt-3 max-w-2xl text-muted">{category.description}</p>}
          <div className="mt-8">
            <ServiceRequestForm
              categorySlug={category.slug}
              categoryName={category.name}
              questions={askedQuestions(category.slug, category.questions)}
              allowsEmergency={category.allowsEmergency}
              abroad={searchParams.abroad === '1'}
              defaults={{ name: profile?.full_name, phone: profile?.phone, email: user?.email }}
            />
          </div>
        </div>
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <h2 className="hl-h3 mb-4">How it works</h2>
          <HowRequestsWork compact steps={copy.steps} />
        </aside>
      </div>
    </Container>
  )
}
