const etb = new Intl.NumberFormat('en-ET', { maximumFractionDigits: 0 })
const etbCents = new Intl.NumberFormat('en-ET', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const area = new Intl.NumberFormat('en-ET', { maximumFractionDigits: 2 })
const plain = new Intl.NumberFormat('en-ET')

/** "ETB 4,500,000" (whole birr, used for property). */
export function formatETB(value: number | null | undefined): string {
  if (value === null || value === undefined) return ''
  return `ETB ${etb.format(value)}`
}

/** Product prices are stored in cents: "ETB 1,200.00" (or whole birr when there are no cents). */
export function formatETBCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return ''
  return cents % 100 === 0 ? `ETB ${etb.format(cents / 100)}` : `ETB ${etbCents.format(cents / 100)}`
}

/** Compact price for chips and filters: "ETB 4.5M", "ETB 35K". */
export function formatETBCompact(value: number): string {
  if (value >= 1_000_000) return `ETB ${Number((value / 1_000_000).toFixed(1))}M`
  if (value >= 1_000) return `ETB ${Number((value / 1_000).toFixed(1))}K`
  return `ETB ${value}`
}

export function formatNumber(value: number): string {
  return plain.format(value)
}

/** "120 m²" */
export function formatArea(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  return `${area.format(Number(value))} m²`
}

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Addis_Ababa' })

/** "12 Oct 2026" */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return ''
  return dateFmt.format(d)
}

/** "today", "yesterday", "3 days ago", "2 weeks ago", then a date. */
export function relativeTime(value: string | Date | null | undefined, now: Date = new Date()): string {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 14) return `${days} days ago`
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`
  return `on ${formatDate(d)}`
}

/**
 * Normalise a phone number to E.164 (+2519XXXXXXXX). Ethiopian numbers may be typed as
 * 09…, 07…, 9…, 2519… or +2519…; other international numbers must start with + or 00.
 * Returns null when the number is not valid.
 */
export function normalisePhone(input: string): string | null {
  const raw = input.trim().replace(/[\s().-]/g, '')
  if (!raw) return null
  let digits = raw.startsWith('+') ? raw.slice(1) : raw.startsWith('00') ? raw.slice(2) : raw
  if (!/^\d+$/.test(digits)) return null
  if (!raw.startsWith('+') && !raw.startsWith('00')) {
    if (/^0[79]\d{8}$/.test(digits)) digits = `251${digits.slice(1)}`
    else if (/^[79]\d{8}$/.test(digits)) digits = `251${digits}`
  }
  if (digits.startsWith('251')) {
    return /^251[79]\d{8}$/.test(digits) ? `+${digits}` : null
  }
  if (!raw.startsWith('+') && !raw.startsWith('00')) return null
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null
}

/** "+251 91 123 4567" for Ethiopian numbers; other numbers are shown as stored. */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return ''
  const m = /^\+251(\d{2})(\d{3})(\d{4})$/.exec(e164)
  return m ? `+251 ${m[1]} ${m[2]} ${m[3]}` : e164
}

export function whatsappLink(e164: string, message?: string): string {
  const digits = e164.replace(/\D/g, '')
  return `https://wa.me/${digits}${message ? `?text=${encodeURIComponent(message)}` : ''}`
}

export function telegramLink(username: string): string | null {
  const clean = username.trim().replace(/^@/, '').replace(/^https?:\/\/t\.me\//i, '')
  return /^[A-Za-z0-9_]{5,32}$/.test(clean) ? `https://t.me/${clean}` : null
}

export function pluralise(count: number, singular: string, plural = `${singular}s`): string {
  return `${formatNumber(count)} ${count === 1 ? singular : plural}`
}

const moneyFormatters = new Map<string, Intl.NumberFormat>()

/**
 * Money in a record's own currency (spec 24.4): ETB as "ETB 4,500,000" (no decimals for property),
 * other currencies with their usual symbol or code, e.g. "£1,250", "US$900", "AED 3,000".
 */
export function formatMoney(amount: number | null | undefined, currency: string, opts: { decimals?: number } = {}): string {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) return ''
  const decimals = opts.decimals ?? 0
  if (currency === 'ETB') return decimals === 0 ? formatETB(Math.round(amount)) : `ETB ${new Intl.NumberFormat('en-ET', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(amount)}`
  const key = `${currency}:${decimals}`
  let f = moneyFormatters.get(key)
  if (!f) {
    f = new Intl.NumberFormat('en-GB', { style: 'currency', currency, minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    moneyFormatters.set(key, f)
  }
  return f.format(amount)
}

/** An ETB amount converted with an admin-set rate (ETB per one unit of the other currency), rounded for display. */
export function convertFromEtb(etb: number, etbPerUnit: number): number | null {
  if (!Number.isFinite(etb) || !Number.isFinite(etbPerUnit) || etbPerUnit <= 0) return null
  const v = etb / etbPerUnit
  return v >= 1000 ? Math.round(v / 10) * 10 : Math.round(v)
}
