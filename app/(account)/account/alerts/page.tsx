import Link from 'next/link'
import { Bell } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { parseSavedParams, resultsPath } from '@/lib/alerts'
import { formatDate } from '@/lib/format'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { EmptyState } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { AlertTools } from '@/components/saved/AlertTools'

export const metadata = { title: 'Search alerts' }

/** Saved searches and how often to email (spec 25.2a). */
export default async function AlertsPage() {
  const user = await requireUser('/account/alerts')
  const { data } = await getServerSupabase().from('saved_searches').select('id, name, params, alert_frequency, last_sent_at, created_at').eq('user_id', user.id).order('created_at', { ascending: false })
  const rows = data ?? []
  return (
    <div>
      <AccountPageHeader title="Search alerts" description="Searches you saved. We email you when new properties match, as often as you choose." />
      {rows.length === 0 ? (
        <EmptyState icon={<Bell />} title="No saved searches yet" description="Search for property, then tap “Save this search” to get emails about new matches." actions={<ButtonLink href="/property/for-sale">Search property</ButtonLink>} />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-white">
          {rows.map((r) => {
            const p = parseSavedParams(r.params)
            return (
              <li key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  {p ? (
                    <Link href={resultsPath(p)} className="font-semibold text-ink hover:underline">
                      {r.name}
                    </Link>
                  ) : (
                    <span className="font-semibold">{r.name}</span>
                  )}
                  <p className="text-small text-muted">
                    Saved {formatDate(r.created_at)}
                    {r.last_sent_at ? ` · last email ${formatDate(r.last_sent_at)}` : ''}
                  </p>
                </div>
                <AlertTools id={r.id} frequency={r.alert_frequency} name={r.name} />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
