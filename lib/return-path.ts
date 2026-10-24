/**
 * Where a visitor goes after signing in or up. Only same-site relative paths are accepted; anything else
 * (another host, a scheme, backslashes, encoded tricks, control characters, admin paths) gives the fallback.
 * Pure and edge-safe: used by middleware, pages, server actions and the auth callback.
 */

/** Set by middleware on /account requests (the page address), so the account layout can send people back to it. */
export const RETURN_PATH_HEADER = 'x-hl-return-path'

const MAX_LENGTH = 512
const BASE = 'http://return-path.invalid'
const CONTROL = /[\u0000-\u001F\u007F]/
const ADMIN = /^\/(am\/)?roodber8/

function decodeFully(value: string): string | null {
  let current = value
  for (let i = 0; i < 4; i += 1) {
    let next: string
    try {
      next = decodeURIComponent(current)
    } catch {
      return null
    }
    if (next === current) return current
    current = next
  }
  return null
}

function looksSafe(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('\\') && !CONTROL.test(path)
}

export function safeNextPath(value: unknown, fallback = '/account'): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_LENGTH) return fallback
  if (/\s/.test(value) || !looksSafe(value)) return fallback
  const decoded = decodeFully(value)
  if (decoded === null || !looksSafe(decoded)) return fallback
  let url: URL
  try {
    url = new URL(decoded, BASE)
  } catch {
    return fallback
  }
  if (url.origin !== BASE || ADMIN.test(url.pathname.toLowerCase())) return fallback
  return value
}
