/**
 * API addresses of the old site (before the relaunch). They answer 410 Gone so old clients and crawlers
 * stop calling them (spec 25.4 / Section 20).
 */
const LEGACY_API =
  /^\/api\/(birrbank-[a-z-]+|business|cars|community|delivery|enquiry|events|housing|jobs|made-in-ethiopia|money|populate-institution|tutors|verify-institution|cron\/(admin-digest|birrbank-nbe-fx|promo-expiry)|admin\/(auto-import|import))(\/|$)/

export function isLegacyApi(pathname: string): boolean {
  return LEGACY_API.test(pathname)
}
