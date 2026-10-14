import { z } from 'zod'

/** One line of a quote list (shared by the browser store and the account copy, spec 10.5 / 25.2a). */
export const quoteItemSchema = z
  .object({
    key: z.string().min(1).max(80),
    productId: z.uuid().optional(),
    slug: z.string().max(200).optional(),
    name: z.string().trim().min(1).max(300),
    unit: z.string().max(20),
    quantity: z.number().positive().max(1_000_000),
    notes: z.string().max(500).optional(),
    imagePath: z.string().max(300).nullable().optional(),
  })
  .strip()

export const quoteListSchema = z.array(quoteItemSchema).max(100)
export type SyncedQuoteItem = z.infer<typeof quoteItemSchema>

/**
 * Combines the list in this browser with the one saved to the account: catalogue products appear once
 * (with the larger quantity), custom lines are kept from both, the browser's order first.
 */
export function mergeQuoteLists(local: SyncedQuoteItem[], remote: SyncedQuoteItem[]): SyncedQuoteItem[] {
  const out = [...local]
  for (const r of remote) {
    const same = r.productId ? out.findIndex((l) => l.productId === r.productId) : out.findIndex((l) => l.key === r.key)
    if (same === -1) out.push(r)
    else if (r.quantity > out[same].quantity) out[same] = { ...out[same], quantity: r.quantity }
  }
  return out.slice(0, 100)
}
