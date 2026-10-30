import Link from 'next/link'
import { FolderKanban } from 'lucide-react'
import { getActiveMembership, requireUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { PortfolioForm } from '@/components/account/PortfolioForm'
import { Card, EmptyState } from '@/components/ui/Layout'
import { Badge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { MediaImage } from '@/components/media/MediaImage'
import { LISTING_STATUS_LABELS } from '@/lib/labels'
import { LoadFailed } from '@/components/account/LoadFailed'
import { log } from '@/lib/log'

export const metadata = { title: 'Portfolio' }

export default async function PortfolioListPage() {
  await requireUser('/account/company/portfolio')
  const active = await getActiveMembership()
  if (!active) return <EmptyState icon={<FolderKanban />} title="Create a business profile first" actions={<ButtonLink href="/onboarding?business=1">Create a business profile</ButtonLink>} />
  const { data, error } = await getServerSupabase().from('portfolio_projects').select('id, title, status, year, cover_path').eq('org_id', active.org.id).neq('status', 'archived').order('created_at', { ascending: false })
  if (error) log.error('account', 'portfolio failed to load', error)
  const projects = data ?? []
  return (
    <div className="space-y-6">
      <AccountPageHeader title="Portfolio" description="Show real projects. Profiles with photos of finished work get far more enquiries." />
      {error && <LoadFailed what="your portfolio" />}
      {projects.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {projects.map((p) => {
            const s = LISTING_STATUS_LABELS[p.status]
            return (
              <li key={p.id}>
                <Link href={`/account/company/portfolio/${p.id}`} className="flex gap-4 rounded-lg border border-border bg-white p-3 shadow-sm hover:border-green">
                  <div className="relative size-24 shrink-0 overflow-hidden rounded-md bg-stone-100">{p.cover_path && <MediaImage path={p.cover_path} alt="" fill sizes="96px" className="object-cover" />}</div>
                  <div>
                    <Badge tone={s.tone}>{s.label}</Badge>
                    <p className="mt-1 font-semibold">{p.title}</p>
                    {p.year && <p className="text-small text-muted">{p.year}</p>}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      <Card className="p-5 sm:p-6">
        <h2 className="hl-h3 mb-4">Add a project</h2>
        <PortfolioForm defaults={{}} />
      </Card>
    </div>
  )
}
