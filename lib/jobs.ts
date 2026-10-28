// Jobs & Recruitment (spec 24.9): labels, validation and formatting shared by forms and pages.
import { z } from 'zod'
import { HIDDEN_JOB_CATEGORIES, JOB_CATEGORIES, OFFERED_JOB_CATEGORIES } from '@/lib/content/verticals'
import { formatMoney } from '@/lib/format'
import { emailSchema, intFromForm, optionalPhoneSchema, optionalText, textSchema } from '@/lib/validation/common'

export { JOB_CATEGORIES, OFFERED_JOB_CATEGORIES }

export const JOBS_NOT_LIVE = 'Jobs on HagerLand open soon. Register your interest on the jobs page and we will tell you when they do.'

export const EMPLOYMENT_TYPES = [
  { value: 'full_time', label: 'Full time' },
  { value: 'part_time', label: 'Part time' },
  { value: 'contract', label: 'Contract' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'internship', label: 'Internship' },
  { value: 'apprenticeship', label: 'Apprenticeship' },
  { value: 'daily_labour', label: 'Daily labour' },
] as const
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number]['value']
const EMPLOYMENT_VALUES = EMPLOYMENT_TYPES.map((t) => t.value) as [EmploymentType, ...EmploymentType[]]

/** schema.org JobPosting employmentType values. */
export const SCHEMA_EMPLOYMENT: Record<EmploymentType, string> = {
  full_time: 'FULL_TIME',
  part_time: 'PART_TIME',
  contract: 'CONTRACTOR',
  temporary: 'TEMPORARY',
  internship: 'INTERN',
  apprenticeship: 'OTHER',
  daily_labour: 'PER_DIEM',
}

/** Trades (Jobs Phase 2), in the order AB approved. The values are the database check list in migration 0040. */
export const TRADES = [
  'Mason', 'Carpenter', 'Steel fixer', 'Electrician', 'Plumber', 'Painter', 'Tiler', 'Welder', 'Plasterer', 'Aluminium & glass fitter',
  'Gypsum ceiling installer', 'Scaffolder', 'Labourer', 'Foreman', 'Site engineer', 'Quantity surveyor', 'Architect', 'Surveyor', 'Driver',
  'Machine operator', 'Security guard', 'Cleaner', 'Store keeper', 'Office / admin', 'Sales', 'Other',
].map((label) => ({ value: label.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), label }))
export const TRADE_VALUES = TRADES.map((t) => t.value) as [string, ...string[]]

export function tradeLabel(value: string | null | undefined): string {
  return labelFor(TRADES, value)
}

export const SALARY_PERIODS = [
  { value: 'hour', label: 'per hour' },
  { value: 'day', label: 'per day' },
  { value: 'month', label: 'per month' },
  { value: 'year', label: 'per year' },
] as const
type SalaryPeriod = (typeof SALARY_PERIODS)[number]['value']

export const APPLICATION_STATUSES = [
  { value: 'submitted', label: 'New' },
  { value: 'viewed', label: 'Viewed' },
  { value: 'shortlisted', label: 'Shortlisted' },
  { value: 'rejected', label: 'Not progressing' },
  { value: 'hired', label: 'Hired' },
  { value: 'withdrawn', label: 'Withdrawn' },
] as const
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]['value']
/** Statuses an employer may set (withdrawn is the candidate's choice). */
export const EMPLOYER_APPLICATION_STATUSES = ['viewed', 'shortlisted', 'rejected', 'hired'] as const

export const AVAILABILITY = [
  { value: 'immediately', label: 'Available now' },
  { value: 'within_month', label: 'Available within a month' },
  { value: 'not_looking', label: 'Not looking at the moment' },
] as const

export function labelFor(list: readonly { value: string; label: string }[], value: string | null | undefined): string {
  return list.find((x) => x.value === value)?.label ?? ''
}

export function categoryLabel(value: string | null | undefined): string {
  return labelFor(JOB_CATEGORIES, value) || (value ?? '')
}

/**
 * "ETB 25,000 – 35,000 per month", "From USD 3,000 per month", or null when no salary was given. `t` translates the
 * words (Jobs Phase 5); without it the text is English, exactly as before.
 */
