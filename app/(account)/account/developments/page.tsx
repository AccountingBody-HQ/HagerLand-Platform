import Link from 'next/link'
import { Building2, Plus } from 'lucide-react'
import { getActiveMembership, requireUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { ButtonLink } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Layout'
import { LISTING_STATUS_LABELS } from '@/lib/labels'
import { LoadFailed } from '@/components/account/LoadFailed'
import { log } from '@/lib/log'

export const metadata = { title: 'Developments' }

export default async function MyDevelopmentsPage() {
  await requireUser('/account/developments')
  const active = await getActiveMembership()
  if (active?.org.kind !== 'developer') return <EmptyState icon={<Building2 />} title="Developments are for developer accounts" description="Create a developer business profile to add developments." />
  const { data, error } = await getServerSupabase().from('developments').select('id, name, status, completion_status, total_units, updated_at, pending_changes').eq('developer_org_id', active.org.id).neq('status', 'archived').order('updated_at', { ascending: false })
  if (error) log.error('account', 'developments failed to load', error)
  const rows = data ?? []
  return (
    <div>
      <AccountPageHeader
        title="Developments"
        description="Add your projects, then list individual units as properties linked to them."
        action={
          <ButtonLink href="/account/developments/new">
            <Plus /> Add development
          </ButtonLink>
        }
      />
      {error ? (
        <LoadFailed what="your developments" />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Building2 />} title="No developments yet" actions={<ButtonLink href="/account/developments/new">Add your first development</ButtonLink>} />
      ) : (
        <ul className="space-y-3">
          {rows.map((d) => {
            const s = LISTING_STATUS_LABELS[d.status]
            return (
              <li key={d.id}>
                <Link href={`/account/developments/${d.id}`} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-white p-4 shadow-sm hover:border-green">
                  <div>
                    <p className="font-semibold">{d.name}</p>
                    <p className="text-small text-muted">{d.total_units ? `${d.total_units} units` : 'Units not set'}</p>
                  </div>
                  <div className="flex gap-2">
                    {d.pending_changes && <Badge tone="info">Changes in review</Badge>}
                    <Badge tone={s.tone}>{s.label}</Badge>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
