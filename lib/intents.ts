import type { IntentOption } from '@/components/enquiry/EnquiryForm'

export function propertyIntents(purpose: string | null, title: string): IntentOption[] {
  const list: IntentOption[] = [
    { value: 'viewing', label: 'Book a viewing', message: `Hello, I'd like to arrange a viewing of "${title}". When would suit you?` },
    { value: 'more_info', label: 'Ask a question', message: `Hello, I'm interested in "${title}". Is it still available?` },
  ]
  if (purpose === 'sale') list.push({ value: 'offer', label: 'Make an offer', message: `Hello, I'd like to discuss an offer for "${title}".` })
  return list
}

export const COMPANY_INTENTS: IntentOption[] = [
  { value: 'quote', label: 'Request a quote', message: "Hello, I'd like a quote for a project. Here are the details:" },
  { value: 'more_info', label: 'Ask a question', message: 'Hello, I found you on HagerLand and have a question:' },
]

export function developmentIntents(name: string): IntentOption[] {
  return [
    { value: 'register_interest', label: 'Register interest', message: `Hello, I'm interested in ${name}. Please send me plans, prices and the payment plan.` },
    { value: 'viewing', label: 'Book a site visit', message: `Hello, I'd like to visit ${name}. When can I come?` },
    { value: 'more_info', label: 'Ask a question', message: `Hello, I have a question about ${name}:` },
  ]
}

export function productIntents(name: string): IntentOption[] {
  return [
    { value: 'price', label: "Ask for today's price", message: `Hello, what is today's price and availability for ${name}?` },
    { value: 'more_info', label: 'Ask a question', message: `Hello, I have a question about ${name}:` },
  ]
}