export function formatSalary(min: number | null, max: number | null, currency: string, period: string | null, t: (s: string) => string = (x) => x): string | null {
  if (min === null && max === null) return null
  const per = period ? ` ${t(labelFor(SALARY_PERIODS, period))}` : ''
  const money = (minor: number) => formatMoney(minor / 100, currency)
  if (min !== null && max !== null && max > min) return `${money(min)} – ${formatMoney(max / 100, currency).replace(/^[A-Z]{3}\s?/, '')}${per}`
  if (min !== null) return `${max === min ? money(min) : t('From {amount}').replace('{amount}', money(min))}${per}`
  return `${t('Up to {amount}').replace('{amount}', money(max as number))}${per}`
}

const blank = (v: unknown) => (v === '' || v === null ? undefined : v)
const majorToMinor = (v: number | undefined) => (v === undefined ? null : Math.round(v * 100))

export const jobSchema = z
  .object({
    id: z.preprocess(blank, z.uuid().optional()),
    title: textSchema(120, { min: 3, label: 'Job title' }),
    category: z.enum(OFFERED_JOB_CATEGORIES.map((c) => c.value) as [string, ...string[]], {
      error: (issue) => (HIDDEN_JOB_CATEGORIES.includes(String(issue.input)) ? 'This category is not available at the moment. Choose another category.' : 'Choose a category'),
    }),
    employment_type: z.enum(EMPLOYMENT_VALUES, { error: 'Choose the type of job' }),
    trade: z.preprocess(blank, z.enum(TRADE_VALUES).optional()),
    location_id: z.uuid({ error: 'Choose where the job is' }),
    salary_min: intFromForm({ min: 0, max: 1_000_000_000 }),
    salary_max: intFromForm({ min: 0, max: 1_000_000_000 }),
    salary_period: z.preprocess(blank, z.enum(['hour', 'day', 'month', 'year']).optional()),
    description: textSchema(8000, { min: 30, label: 'Description' }),
    requirements: optionalText(4000, 'Requirements'),
    closing_date: z.preprocess(blank, z.iso.date().optional()),
  })
  .refine((d) => d.salary_min === undefined || d.salary_max === undefined || d.salary_max >= d.salary_min, { message: 'The maximum must be at least the minimum', path: ['salary_max'] })
  .refine((d) => (d.salary_min === undefined && d.salary_max === undefined) || d.salary_period !== undefined, { message: 'Choose per hour, day, month or year', path: ['salary_period'] })
  .refine((d) => !d.closing_date || d.closing_date >= new Date().toISOString().slice(0, 10), { message: 'The closing date has passed', path: ['closing_date'] })
export type JobInput = z.infer<typeof jobSchema>

export function jobColumns(d: JobInput) {
  return {
    title: d.title,
    category: d.category,
    employment_type: d.employment_type,
    trade: d.trade ?? null,
    location_id: d.location_id,
    salary_min_minor: majorToMinor(d.salary_min),
    salary_max_minor: majorToMinor(d.salary_max),
    salary_period: (d.salary_period ?? null) as SalaryPeriod | null,
    description: d.description,
    requirements: d.requirements ?? null,
    closing_date: d.closing_date ?? null,
  }
}

/** A stored CV path must sit in the applicant's own folder. */
export function isOwnCvPath(path: string, userId: string): boolean {
  return path.startsWith(`docs/cv/${userId}/`) && !path.includes('..') && /\.(pdf|docx)$/.test(path)
}

export const applicationSchema = z.object({
  job_id: z.uuid(),
  name: textSchema(120, { min: 2, label: 'Name' }),
  email: emailSchema,
  phone: optionalPhoneSchema,
  cover_note: optionalText(3000, 'Cover note'),
  cv_path: z.preprocess(blank, z.string().max(300).optional()),
})

export const candidateSchema = z.object({
  full_name: textSchema(120, { min: 2, label: 'Name' }),
  headline: optionalText(160, 'Headline'),
  skills: z.preprocess((v) => (typeof v === 'string' ? Array.from(new Set(v.split(',').map((s) => s.trim()).filter(Boolean))) : v ?? []), z.array(z.string().max(60)).max(30, 'Up to 30 skills')),
  qualifications: optionalText(2000, 'Qualifications'),
  experience_years: intFromForm({ min: 0, max: 60 }),
  experience: optionalText(4000, 'Experience'),
  availability: z.enum(['immediately', 'within_month', 'not_looking']),
  location_id: z.preprocess(blank, z.uuid().optional()),
  cv_path: z.preprocess(blank, z.string().max(300).optional()),
  visibility: z.enum(['private', 'employers']),
  placement_wanted: z.preprocess((v) => v === 'on' || v === 'true', z.boolean()),
})
