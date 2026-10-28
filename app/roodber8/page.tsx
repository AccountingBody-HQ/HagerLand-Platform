import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'
import { queueCounts, unansweredEnquiriesCount } from '@/lib/admin/counts'
import { must } from '@/lib/admin/must'
import { DAILY_RUN_ACTION, NO_RECENT_RUN, lastRunStatus } from '@/lib/cron/digest-text'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatNumber, relativeTime } from '@/lib/format'
import { AdminHeader, Panel } from '@/components/admin/AdminUi'
import { getAdminSession } from '@/lib/admin-auth'
import { ROLE_LABEL, roleCanAccess } from '@/lib/admin/roles'
import { ADMIN_NAV } from '@/components/admin/admin-nav-items'
import { FormAlert } from '@/components/forms/FormParts'

export const metadata = { title: 'Dashboard' }

function Kpi({ label, value, href, tone }: { label: string; value: number; href?: string; tone?: 'alert' }) {
  const body = (
    <>
      <p className="text-small text-muted">{label}</p>
      <p className={`mt-1 font-display text-h2 font-bold tabular-nums ${tone === 'alert' && value > 0 ? 'text-warning-dark' : 'text-ink'}`}>{formatNumber(value)}</p>
    </>
  )
  return href ? (
    <Link href={href} className="block rounded-lg border border-border bg-white p-4 hover:border-green">
      {body}
    </Link>
  ) : (
    <div className="rounded-lg border border-border bg-white p-4">{body}</div>
  )
}

export default async function AdminDashboard(props: { searchParams: Promise<{ denied?: string }> }) {
  await requireAdminPage()
  const sp = await props.searchParams
  const session = await getAdminSession()
  // Staff (other than owners) see a short start page with their own areas only (spec 26.15).
  if (session?.kind === 'staff' && session.role !== 'owner') {
    const areas = ADMIN_NAV.filter((i) => i.href !== '/roodber8' && roleCanAccess(session.role, i.href))
    return (
      <div className="space-y-5">
        <AdminHeader title={`Hello, ${session.name.split(' ')[0]}`} description={ROLE_LABEL[session.role]} />
        {sp.denied && <FormAlert>That area is not part of your role. Ask the owner if you need it.</FormAlert>}
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((a) => (
            <li key={a.href}>
              <Link href={a.href} prefetch={false} className="block rounded-lg border border-border bg-white p-4 font-semibold text-ink hover:border-green">
                {a.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    )
  }
  const db = getAdminSupabase()
  const now = Date.now()
  const iso = (ms: number) => new Date(ms).toISOString()
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)
  const head = { count: 'exact' as const, head: true }
  // The failure rule (Fix F-2): a failed read shows the error page, never 0 or "No activity yet".
  const [q, enqToday, enq7, enqUnanswered, quotesOpen, signups7, expiring, live, audit, lastRun] = must(await Promise.all([
    queueCounts(),
    db.from('enquiries').select('id', head).gte('created_at', startOfDay.toISOString()),
    db.from('enquiries').select('id', head).gte('created_at', iso(now - 7 * 86_400_000)),
    unansweredEnquiriesCount(now),
    db.from('quote_requests').select('id', head).in('status', ['submitted', 'in_review']),
    db.from('profiles').select('id', head).gte('created_at', iso(now - 7 * 86_400_000)),
    db.from('properties').select('id', head).eq('status', 'published').lt('expires_at', iso(now + 7 * 86_400_000)),
    db.from('properties').select('id', head).eq('status', 'published'),
    db.from('audit_log').select('id, action, entity_type, entity_label, created_at').order('created_at', { ascending: false }).limit(12),
    db.from('audit_log').select('created_at, diff').eq('action', DAILY_RUN_ACTION).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]))
  const n = (r: { count: number | null }) => r.count ?? 0
  const run = lastRunStatus(lastRun.data, now)

  return (
    <div className="space-y-6">
      <AdminHeader title="Dashboard" description="What needs attention today." />
      <div data-testid="last-daily-run" className="space-y-2">
        {run.warning && <FormAlert>{NO_RECENT_RUN}</FormAlert>}
        {run.line && <p className="text-small text-muted">{run.line}</p>}
      </div>
      <section aria-label="Review queues">
        <h2 className="mb-3 text-small font-semibold uppercase tracking-wide text-muted">Waiting for review</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <Kpi label="Properties" value={q.properties} href="/roodber8/review?tab=properties" tone="alert" />
          <Kpi label="Organisations" value={q.organisations} href="/roodber8/review?tab=organisations" tone="alert" />
          <Kpi label="Developments" value={q.developments} href="/roodber8/review?tab=developments" tone="alert" />
          <Kpi label="Pending changes" value={q.changes} href="/roodber8/review?tab=changes" tone="alert" />
          <Kpi label="Photos" value={q.media} href="/roodber8/review?tab=media" tone="alert" />
          <Kpi label="Portfolio" value={q.portfolio} href="/roodber8/review?tab=portfolio" tone="alert" />
          <Kpi label="Claims" value={q.claims} href="/roodber8/review?tab=claims" tone="alert" />
          <Kpi label="Verification" value={q.verification} href="/roodber8/review?tab=verification" tone="alert" />
          <Kpi label="Reports" value={q.reports} href="/roodber8/review?tab=reports" tone="alert" />
        </div>
      </section>
      <section aria-label="Activity">
        <h2 className="mb-3 text-small font-semibold uppercase tracking-wide text-muted">Activity</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi label="Enquiries today" value={n(enqToday)} href="/roodber8/enquiries" />
          <Kpi label="Enquiries, 7 days" value={n(enq7)} href="/roodber8/enquiries" />
          <Kpi label="Unanswered over 48 h" value={n(enqUnanswered)} href="/roodber8/enquiries?unanswered=1" tone="alert" />
          <Kpi label="Open quotes" value={n(quotesOpen)} href="/roodber8/quotes" tone="alert" />
          <Kpi label="New sign-ups, 7 days" value={n(signups7)} href="/roodber8/users" />
          <Kpi label="Listings expiring in 7 days" value={n(expiring)} href="/roodber8/properties?expiring=1" />
        </div>
        <p className="mt-2 text-small text-muted">{formatNumber(n(live))} live property listings.</p>
      </section>
      <Panel title="Recent admin activity" actions={<Link href="/roodber8/audit" className="text-small font-semibold text-green">Full audit log</Link>}>
        {(audit.data ?? []).length === 0 ? (
          <p className="text-small text-muted">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-border text-small">
            {(audit.data ?? []).map((a) => (
              <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2">
                <span>
                  <span className="font-semibold">{a.action}</span> {a.entity_label && <span className="text-muted">· {a.entity_label}</span>}
                </span>
                <span className="text-muted">{relativeTime(a.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
