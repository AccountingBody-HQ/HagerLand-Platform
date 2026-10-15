import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { getProjectWithLinks } from '@/lib/data/projects'
import { formatDate } from '@/lib/format'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { ProjectView } from '@/components/build/ProjectView'

export const metadata = { title: 'Building project' }

/** The customer's project page: the brief and every linked request and quote (spec 26.9). */
export default async function ProjectPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()
  const user = await requireUser(`/account/projects/${id}`)
  const data = await getProjectWithLinks(id, user.id)
  if (!data) notFound()
  return (
    <div>
      <AccountPageHeader title={data.project.title} description={`${data.project.reference} · started ${formatDate(data.project.created_at)}`} />
      <ProjectView data={data} requestHref={(rid) => `/account/service-requests/${rid}`} quoteHref={() => '/account/quotes'} />
    </div>
  )
}
