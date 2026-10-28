import { readAll, REPORT_MAX_ROWS } from '@/lib/admin/read-all'
import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { AdminHeader, Panel, StatusBadge } from '@/components/admin/AdminUi'
import { VerticalEditor, VerticalStatusSwitch } from '@/components/admin/VerticalTools'

export const metadata = { title: 'Verticals' }

/** The vertical registry (spec 24.2, 24.12): every switch is audit-logged. */
export default async function VerticalsPage() {
  await requireAdminPage()
  const db = getAdminSupabase()
  const [{ data }, { data: interest }] = await Promise.all([
    db.from('verticals').select('*').order('sort'),
    readAll(() => db.from('interest_registrations').select('vertical_key'), { maxRows: REPORT_MAX_ROWS }),
  ])
  const counts = new Map<string, number>()
  for (const r of interest ?? []) counts.set(r.vertical_key, (counts.get(r.vertical_key) ?? 0) + 1)
  return (
    <div className="space-y-5">
      <AdminHeader
        title="Verticals"
        description={
          <>
            Switch each part of HagerLand between <strong>Live</strong>, <strong>Coming soon</strong> (a landing page with a register-interest form, not indexed by search engines) and <strong>Hidden</strong> (removed from menus, pages return “not found”). Changes show on the site within a minute. Areas that belong to one pillar (Supplies, Contractors, Repairs, Finance, Insurance, Jobs, Our Developments) and Property (Buy and Rent) now follow the pillar modes in <Link href="/roodber8/pillars" className="font-semibold text-green hover:underline">Pillars and modes</Link>; Professionals and Diaspora are cross-cutting layers and keep their own switch here.
          </>
        }
      />
      <ul className="space-y-4">
        {(data ?? []).map((v) => (
          <li key={v.key}>
            <Panel
              title={v.name}
              actions={
                v.controlled_by_pillar || v.controlled_by_service ? (
                  <Link href="/roodber8/pillars" className="text-small font-semibold text-green hover:underline">
                    Follows pillar modes
                  </Link>
                ) : (
                  <VerticalStatusSwitch verticalKey={v.key} name={v.name} status={v.status} />
                )
              }
            >
              <div className="mb-4 flex flex-wrap items-center gap-3 text-small text-muted">
                <StatusBadge status={v.status} />
                <span>
                  Page: <Link href={`/${v.slug}`} className="font-semibold text-green hover:underline">/{v.slug}</Link>
                </span>
                <span>
                  Interest registrations:{' '}
                  <Link href={`/roodber8/interest?vertical=${v.key}`} className="font-semibold text-green hover:underline">
                    {counts.get(v.key) ?? 0}
                  </Link>
                </span>
              </div>
              <details>
                <summary className="cursor-pointer text-small font-semibold text-ink">Edit text and forms</summary>
                <div className="mt-3">
                  <VerticalEditor v={v} />
                </div>
              </details>
            </Panel>
          </li>
        ))}
      </ul>
    </div>
  )
}
