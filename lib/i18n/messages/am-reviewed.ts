import REVIEWED from './am-reviewed.json'

/**
 * Amharic text checked by a native speaker (Jobs Phase 5), kept in am-reviewed.json. Written ONLY by
 * scripts/i18n-import-review.mjs from the review sheet (rows the reviewer marked OK). Pages served by Amharic for Jobs
 * show only these entries; anything else falls back to English. Never add machine or draft text here by hand.
 */
export const AM_REVIEWED: Record<string, string> = REVIEWED
