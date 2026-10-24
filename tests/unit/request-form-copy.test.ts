import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { askedQuestions, detailsWithPay, requestFormCopy } from '@/lib/service-requests/form-copy'
import type { Question } from '@/lib/service-requests/questions'

vi.mock('server-only', () => ({}))

const STAFFING_QUESTIONS: Question[] = [
  { id: 'roles', label: 'Which roles do you need to fill?', type: 'textarea', required: true },
  { id: 'headcount', label: 'How many people?', type: 'number', required: true },
  { id: 'international', label: 'Are you hiring from abroad or placing people abroad?', type: 'yesno' },
]

describe('request form wording (Jobs Phase 1)', () => {
  it('every other service keeps exactly today’s text', () => {
    for (const slug of ['plumbers', 'roof-repair', 'electricians', 'architects', 'staffing-other', '']) {
      const c = requestFormCopy(slug)
      expect(c.heading('Plumbers')).toBe('Request plumbers')
      expect(c.metaDescription('Plumbers')).toBe('Describe what you need and get quotes from up to three plumbers on HagerLand. Free for customers; you choose who to hire.')
      expect(c.titleHint('Plumbers')).toBe('For example: “Plumbers for a G+1 house in Bole”.')
      expect(c.detailsLabel).toBe('Describe what you need')
      expect(c.detailsHint).toBe('Size, materials, access, anything a provider should know before quoting.')
      expect(c.budget).toBe(true)
      expect(c.pay).toBeNull()
      expect(c.locationLabel).toBe('Where is the work?')
      expect(c.locationHint).toBe('Start typing a city, sub-city or area. We also cover cities abroad.')
      expect(c.footer).toBe('We share your request with up to three suitable providers. Your phone and email go only to providers who accept it.')
      expect(c.steps).toEqual([
        { title: 'Tell us what you need', text: 'A few questions about the job, where it is and how soon.' },
        { title: 'We match up to three providers', text: 'Chosen by service, location and verification. They contact you directly.' },
        { title: 'Compare quotes and choose', text: 'Quotes appear on your request page. Agree everything in writing before you pay.' },
      ])
      expect(askedQuestions(slug, STAFFING_QUESTIONS)).toEqual(STAFFING_QUESTIONS)
    }
  })
  it('the staffing requirement uses the approved wording verbatim', () => {
    const c = requestFormCopy('staffing')
    expect(c.heading('Staffing requirement')).toBe('Submit a staffing requirement')
    expect(c.metaDescription('Staffing requirement')).toBe('Tell HagerLand which roles you need to fill. We find, check and introduce suitable candidates. Fees are agreed with you in writing before we start.')
    expect(c.titleHint('Staffing requirement')).toBe('For example: "10 masons and a foreman for a G+2 site in Bole".')
    expect(c.detailsLabel).toBe('Describe the roles and the work')
    expect(c.detailsHint).toBe('Skills and experience needed, working hours, where the site is, and anything else candidates should know.')
    expect(c.budget).toBe(false)
    expect(c.pay).toEqual({ label: 'Pay offered (optional)', hint: 'For example: ETB 800 per day, or ETB 30,000 per month.' })
    expect(c.locationLabel).toBe('Where is the job?')
    expect(c.locationHint).toBe('Start typing a city, sub-city or area.')
    expect(c.footer).toBe("Your request goes to HagerLand's recruitment team. We share your phone or email with candidates only with your agreement.")
    expect(c.steps).toEqual([
      { title: 'Tell us the roles', text: 'Who you need, how many and when.' },
      { title: 'We agree terms', text: 'HagerLand confirms the fee with you in writing before we start.' },
      { title: 'We introduce candidates', text: 'Only people who have agreed to be introduced.' },
    ])
  })
  it('the staffing form does not ask the abroad question; the other questions stay', () => {
    expect(askedQuestions('staffing', STAFFING_QUESTIONS).map((q) => q.id)).toEqual(['roles', 'headcount'])
  })
  it('pay offered becomes the last line of the details only when filled in', () => {
    expect(detailsWithPay('Ten masons for a G+2 site.', 'ETB 800 per day')).toBe('Ten masons for a G+2 site.\n\nPay offered: ETB 800 per day')
    expect(detailsWithPay('Ten masons for a G+2 site.', undefined)).toBe('Ten masons for a G+2 site.')
  })
  it('the server ignores budget bands and hidden questions for staffing and emails HagerLand the pay', () => {
    const src = readFileSync('app/actions/service-request-actions.ts', 'utf8')
    expect(src).toContain('validateAnswers(questions, raw)')
    expect(src).toContain('budget_band: copy.budget ? d.budget_band ?? null : null')
    expect(src).toContain("['Pay offered', pay]")
  })
})

describe('what happens next, staffing only (Jobs Phase 1b)', () => {
  const NEXT = "HagerLand's recruitment team will contact you to talk about the roles and agree the fee in writing before we start."
  it('staffing gets the approved sentence and tab title; every other service keeps today’s', () => {
    expect(requestFormCopy('staffing').nextStep).toBe(NEXT)
    expect(requestFormCopy('staffing').tabTitle('Staffing requirement')).toBe('Submit a staffing requirement')
    for (const slug of ['plumbers', 'roof-repair', 'electricians', '']) {
      expect(requestFormCopy(slug).nextStep).toBeNull()
      expect(requestFormCopy(slug).tabTitle('Plumbers')).toBe('Request plumbers')
    }
  })
  it('the confirmation email swaps only the provider sentences', async () => {
    const { serviceRequestReceivedEmail } = await import('@/lib/email/templates')
    const base = { name: 'Tigist', reference: 'HLS-2026-000123', title: 'Ten masons', link: 'https://www.hagerland.com/requests/x', emergency: false, linkDays: 30 }
    const plain = serviceRequestReceivedEmail(base)
    const staffing = serviceRequestReceivedEmail({ ...base, nextStep: NEXT })
    expect(plain.html).toContain('We will match it with up to three suitable providers. Each one contacts you directly, and their quotes appear on your request page.')
    expect(staffing.html).not.toContain('up to three')
    expect(staffing.html).toContain('recruitment team will contact you to talk about the roles and agree the fee in writing before we start.')
    expect(staffing.subject).toBe(plain.subject)
    expect(staffing.html.replace(/<p[^>]*>[^<]*recruitment team[^<]*<\/p>/, '')).toBe(plain.html.replace(/<p[^>]*>[^<]*up to three[^<]*<\/p>/, ''))
    expect(serviceRequestReceivedEmail({ ...base, nextStep: null }).html).toBe(plain.html)
  })
})
