import 'server-only'
import { revalidatePath, revalidateTag } from 'next/cache'

export type EntityKind = 'property' | 'development' | 'organisation' | 'product' | 'portfolio' | 'job'

/** Cache tag for one record, e.g. tag('property', id). */
export function tag(kind: EntityKind, id: string): string {
  return `${kind}:${id}`
}

/** Cache tag for every list/search of a kind, e.g. "listings:property". */
export function listTag(kind: EntityKind): string {
  return `listings:${kind}`
}

/** Purges caches after a record changes (owner edit, admin moderation, expiry). */
export function revalidateEntity(kind: EntityKind, id: string, extraPaths: string[] = []): void {
  revalidateTag(tag(kind, id))
  revalidateTag(listTag(kind))
  revalidateTag('home')
  for (const p of extraPaths) revalidatePath(p)
}

export function revalidateReference(): void {
  revalidateTag('reference')
}

export function revalidateSettings(): void {
  revalidateTag('settings')
  revalidateTag('home')
}
