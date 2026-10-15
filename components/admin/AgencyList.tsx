import Link from 'next/link'
import type { ReactNode } from 'react'
import { STATUS_LABEL } from '@/lib/agency'
import { AdminHeader, DataTable, FilterBar, FilterField, filterInput, type Column } from '@/components/admin/AdminUi'

/** A filterable list of one kind of agency record (valuations, viewings, offers, applications, tenancies). */
export function AgencyList<T extends { id: string }>({ title, description, base, statuses, status, rows, columns, empty, extra }: { title: string; description: string; base: string; statuses: readonly string[]; status?: string; rows: T[]; columns: Column<T>[]; empty: string; extra?: ReactNode }) {
  return (
    <div className="space-y-5">
      <AdminHeader title={title} description={description} />
      <FilterBar action={base}>
        <FilterField label="Status">
          <select name="status" defaultValue={status ?? ''} className={`${filterInput} h-10`}>
            <option value="">All</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s] ?? s}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>
      <DataTable label={title} rows={rows} rowKey={(r) => r.id} empty={empty} columns={columns} />
      {extra}
    </div>
  )
}

export function RefLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} prefetch={false} className="font-semibold text-green hover:underline">
      {children}
    </Link>
  )
}
