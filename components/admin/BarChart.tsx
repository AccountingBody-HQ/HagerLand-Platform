/** Lightweight inline SVG bar chart (no chart library), with a text alternative for screen readers. */
export function BarChart({ data, label, empty = 'Nothing recorded in this period yet.' }: { data: { label: string; value: number }[]; label: string; empty?: string }) {
  if (data.every((d) => d.value === 0)) return <p className="py-10 text-center text-small text-muted">{empty}</p>
  const max = Math.max(1, ...data.map((d) => d.value))
  const w = 30
  const gap = 12
  const h = 120
  const width = data.length * (w + gap)
  // Label every other bar when there are many, so the dates never overlap.
  const step = data.length > 8 ? 2 : 1
  return (
    <figure className="min-w-0">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${h + 24}`} width={width} height={h + 24} role="img" aria-label={label} className="text-green">
          {data.map((d, i) => {
            const bh = Math.round((d.value / max) * (h - 14))
            const x = i * (w + gap)
            return (
              <g key={d.label}>
                <rect x={x} y={h - bh} width={w} height={Math.max(bh, d.value ? 2 : 0)} rx={3} className="fill-current" />
                {d.value > 0 && (
                  <text x={x + w / 2} y={h - bh - 4} textAnchor="middle" className="fill-ink text-[11px]">
                    {d.value}
                  </text>
                )}
                {(data.length - 1 - i) % step === 0 && (
                  <text x={x + w / 2} y={h + 16} textAnchor="middle" className="fill-muted text-[10px]">
                    {d.label}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
      <figcaption className="sr-only">
        {label}: {data.map((d) => `${d.label} ${d.value}`).join(', ')}
      </figcaption>
    </figure>
  )
}
