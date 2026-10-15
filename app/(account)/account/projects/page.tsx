import Link from 'next/link'
import { HardHat } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/format'
import { PROJECT_STATUS_LABEL } from '@/lib/build-projects'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { EmptyState } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

export const metadata = { title: 'Building projects' }

export default async function ProjectsPage() {
  const user = await requireUser('/account/projects')
  const { data } = await getAdminSupabase().from('build_projects').select('id, reference, title, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false })
  const rows = data ?? []
  return (
    <div>
      <AccountPageHeader title="Building projects" description="Each project keeps its design, engineering, contractor, materials and finance requests together." action={<ButtonLink href="/build/project" size="sm">Start a project</ButtonLink>} />
      {rows.length === 0 ? (
        <EmptyState icon={<HardHat />} title="No projects yet" description="Start a building project to get matched with architects, engineers, contractors and a materials quote, all under one reference." actions={<ButtonLink href="/build/project">Start a building project</ButtonLink>} />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-white">
          {rows.map((p) => (
            <li key={p.id}>
              <Link href={`/account/projects/${p.id}`} className="flex flex-col gap-1 p-4 hover:bg-stone-50 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  <span className="block font-semibold text-ink">{p.title}</span>
                  <span className="text-small text-muted">
                    {p.reference} · started {formatDate(p.created_at)}
                  </span>
                </span>
                <Badge tone="info">{PROJECT_STATUS_LABEL[p.status]}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
