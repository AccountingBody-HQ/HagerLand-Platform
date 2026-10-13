import Link from 'next/link'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Badge, type BadgeTone } from '@/components/ui/Badge'

export function AdminHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-h2 font-bold text-ink">{title}</h1>
        {description && <div className="mt-1 text-small text-muted">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Panel({ title, children, className, actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cn('min-w-0 rounded-lg border border-border bg-white', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          {title && <h2 className="font-semibold text-ink">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

export interface Column<T> {
  key: string
  label: string
  render: (row: T) => ReactNode
  className?: string
}

/** Dense, scrollable table for admin lists. */
export function DataTable<T>({ rows, columns, rowKey, empty = 'Nothing here.', label = 'Table' }: { rows: T[]; columns: Column<T>[]; rowKey: (row: T) => string; empty?: string; label?: string }) {
  if (rows.length === 0) return <p className="rounded-lg border border-dashed border-border-strong bg-white p-8 text-center text-small text-muted">{empty}</p>
  return (
    // Focusable so keyboard users can scroll wide tables sideways.
    <div className="overflow-x-auto rounded-lg border border-border bg-white" role="region" aria-label={label} tabIndex={0}>
      <table className="w-full min-w-[720px] text-left text-small">
        <thead className="bg-stone-50 text-caption uppercase tracking-wide text-muted">
          <tr>
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn('px-3 py-2.5 font-semibold', c.className)}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={rowKey(r)} className="hover:bg-stone-50">
              {columns.map((c) => (
                <td key={c.key} className={cn('px-3 py-2.5 align-top', c.className)}>
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const STATUS_TONES: Record<string, BadgeTone> = {
  draft: 'neutral', pending_review: 'info', published: 'green', paused: 'warning', expired: 'warning', rejected: 'danger', archived: 'neutral', removed: 'danger',
  pending: 'info', approved: 'green', open: 'info', actioned: 'green', dismissed: 'neutral',
  new: 'green', contacted: 'info', qualified: 'gold', won: 'ink', lost: 'neutral', spam: 'danger',
  submitted: 'info', in_review: 'info', quoted: 'gold', accepted: 'green', declined: 'neutral', cancelled: 'neutral',
  listed: 'neutral', claimed: 'green', verified: 'gold',
  imported: 'green', failed: 'danger', skipped: 'neutral',
  live: 'green', coming_soon: 'gold', hidden: 'ink', reviewing: 'info', closed: 'neutral',
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const s = status ?? 'unknown'
  return <Badge tone={STATUS_TONES[s] ?? 'neutral'}>{s.replace(/_/g, ' ')}</Badge>
}

/** GET filter bar. Children are inputs with name attributes. */
export function FilterBar({ action, children }: { action: string; children: ReactNode }) {
  return (
    <form action={action} method="get" className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-white p-3 [&_input]:h-10 [&_select]:h-10">
      {children}
      <button type="submit" className="h-10 rounded-md bg-ink px-4 text-small font-semibold text-white">
        Filter
      </button>
      <Link href={action} className="inline-flex h-10 items-center px-2 text-small text-muted hover:text-ink">
        Clear
      </Link>
    </form>
  )
}

export function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-caption font-semibold text-muted">
      {label}
      {children}
    </label>
  )
}

export const filterInput = 'rounded-sm border border-border-strong bg-white px-2.5 text-small text-ink'

export function SimplePager({ page, hasMore, hrefFor }: { page: number; hasMore: boolean; hrefFor: (p: number) => string }) {
  if (page === 1 && !hasMore) return null
  return (
    <div className="mt-4 flex items-center justify-between text-small">
      {page > 1 ? <Link href={hrefFor(page - 1)} className="font-semibold text-green">← Previous</Link> : <span />}
      <span className="text-muted">Page {page}</span>
      {hasMore ? <Link href={hrefFor(page + 1)} className="font-semibold text-green">Next →</Link> : <span />}
    </div>
  )
}

export function KeyValue({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 text-small sm:grid-cols-2">
      {items
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <dt className="w-36 shrink-0 text-muted">{k}</dt>
            <dd className="min-w-0 break-words text-ink">{v}</dd>
          </div>
        ))}
    </dl>
  )
}
