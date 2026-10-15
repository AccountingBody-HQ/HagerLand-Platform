import { describe, expect, it } from 'vitest'
import { parseFaqText } from '@/lib/advice'
import { GUIDE_TOPICS } from '@/lib/guides'

describe('area guide FAQs (spec 26.10)', () => {
  it('question on the first line, answer below, pairs separated by blank lines', () => {
    expect(parseFaqText('Is Bole busy?\nYes, at rush hour.\n\nParking?\nMost buildings have some.\nAsk the owner.')).toEqual([
      { question: 'Is Bole busy?', answer: 'Yes, at rush hour.' },
      { question: 'Parking?', answer: 'Most buildings have some. Ask the owner.' },
    ])
  })
  it('ignores incomplete pairs and caps the number', () => {
    expect(parseFaqText('Only a question')).toEqual([])
    expect(parseFaqText(Array.from({ length: 20 }, (_, i) => `Q${i}\nA${i}`).join('\n\n'))).toHaveLength(12)
  })
  it('guide topics include checklists and the glossary', () => {
    expect(GUIDE_TOPICS.map((t) => t.value)).toEqual(expect.arrayContaining(['checklists', 'glossary', 'renting', 'buying', 'selling']))
  })
})
