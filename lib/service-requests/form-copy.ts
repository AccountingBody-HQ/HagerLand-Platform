import type { Question } from '@/lib/service-requests/questions'

/**
 * Wording of the "Request a service" form. Every service uses the default text; the staffing requirement
 * (HagerLand's own recruitment service, Jobs Phase 1) has hiring words, no budget bands and a "Pay offered" field.
 */

export interface RequestStep {
  title: string
  text: string
}

export interface RequestFormCopy {
  heading: (categoryName: string) => string
  metaDescription: (categoryName: string) => string
  titleHint: (categoryName: string) => string
  detailsLabel: string
  detailsHint: string
  /** false: the budget bands are not shown and any submitted band is ignored. */
  budget: boolean
  /** Shown instead of the budget; the value is added to the details as a last line. */
  pay: { label: string; hint: string } | null
  locationLabel: string
  locationHint: string
  /** First sentence of the line under the submit button (the Terms and Privacy links follow it). */
  footer: string
  steps: RequestStep[]
  /** Stored questions this form does not ask; answers to them are dropped on the server. */
  hiddenQuestions: string[]
}

export const DEFAULT_REQUEST_STEPS: RequestStep[] = [
  { title: 'Tell us what you need', text: 'A few questions about the job, where it is and how soon.' },
  { title: 'We match up to three providers', text: 'Chosen by service, location and verification. They contact you directly.' },
  { title: 'Compare quotes and choose', text: 'Quotes appear on your request page. Agree everything in writing before you pay.' },
]

const DEFAULT_COPY: RequestFormCopy = {
  heading: (name) => `Request ${name.toLowerCase()}`,
  metaDescription: (name) => `Describe what you need and get quotes from up to three ${name.toLowerCase()} on HagerLand. Free for customers; you choose who to hire.`,
  titleHint: (name) => `For example: “${name} for a G+1 house in Bole”.`,
  detailsLabel: 'Describe what you need',
  detailsHint: 'Size, materials, access, anything a provider should know before quoting.',
  budget: true,
  pay: null,
  locationLabel: 'Where is the work?',
  locationHint: 'Start typing a city, sub-city or area. We also cover cities abroad.',
  footer: 'We share your request with up to three suitable providers. Your phone and email go only to providers who accept it.',
  steps: DEFAULT_REQUEST_STEPS,
  hiddenQuestions: [],
}

const STAFFING_COPY: RequestFormCopy = {
  heading: () => 'Submit a staffing requirement',
  metaDescription: () => 'Tell HagerLand which roles you need to fill. We find, check and introduce suitable candidates. Fees are agreed with you in writing before we start.',
  titleHint: () => 'For example: "10 masons and a foreman for a G+2 site in Bole".',
  detailsLabel: 'Describe the roles and the work',
  detailsHint: 'Skills and experience needed, working hours, where the site is, and anything else candidates should know.',
  budget: false,
  pay: { label: 'Pay offered (optional)', hint: 'For example: ETB 800 per day, or ETB 30,000 per month.' },
  locationLabel: 'Where is the job?',
  locationHint: 'Start typing a city, sub-city or area.',
  footer: "Your request goes to HagerLand's recruitment team. We share your phone or email with candidates only with your agreement.",
  steps: [
    { title: 'Tell us the roles', text: 'Who you need, how many and when.' },
    { title: 'We agree terms', text: 'HagerLand confirms the fee with you in writing before we start.' },
    { title: 'We introduce candidates', text: 'Only people who have agreed to be introduced.' },
  ],
  // Overseas placement is hidden until a lawyer confirms the rules (Jobs decision 3).
  hiddenQuestions: ['international'],
}

export function requestFormCopy(categorySlug: string): RequestFormCopy {
  return categorySlug === 'staffing' ? STAFFING_COPY : DEFAULT_COPY
}

/** The questions a service's form asks (stored questions minus the hidden ones). */
export function askedQuestions(categorySlug: string, questions: Question[]): Question[] {
  const hidden = requestFormCopy(categorySlug).hiddenQuestions
  return questions.filter((q) => !hidden.includes(q.id))
}

export const PAY_OFFERED_MAX = 120

/** The details as stored: "Pay offered: …" is added as a final line only when it was filled in. */
export function detailsWithPay(details: string, pay: string | undefined): string {
  return pay ? `${details}\n\nPay offered: ${pay}` : details
}
