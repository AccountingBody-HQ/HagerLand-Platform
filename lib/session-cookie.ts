/** Supabase keeps the session in "sb-<project>-auth-token" cookies (split into .0, .1 … when large). */
export const SESSION_COOKIE = /(?:^|;\s*)sb-[a-z0-9-]+-auth-token(?:\.\d+)?=/

/** True in the browser when a session cookie exists (lets cached public pages adapt without a server round trip). */
export function hasSessionCookie(): boolean {
  return typeof document !== 'undefined' && SESSION_COOKIE.test(document.cookie)
}
