// Supply partners (admin): phone numbers for matching duplicates and searching. Extends lib/format normalisePhone,
// which public forms use for mobiles only, with Ethiopian landlines (011…, 022…, …) that many shops still use.
import { normalisePhone } from '@/lib/format'

/**
 * E.164 for an Ethiopian mobile (+2519…, +2517…) or landline (+25111…, area codes 11–58), however it was typed:
 * 09…, 9…, 011…, 2519…, +2519…, 002519…, with spaces, dashes or brackets. Other international numbers must start
 * with + or 00. Returns null when the number is not valid.
 */
export function normaliseSupplyPhone(input: string): string | null {
  const raw = input.trim().replace(/[\s().-]/g, '')
  if (!raw) return null
  const international = raw.startsWith('+') || raw.startsWith('00')
  const digits = raw.startsWith('+') ? raw.slice(1) : raw.startsWith('00') ? raw.slice(2) : raw
  if (!/^\d+$/.test(digits)) return null
  const national = digits.startsWith('251') ? digits.slice(3) : !international && /^0\d{9}$/.test(digits) ? digits.slice(1) : !international && /^[79]\d{8}$/.test(digits) ? digits : null
  if (national !== null) return /^([79]\d{8}|[1-5]\d{8})$/.test(national) ? `+251${national}` : null
  return international ? normalisePhone(raw) : null
}
