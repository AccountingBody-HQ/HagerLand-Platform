export interface Fact {
  label: string
  value: string | number | null | undefined
}

/** Grid of labelled facts; empty values are left out. */
export function KeyFacts({ facts }: { facts: Fact[] }) {
  const shown = facts.filter((f) => f.value !== null && f.value !== undefined && f.value !== '')
  if (shown.length === 0) return null
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {shown.map((f) => (
        <div key={f.label} className="rounded-lg bg-stone-50 p-4">
          <dt className="text-small text-muted">{f.label}</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-ink">{f.value}</dd>
        </div>
      ))}
    </dl>
  )
}
