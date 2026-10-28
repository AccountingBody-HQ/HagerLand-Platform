/**
 * The failure rule for admin figures: stops when any query failed, so a page, a report or the digest never shows zeros
 * (or "Reconciles: yes") for data it could not read. Takes one query result or the array from Promise.all.
 * Used by Supplies (lib/supply/insights-data.ts re-exports it), Jobs insights, Demand and Performance.
 */
export function must<T>(result: T): T {
  for (const r of (Array.isArray(result) ? result : [result]) as unknown[]) {
    const error = (r as { error?: { message: string } | null } | null)?.error
    if (error) throw new Error(`Could not read from the database: ${error.message}`)
  }
  return result
}
