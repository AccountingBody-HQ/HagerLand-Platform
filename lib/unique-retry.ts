/**
 * Runs an insert that uses a freshly generated short id or slug, and tries again with a new one if the
 * database reports a duplicate (unique violation 23505). Collisions are very rare; this makes them harmless (spec 25.4).
 */
export async function withUniqueRetry<T extends { error: { code?: string } | null }>(attempt: () => PromiseLike<T>, tries = 3): Promise<T> {
  let result = await attempt()
  for (let i = 1; i < tries && result.error?.code === '23505'; i++) result = await attempt()
  return result
}
