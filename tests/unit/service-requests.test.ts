import { describe, expect, it } from 'vitest'
import { answerLines, parseQuestions, validateAnswers, validateQuestionJson, type Question } from '@/lib/service-requests/questions'
import { isQuoteExpired } from '@/lib/service-requests/labels'

const Q: Question[] = [
  { id: 'roof_type', label: 'Roof type', type: 'select', options: ['Corrugated sheet', 'Tiles'], required: true },
  { id: 'rooms', label: 'How many rooms?', type: 'number' },
  { id: 'leaking', label: 'Is water coming in?', type: 'yesno', required: true },
  { id: 'extras', label: 'Also needed', type: 'multi', options: ['Gutters', 'Insulation'] },
  { id: 'notes', label: 'Notes', type: 'textarea' },
]

describe('question schemas', () => {
  it('accepts a valid schema and reads it back', () => {
    const r = validateQuestionJson(JSON.stringify(Q))
    expect(r.ok).toBe(true)
    expect(parseQuestions(Q)).toHaveLength(5)
  })
  it('explains what is wrong with a bad schema', () => {
    expect(validateQuestionJson('[{')).toEqual({ ok: false, error: expect.stringContaining('not valid JSON') })
    const dup = validateQuestionJson(JSON.stringify([Q[1], Q[1]]))
    expect(dup.ok).toBe(false)
    const noOptions = validateQuestionJson(JSON.stringify([{ id: 'a', label: 'Pick', type: 'select', options: ['one'] }]))
    expect(noOptions).toEqual({ ok: false, error: expect.stringContaining('at least two options') })
    const badId = validateQuestionJson(JSON.stringify([{ id: 'Bad Id', label: 'X', type: 'text' }]))
    expect(badId).toEqual({ ok: false, error: expect.stringContaining('question 1') })
  })
  it('ignores a malformed stored schema instead of breaking the form', () => {
    expect(parseQuestions({ not: 'a list' })).toEqual([])
    expect(parseQuestions([{ id: 'x' }])).toEqual([])
  })
})

describe('answers', () => {
  it('validates and converts each type', () => {
    const r = validateAnswers(Q, { q_roof_type: 'Tiles', q_rooms: '3', q_leaking: 'yes', q_extras: ['Gutters'], q_notes: '  ok\u0007 ', q_unknown: 'dropped' })
    expect(r.errors).toEqual({})
    expect(r.answers).toEqual({ roof_type: 'Tiles', rooms: 3, leaking: true, extras: ['Gutters'], notes: 'ok' })
  })
  it('requires required questions and refuses values that are not options', () => {
    const r = validateAnswers(Q, { q_roof_type: 'Thatch', q_extras: ['Gutters', 'Swimming pool'], q_rooms: 'many' })
    expect(r.errors).toEqual({ q_roof_type: 'Choose one of the options', q_leaking: 'Please choose yes or no', q_extras: 'Choose from the options', q_rooms: 'Enter a number' })
  })
  it('turns answers into readable lines', () => {
    expect(answerLines(Q, { roof_type: 'Tiles', leaking: false, extras: ['Gutters', 'Insulation'] })).toEqual([
      ['Roof type', 'Tiles'],
      ['Is water coming in?', 'No'],
      ['Also needed', 'Gutters, Insulation'],
    ])
  })
})

describe('quote expiry', () => {
  it('expires the day after the valid-until date', () => {
    expect(isQuoteExpired('2026-10-12', '2026-10-13')).toBe(true)
    expect(isQuoteExpired('2026-10-13', '2026-10-13')).toBe(false)
    expect(isQuoteExpired(null, '2026-10-13')).toBe(false)
  })
})
