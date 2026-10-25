import Link from 'next/link'
import { isOwnerSession, requireAdminPage } from '@/lib/admin/guard'
import { ButtonLink } from '@/components/ui/Button'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/format'
import { EMPLOYMENT_TYPES, categoryLabel, labelFor } from '@/lib/jobs'
import { AdminHeader, DataTable, FilterBar, FilterField, KeyValue, Panel, SimplePager, StatusBadge, filterInput } from '@/components/admin/AdminUi'

export const metadata = { title: 'Jobs and applications' }

const PAGE = 50
const STATUSES = ['draft', 'pending_review', 'published', 'paused', 'expired', 'rejected', 'archived', 'removed'] as const

/** Every job with its application count, plus an overview of applications (spec 24.9, 24.12). */
export default async function AdminJobsPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const searchParams = await props.searchParams
  await requireAdminPage()
  const db = getAdminSupabase()
  const status = STATUSES.find((s) => s === searchParams.status)
  const page = Math.max(1, Number(searchParams.page) || 1)
  let q = db.from('job_posts').select('id, title, category, employment_type, status, applications_count, employer_org_id, published_at, expires_at, updated_at').order('updated_at', { ascending: false }).range((page - 1) * PAGE, page * PAGE)
  if (status) q = q.eq('status', status)
  const head = { count: 'exact' as const, head: true }
  const [{ data }, live, pending, apps, apps30, hired, phoneApps, register, owner] = await Promise.all([
    q,
    db.from('job_posts').select('id', head).eq('status', 'published'),
    db.from('job_posts').select('id', head).eq('status', 'pending_review'),
    db.from('job_applications').select('id', head),
    db.from('job_applications').select('id', head).gte('created_at', new Date(Date.now() - 30 * 86_400_000).toISOString()),
    db.from('job_applications').select('id', head).eq('status', 'hired'),
    db.from('job_applications').select('id', head).eq('channel', 'phone'),
    db.from('worker_register').select('id', head).is('personal_data_deleted_at', null),
    isOwnerSession(),
  ])
  const rows = (data ?? []).slice(0, PAGE)
  const { data: orgs } = await db.from('organisations').select('id, name').in('id', Array.from(new Set(rows.map((r) => r.employer_org_id))))
  const orgName = new Map((orgs ?? []).map((o) => [o.id, o.name]))
  return (
    <div className="space-y-5">
      <AdminHeader
        title="Jobs and applications"
        description="Jobs are reviewed in the review queue. Applications are between candidates and employers; personal details are deleted 12 months after an application."
        actions={
          <span className="flex flex-wrap gap-2">
            <ButtonLink href="/roodber8/jobs/desk" variant="secondary" size="sm" prefetch={false}>
              Recruitment desk
            </ButtonLink>
            <ButtonLink href="/roodber8/jobs/register" variant="secondary" size="sm" prefetch={false}>
              Worker register
            </ButtonLink>
            {owner && (
              <ButtonLink href="/roodber8/jobs/data" variant="secondary" size="sm" prefetch={false}>
                Switches and data deletion
              </ButtonLink>
            )}
          </span>
        }
      />
      <Panel title="Overview">
        <KeyValue
          items={[
            ['Live jobs', String(live.count ?? 0)],
            ['Waiting for review', pending.count ? <Link href="/roodber8/review?tab=jobs" className="font-semibold text-green underline">{pending.count}</Link> : '0'],
            ['Applications (all time)', String(apps.count ?? 0)],
            ['Applications (last 30 days)', String(apps30.count ?? 0)],
            ['Marked as hired', String(hired.count ?? 0)],
            ['Applications by phone (all time)', String(phoneApps.count ?? 0)],
            ['Worker register entries', String(register.count ?? 0)],
          ]}
        />
      </Panel>
      <FilterBar action="/roodber8/jobs">
        <FilterField label="Status">
          <select name="status" defaultValue={status ?? ''} className={filterInput}>
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>
      <DataTable
        label="Jobs"
        rows={rows}
        rowKey={(r) => r.id}
        empty="No jobs match."
        columns={[
          { key: 't', label: 'Job', render: (r) => (<Link href={`/roodber8/jobs/${r.id}`} className="font-semibold text-green hover:underline">{r.title}</Link>) },
          { key: 'e', label: 'Employer', render: (r) => orgName.get(r.employer_org_id) ?? '' },
          { key: 'c', label: 'Category', render: (r) => `${categoryLabel(r.category)} · ${labelFor(EMPLOYMENT_TYPES, r.employment_type)}` },
          { key: 'a', label: 'Applications', render: (r) => String(r.applications_count) },
          { key: 'x', label: 'Open until', render: (r) => (r.status === 'published' && r.expires_at ? formatDate(r.expires_at) : '') },
          { key: 's', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        ]}
      />
      <SimplePager page={page} hasMore={(data ?? []).length > PAGE} hrefFor={(p) => `/roodber8/jobs?${new URLSearchParams({ ...(status ? { status } : {}), page: String(p) }).toString()}`} />
    </div>
  )
}
