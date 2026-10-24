'use client'

import { useSyncExternalStore } from 'react'

// Editors send the record's updated_at so the server refuses a stale edit (lib/concurrency.ts). After the person's own
// save, the page refreshes a moment later; until then other buttons on the page still hold the old updated_at, and a
// quick second click was refused as "Someone else changed this". Saves now return the new updated_at, remembered here
// per record, and every editor of that record sends the newer of the two. A change by someone else is still caught:
// the database then holds a version this page never saw.

const latest = new Map<string, string>()
const listeners = new Set<() => void>()

/** The later of two updated_at values (either may be missing). */
export function newerVersion(a: string | null | undefined, b: string | null | undefined): string {
  if (!a) return b ?? ''
  if (!b) return a
  return new Date(b).getTime() > new Date(a).getTime() ? b : a
}

/** Remembers the updated_at a successful save returned for a record (e.g. "order:<id>"). */
export function rememberVersion(key: string, updatedAt: string | null | undefined): void {
  if (!updatedAt) return
  latest.set(key, newerVersion(latest.get(key), updatedAt))
  listeners.forEach((l) => l())
}

/** The latest updated_at remembered for a record, if any. */
export function rememberedVersion(key: string): string | null {
  return latest.get(key) ?? null
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** The updated_at to send with the next save: the page's value or this person's own later save, whichever is newer. */
export function useLatestVersion(key: string, fromPage: string): string {
  const remembered = useSyncExternalStore(
    subscribe,
    () => rememberedVersion(key),
    () => null,
  )
  return newerVersion(fromPage, remembered)
}
