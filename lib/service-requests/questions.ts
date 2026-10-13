import { z } from 'zod'

/**
 * Category-specific questions for service requests (spec 24.5). Each service category stores an array
 * of questions (question_schema), edited in admin. This module validates both the schema and answers.
 */

export const QUESTION_TYPES = ['text', 'textarea', 'select', 'multi', 'number', 'yesno', 'date'] as const
export type QuestionType = (typeof QUESTION_TYPES)[number]

export interface Question {
  id: string
  label: string
  type: QuestionType
  required?: boolean
  options?: string[]
  hint?: string
}

export type Answers = Record<string, string | string[] | number | boolean>

const questionSchema = z
  .object({
    id: z.string().trim().regex(/^[a-z][a-z0-9_]{0,39}$/, 'Question ids use lower-case letters, numbers and _ (e.g. roof_type).'),
    label: z.string().trim().min(2).max(200),
    type: z.enum(QUESTION_TYPES),
    required: z.boolean().optional(),
    options: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
    hint: z.string().trim().max(300).optional(),
  })
  .strict()
  .refine((q) => !['select', 'multi'].includes(q.type) || (q.options?.length ?? 0) >= 2, { message: 'Choice questions need at least two options.' })

export const questionListSchema = z
  .array(questionSchema)
  .max(15, 'Use 15 questions or fewer.')
  .refine((list) => new Set(list.map((q) => q.id)).size === list.length, { message: 'Each question needs its own id.' })

/** Reads a stored schema safely: anything malformed is ignored rather than breaking the form. */
export function parseQuestions(raw: unknown): Question[] {
  const parsed = questionListSchema.safeParse(raw)
  return parsed.success ? parsed.data : []
}

/** Validates admin-entered JSON for the question editor. */
export function validateQuestionJson(json: string): { ok: true; questions: Question[] } | { ok: false; error: string } {
  let value: unknown
  try {
    value = JSON.parse(json)
  } catch {
    return { ok: false, error: 'That is not valid JSON. Check commas, quotes and brackets.' }
  }
  const parsed = questionListSchema.safeParse(value)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const where = issue?.path.length ? ` (question ${Number(issue.path[0]) + 1}${issue.path[1] ? `, ${String(issue.path[1])}` : ''})` : ''
    return { ok: false, error: `${issue?.message ?? 'Invalid questions'}${where}` }
  }
  return { ok: true, questions: parsed.data }
}

const clean = (v: string) => v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim()

/**
 * Validates answers from a submitted form (keys "q_<id>"). Unknown keys are dropped; choice answers must be
 * listed options; text is cleaned and length-capped. Returns field errors keyed "q_<id>".
 */
export function validateAnswers(questions: Question[], form: Record<string, unknown>): { answers: Answers; errors: Record<string, string> } {
  const answers: Answers = {}
  const errors: Record<string, string> = {}
  for (const q of questions) {
    const key = `q_${q.id}`
    const raw = form[key]
    const values = (Array.isArray(raw) ? raw : raw === undefined || raw === null ? [] : [raw]).map((x) => clean(String(x))).filter(Boolean)
    if (values.length === 0) {
      if (q.required && q.type !== 'yesno') errors[key] = 'Please answer this question'
      if (q.type === 'yesno' && q.required) errors[key] = 'Please choose yes or no'
      continue
    }
    switch (q.type) {
      case 'text':
        answers[q.id] = values[0].slice(0, 300)
        break
      case 'textarea':
        answers[q.id] = values[0].slice(0, 2000)
        break
      case 'number': {
        const n = Number(values[0].replace(/[,\s]/g, ''))
        if (!Number.isFinite(n) || n < 0 || n > 1e12) errors[key] = 'Enter a number'
        else answers[q.id] = n
        break
      }
      case 'date':
        if (!/^\d{4}-\d{2}-\d{2}$/.test(values[0])) errors[key] = 'Choose a date'
        else answers[q.id] = values[0]
        break
      case 'yesno':
        if (values[0] !== 'yes' && values[0] !== 'no') errors[key] = 'Please choose yes or no'
        else answers[q.id] = values[0] === 'yes'
        break
      case 'select':
        if (!q.options?.includes(values[0])) errors[key] = 'Choose one of the options'
        else answers[q.id] = values[0]
        break
      case 'multi': {
        const picked = Array.from(new Set(values)).filter((v) => q.options?.includes(v))
        if (picked.length !== Array.from(new Set(values)).length) errors[key] = 'Choose from the options'
        else answers[q.id] = picked
        break
      }
    }
  }
  return { answers, errors }
}

/** "Question: answer" lines for emails, admin and provider views (only answered questions). */
export function answerLines(questions: Question[], answers: Answers): [string, string][] {
  const byId = new Map(questions.map((q) => [q.id, q]))
  return Object.entries(answers)
    .filter(([id]) => byId.has(id))
    .map(([id, v]) => [byId.get(id)?.label ?? id, Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v)])
}
