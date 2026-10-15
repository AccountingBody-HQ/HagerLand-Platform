const TRANSLIT: Record<string, string> = { æ: 'ae', ø: 'o', å: 'a', ß: 'ss', œ: 'oe', ł: 'l', đ: 'd', þ: 'th' }

/** URL-safe ASCII slug. Ethiopic and other non-Latin characters are dropped (they stay in the title). */
export function slugify(input: string, maxLength = 80): string {
  const ascii = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[æøåßœłđþ]/g, (ch) => TRANSLIT[ch] ?? '')
    .replace(/&/g, ' and ')
    .replace(/\+/g, ' plus ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return ascii.slice(0, maxLength).replace(/-+$/g, '')
}

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'

/** Random base36 id (default 8 chars), e.g. "k7f2q9ab". */
export function shortId(length = 8): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => ALPHABET[b % 36]).join('')
}

/** "3-bed-apartment-bole-addis-ababa-k7f2q9ab": readable text plus the short id. */
export function listingSlug(text: string, id: string): string {
  const base = slugify(text, 70)
  return base ? `${base}-${id}` : id
}

/** Extracts the 8-char short id from the end of a listing slug, or null for legacy/invalid slugs. */
export function shortIdFromSlug(slug: string): string | null {
  const m = /(?:^|-)([0-9a-z]{8})$/.exec(slug)
  return m ? m[1] : null
}
