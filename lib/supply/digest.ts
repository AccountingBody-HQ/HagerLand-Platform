// Supply Phase 5: the "Supplies" lines of the admin digest. Counts only (no names, prices or customer details).
// A failure here is logged and reported as one "Could not read" line (Fix F-2), so it never stops the rest of the digest.
import { log } from '@/lib/log'
import { COULD_NOT_READ } from '@/lib/cron/digest-text'

export async function supplyDigestLines(load: () => Promise<[string, number][]>): Promise<[string, string][]> {
  try {
    return (await load()).filter(([, n]) => n > 0).map(([label, n]) => [label, String(n)])
  } catch (err) {
    log.error('cron', 'supplies digest section failed', err)
    return [[COULD_NOT_READ, 'Supplies figures']]
  }
}
