import { z } from 'zod'
import { normalisePhone } from '@/lib/format'

const blankToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v)

export const nameSchema = z.string().trim().min(2, 'Enter your name').max(120, 'Use 120 characters or fewer')

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address')).pipe(z.string().max(254))

export const optionalEmailSchema = z.preprocess(blankToUndefined, emailSchema.optional())

export const phoneSchema = z
  .string()
  .trim()
  .min(1, 'Enter a phone number')
  .transform((v, ctx) => {
    const n = normalisePhone(v)
    if (!n) {
      ctx.addIssue({ code: 'custom', message: 'Enter a phone number starting with +251 or 09' })
      return z.NEVER
    }
    return n
  })

export const optionalPhoneSchema = z.preprocess(blankToUndefined, phoneSchema.optional())

export const passwordSchema = z.string().min(10, 'Use at least 10 characters').max(128, 'Use 128 characters or fewer')

export const uuidSchema = z.uuid()

export const optionalUuid = z.preprocess(blankToUndefined, z.uuid().optional())

export const preferredContactSchema = z.preprocess(blankToUndefined, z.enum(['phone', 'whatsapp', 'telegram', 'email']).optional())

/** Plain text with control characters removed and a maximum length. */
export function textSchema(max: number, opts: { min?: number; label?: string } = {}) {
  const label = opts.label ?? 'This field'
  return z
    .string()
    .transform((v) => v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/[ \t]+/g, ' ').trim())
    .pipe(
      z
        .string()
        .min(opts.min ?? 0, opts.min ? `${label} needs at least ${opts.min} characters` : undefined)
        .max(max, `${label} must be ${max} characters or fewer`),
    )
}

export function optionalText(max: number, label?: string) {
  return z.preprocess(blankToUndefined, textSchema(max, { label }).optional())
}

export const urlSchema = z
  .string()
  .trim()
  .url('Enter a full web address starting with https://')
  .refine((u) => /^https?:\/\//i.test(u), 'Only http and https links are allowed')
  .pipe(z.string().max(300))

export const optionalUrl = z.preprocess(blankToUndefined, urlSchema.optional())

export const youtubeUrl = z.preprocess(
  blankToUndefined,
  z
    .string()
    .trim()
    .regex(/^https:\/\/(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[A-Za-z0-9_-]{6,}/, 'Paste a YouTube link (youtube.com or youtu.be)')
    .optional(),
)

export const telegramSchema = z.preprocess(
  blankToUndefined,
  z
    .string()
    .trim()
    .transform((v) => v.replace(/^@/, '').replace(/^https?:\/\/t\.me\//i, ''))
    .pipe(z.string().regex(/^[A-Za-z0-9_]{5,32}$/, 'Enter a Telegram username, e.g. @hagerland'))
    .optional(),
)

export const intFromForm = (opts: { min?: number; max?: number } = {}) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(String(v).replace(/[,\s]/g, ''))),
    z
      .number({ error: 'Enter a number' })
      .int('Enter a whole number')
      .min(opts.min ?? 0)
      .max(opts.max ?? Number.MAX_SAFE_INTEGER)
      .optional(),
  )

export const decimalFromForm = (opts: { min?: number; max?: number } = {}) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(String(v).replace(/[,\s]/g, ''))),
    z.number({ error: 'Enter a number' }).min(opts.min ?? 0).max(opts.max ?? 1e9).optional(),
  )

export const checkbox = z.preprocess((v) => v === 'on' || v === 'true' || v === true, z.boolean())

/** Only same-site relative paths are allowed as post-login destinations. */
export function safeNextPath(value: unknown, fallback = '/account'): string {
  if (typeof value !== 'string') return fallback
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
  return value
}
