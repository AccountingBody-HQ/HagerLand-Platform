import { TriangleAlert } from 'lucide-react'

/** Scam and fairness warnings for a job advert (Jobs Phase 2). Warnings only: HagerLand decides; nothing is rejected automatically. */
export function AdvertWarnings({ warnings }: { warnings: string[] }) {
  return (
    <div className="rounded-md border border-gold/40 bg-gold-soft/40 p-4" role="note">
      <p className="flex items-center gap-2 font-semibold text-ink">
        <TriangleAlert className="size-5 text-gold" aria-hidden /> Check before approving
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-small">
        {warnings.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
      <p className="mt-2 text-caption text-muted">These are automatic hints from the wording, not decisions. Approve or send back as usual.</p>
    </div>
  )
}
