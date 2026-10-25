// Jobs Phase 3: the staffing form's "Are you based outside Ethiopia?" question (AB's approved wording, W rows 1–3).
// Not a stored category question: the old mixed abroad question stays hidden and untouched. The answer is saved in the
// request's answers (employer_abroad, employer_country) and copied onto the recruitment desk assignment. Pure.
import { COUNTRIES, OTHER_COUNTRY, countryByCode } from '@/lib/countries'
import type { Answers } from '@/lib/service-requests/questions'

export const EMPLOYER_ABROAD_TEXT = {
  question: 'Are you based outside Ethiopia?',
  hint: 'This helps us arrange calls at a time that suits you.',
  countryQuestion: 'Which country are you in?',
  confirmation: 'You told us you are based outside Ethiopia. We will agree a good time to call you.',
} as const

/** The existing country list without Ethiopia, plus "Another country". */
export const ABROAD_COUNTRIES = [...COUNTRIES.filter((c) => c.code !== 'ET'), OTHER_COUNTRY]

export interface EmployerAbroad {
  abroad: boolean
  country: string | null
}

/**
 * Reads the two fields. The question is optional (not answering stores nothing); "Yes" needs a country. The existing
 * site messages are reused for errors (no new wording).
 */
export function parseEmployerAbroad(form: Record<string, unknown>): { value: EmployerAbroad | null; errors: Record<string, string> } {
  const raw = typeof form.employer_abroad === 'string' ? form.employer_abroad : ''
  if (raw === '') return { value: null, errors: {} }
  if (raw !== 'yes' && raw !== 'no') return { value: null, errors: { employer_abroad: 'Please choose yes or no' } }
  if (raw === 'no') return { value: { abroad: false, country: null }, errors: {} }
  const country = typeof form.employer_country === 'string' ? form.employer_country : ''
  if (!ABROAD_COUNTRIES.some((c) => c.code === country)) return { value: null, errors: { employer_country: 'Choose one of the options' } }
  return { value: { abroad: true, country }, errors: {} }
}

export function employerAbroadAnswers(v: EmployerAbroad): Answers {
  return v.abroad && v.country ? { employer_abroad: true, employer_country: v.country } : { employer_abroad: false }
}

export function readEmployerAbroad(answers: unknown): EmployerAbroad | null {
  const a = (answers ?? {}) as Record<string, unknown>
  if (typeof a.employer_abroad !== 'boolean') return null
  return { abroad: a.employer_abroad, country: a.employer_abroad && typeof a.employer_country === 'string' ? a.employer_country : null }
}

/** "Question: answer" lines for the request page, admin and emails. */
export function employerAbroadLines(answers: unknown): [string, string][] {
  const v = readEmployerAbroad(answers)
  if (!v) return []
  const lines: [string, string][] = [[EMPLOYER_ABROAD_TEXT.question, v.abroad ? 'Yes' : 'No']]
  if (v.abroad && v.country) lines.push([EMPLOYER_ABROAD_TEXT.countryQuestion, countryByCode(v.country)?.name ?? v.country])
  return lines
}
