// Supply Phase 5: the "Supplies" lines of the admin digest. Counts only (no names, prices or customer details).
// A failure here is logged and skipped, so it can never stop or delay the rest of the digest.
import { log } from '@/lib/log'

export async function supplyDigestLines(load: () => Promise<[string, number][]>): Promise<[string, string][]> {
  try {
    return (await load()).filter(([, n]) => n > 0).map(([label, n]) => [label, String(n)])
  } catch (err) {
    log.error('cron', 'supplies digest section failed', err)
    return []
  }
}
