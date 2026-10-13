import { formatDate } from '@/lib/format'

export function AuditTrail({ entries }: { entries: { id: string; action: string; created_at: string; diff: unknown }[] }) {
  if (entries.length === 0) return <p className="text-small text-muted">No admin changes yet.</p>
  return (
    <ul className="space-y-2 text-small">
      {entries.map((e) => (
        <li key={e.id} className="border-b border-border pb-2 last:border-0">
          <p>
            <span className="font-semibold">{e.action}</span> <span className="text-muted">· {formatDate(e.created_at)}</span>
          </p>
          {e.diff && Object.keys(e.diff as object).length > 0 ? (
            <details className="mt-1">
              <summary className="cursor-pointer text-caption text-muted">Details</summary>
              <pre className="mt-1 max-h-48 overflow-auto rounded bg-stone-50 p-2 text-caption">{JSON.stringify(e.diff, null, 2)}</pre>
            </details>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
