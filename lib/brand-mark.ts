import MARK from './brand-mark.json'

/**
 * The HagerLand house logo "E1" (F-8): a white house outline in a green circle. The one definition of the mark, used
 * by the site's LogoMark, the share images (lib/og.tsx) and scripts/brand-icons.mjs (which reads brand-mark.json).
 * The logo never changes without AB (CLAUDE.md).
 */
export const BRAND_MARK = MARK as {
  viewBox: number
  circle: { cx: number; cy: number; r: number }
  green: string
  stroke: string
  /** Normal weight (header, footer, admin, share images). */
  strokeWidth: number
  /** Heavier lines for the browser tab icons (16, 32 and 48 px). */
  faviconStrokeWidth: number
  paths: [string, string]
}
