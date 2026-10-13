function show(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

/** Old → new for every field in pending_changes that differs from the live value. */
export function ChangesDiff({ live, changes }: { live: Record<string, unknown>; changes: Record<string, unknown> }) {
  const rows = Object.entries(changes).filter(([k, v]) => JSON.stringify(live[k] ?? null) !== JSON.stringify(v ?? null))
  if (rows.length === 0) return <p className="text-small text-muted">No differences from the live version.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-small">
        <thead className="text-caption uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="py-1.5 pr-3">Field</th>
            <th scope="col" className="py-1.5 pr-3">Live now</th>
            <th scope="col" className="py-1.5">Proposed</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(([k, v]) => (
            <tr key={k}>
              <td className="py-1.5 pr-3 font-semibold">{k.replace(/_/g, ' ')}</td>
              <td className="py-1.5 pr-3 text-muted line-through decoration-error/60">{show(live[k])}</td>
              <td className="py-1.5 text-green-darker">{show(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
