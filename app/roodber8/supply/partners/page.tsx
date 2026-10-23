import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'
import { formatDate, formatPhone } from '@/lib/format'
import { ORG_KIND_LABEL } from '@/lib/org-labels'
import { listSupplyPartners } from '@/lib/supply/data'
import { labelFor, RELATIONSHIP_STATUSES, SUPPLY_ROLES } from '@/lib/supply/partners'
import { AdminHeader, DataTable, FilterBar, FilterField, Panel, SimplePager, StatusBadge, filterInput } from '@/components/admin/AdminUi'

export const metadata = { title: 'Supply partners' }

const PER_PAGE = 50

export default async function SupplyPartnersPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await props.searchParams
  await requireAdminPage()
  const status = RELATIONSHIP_STATUSES.some((s) => s.value === sp.status) ? sp.status : undefined
  const role = SUPPLY_ROLES.some((r) => r.value === sp.role) ? sp.role : undefined
  const due = sp.due === '1'
  const q = (sp.q ?? '').slice(0, 120)
  const page = Math.max(1, Math.min(1000, Number(sp.page) || 1))
  const all = await listSupplyPartners({ status, role, due, q })
  const rows = all.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const filtered = Boolean(status || role || due || q)
  const hrefFor = (p: number) => `/roodber8/supply/partners?${new URLSearchParams({ ...(status && { status }), ...(role && { role }), ...(due && { due: '1' }), ...(q && { q }), page: String(p) })}`
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div>
      <AdminHeader title="Supply partners" description="HagerLand’s private record of the businesses we buy materials from. Never shown on the site." />
      <FilterBar action="/roodber8/supply/partners">
        <FilterField label="Search">
          <input name="q" type="search" defaultValue={q} placeholder="Name, other name or phone" className={`${filterInput} w-56`} />
        </FilterField>
        <FilterField label="Status">
          <select name="status" defaultValue={status ?? ''} className={filterInput}>
            <option value="">All</option>
            {RELATIONSHIP_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Role">
          <select name="role" defaultValue={role ?? ''} className={filterInput}>
            <option value="">All</option>
            {SUPPLY_ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Re-verification">
          <select name="due" defaultValue={due ? '1' : ''} className={filterInput}>
            <option value="">Any</option>
            <option value="1">Due now</option>
          </select>
        </FilterField>
      </FilterBar>
      {all.length === 0 && !filtered ? (
        <Panel title="No supply partners yet">
          <div className="space-y-2 text-small">
            <p>To add your first partner:</p>
            <ol className="list-decimal space-y-1 pl-6">
              <li>
                Open{' '}
                <Link href="/roodber8/organisations" prefetch={false} className="font-semibold text-green underline">
                  Organisations
                </Link>{' '}
                and find the business (or add it with “New organisation”).
              </li>
              <li>On its page, go to the “Supply partner” panel. Check the possible duplicates it lists, and merge them first if they are the same business.</li>
              <li>Tick its roles, say where the information came from, and click “Create supply partner record”. Then add the people you speak to.</li>
            </ol>
          </div>
        </Panel>
      ) : (
        <>
          <p className="mb-2 text-small text-muted">{all.length === 1 ? '1 partner' : `${all.length} partners`}</p>
          <DataTable
            label="Supply partners"
            rows={rows}
            rowKey={(r) => r.orgId}
            empty="No partners match. Try a different search or clear the filters."
            columns={[
              {
                key: 'name',
                label: 'Business',
                render: (r) => (
                  <div>
                    <Link href={`/roodber8/organisations/${r.orgId}`} prefetch={false} className="font-semibold hover:underline">
                      {r.name}
                    </Link>
                    {r.aka.length > 0 && <p className="text-caption text-muted">Also: {r.aka.join(', ')}</p>}
                    <p className="text-caption text-muted">
                      {ORG_KIND_LABEL[r.kind] ?? r.kind}
                      {r.location ? ` · ${r.location}` : ''}
                    </p>
                  </div>
                ),
              },
              { key: 'phone', label: 'Phone', render: (r) => (r.phone ? formatPhone(r.phone) : '') },
              { key: 'roles', label: 'Roles', render: (r) => r.roles.map((x) => labelFor(SUPPLY_ROLES, x)).join(', ') },
              {
                key: 'status',
                label: 'Status',
                render: (r) => (
                  <div>
                    <StatusBadge status={r.status} />
                    {r.statusChangedAt && <p className="text-caption text-muted">since {formatDate(r.statusChangedAt)}</p>}
                  </div>
                ),
              },
              {
                key: 'reverify',
                label: 'Re-verify by',
                render: (r) => (r.reverifyBy ? <span className={r.reverifyBy <= today ? 'font-semibold text-error' : ''}>{formatDate(r.reverifyBy)}</span> : ''),
              },
            ]}
          />
          <SimplePager page={page} hasMore={all.length > page * PER_PAGE} hrefFor={hrefFor} />
        </>
      )}
    </div>
  )
}
