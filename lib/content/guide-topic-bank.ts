// Guide studio: a fixed bank of guide ideas for AB (no database). Clicking one fills the studio form.
import type { GuideTopic } from '@/lib/guides'
import { normaliseTitle } from '@/lib/guides/studio-import'
import type { StudioGuideType, StudioReader } from '@/lib/guides/studio-options'

export interface GuideIdea {
  title: string
  topic: GuideTopic
  reader: StudioReader
  guideType: StudioGuideType
}

export const GUIDE_TOPIC_BANK: GuideIdea[] = [
  // Buying
  { title: 'How to buy property in Ethiopia while living abroad', topic: 'buying', reader: 'diaspora', guideType: 'how-to' },
  { title: 'Condominium or private house: which should you buy in Addis Ababa?', topic: 'buying', reader: 'local', guideType: 'explainer' },
  { title: 'How to check a title deed and confirm who owns a property', topic: 'buying', reader: 'diaspora', guideType: 'how-to' },
  { title: 'Questions to ask before you pay a deposit on a property', topic: 'buying', reader: 'local', guideType: 'questions' },
  { title: 'Buying off-plan from a developer: what to check first', topic: 'buying', reader: 'diaspora', guideType: 'checklist' },
  { title: 'The real costs of buying a home, beyond the price', topic: 'buying', reader: 'local', guideType: 'cost' },
  // Diaspora
  { title: 'Power of attorney for Ethiopians abroad: when you need one and how it works', topic: 'diaspora', reader: 'diaspora', guideType: 'explainer' },
  { title: 'How to supervise a building project from abroad', topic: 'diaspora', reader: 'diaspora', guideType: 'how-to' },
  { title: 'Sending money for a property or build safely from abroad', topic: 'diaspora', reader: 'diaspora', guideType: 'explainer' },
  { title: 'Looking after an empty house in Ethiopia while you live abroad', topic: 'diaspora', reader: 'diaspora', guideType: 'checklist' },
  // Renting
  { title: 'Renting a house or apartment in Addis Ababa: a step-by-step guide', topic: 'renting', reader: 'tenant', guideType: 'how-to' },
  { title: 'What to check in a rental agreement before you sign', topic: 'renting', reader: 'tenant', guideType: 'checklist' },
  { title: 'Landlord responsibilities: repairs, deposits and fair notice', topic: 'renting', reader: 'landlord', guideType: 'explainer' },
  { title: 'Questions to ask a landlord before you rent', topic: 'renting', reader: 'tenant', guideType: 'questions' },
  { title: 'How to find and check a good tenant', topic: 'renting', reader: 'landlord', guideType: 'how-to' },
  // Selling
  { title: 'How to prepare your property for sale', topic: 'selling', reader: 'diaspora', guideType: 'checklist' },
  { title: 'Selling property in Ethiopia from abroad: what to arrange', topic: 'selling', reader: 'diaspora', guideType: 'how-to' },
  // Building and renovating
  { title: 'Building permits in Ethiopia: the stages from plan to completion', topic: 'building', reader: 'self-builder', guideType: 'explainer' },
  { title: 'How to choose a contractor for your house', topic: 'building', reader: 'self-builder', guideType: 'how-to' },
  { title: 'Construction contracts and payment stages: protecting your money', topic: 'building', reader: 'self-builder', guideType: 'explainer' },
  { title: 'How to estimate the cost of building a house in Ethiopia', topic: 'building', reader: 'self-builder', guideType: 'cost' },
  { title: 'Questions to ask a site engineer or supervisor', topic: 'building', reader: 'self-builder', guideType: 'questions' },
  { title: 'Roofing options for Ethiopian homes: corrugated iron, tiles and concrete slabs', topic: 'building', reader: 'self-builder', guideType: 'explainer' },
  { title: 'Plumbing a new house: what to plan before the walls go up', topic: 'building', reader: 'self-builder', guideType: 'checklist' },
  { title: 'House wiring basics: what a safe electrical installation looks like', topic: 'building', reader: 'self-builder', guideType: 'explainer' },
  { title: 'Solar power for homes in Ethiopia: sizing and costs', topic: 'building', reader: 'self-builder', guideType: 'cost' },
  { title: 'Renovating an older house: where the budget really goes', topic: 'building', reader: 'self-builder', guideType: 'cost' },
  // Materials and supplies
  { title: 'Buying cement: grades, storage and avoiding poor-quality bags', topic: 'supplies', reader: 'self-builder', guideType: 'explainer' },
  { title: 'Reinforcement steel (rebar): sizes, quality checks and quantities', topic: 'supplies', reader: 'self-builder', guideType: 'explainer' },
  { title: 'Hollow blocks and bricks: how to check quality before you buy', topic: 'supplies', reader: 'self-builder', guideType: 'checklist' },
  { title: 'How suppliers can win more quotes on HagerLand', topic: 'supplies', reader: 'supplier', guideType: 'how-to' },
  // Services and maintenance
  { title: 'A yearly maintenance schedule for your house', topic: 'services', reader: 'landlord', guideType: 'checklist' },
  { title: 'Property management in Ethiopia: what a manager should do for you', topic: 'services', reader: 'diaspora', guideType: 'explainer' },
  { title: 'Hiring site staff and day labourers: a practical guide', topic: 'services', reader: 'contractor', guideType: 'how-to' },
  { title: 'Finding construction work in Ethiopia: getting hired on site', topic: 'services', reader: 'contractor', guideType: 'how-to' },
  { title: 'Dealing with damp and leaks in Ethiopian homes', topic: 'services', reader: 'landlord', guideType: 'how-to' },
  // Process checklists
  { title: 'Checklist: before you start building', topic: 'checklists', reader: 'self-builder', guideType: 'checklist' },
  { title: 'Checklist: handing over a finished house', topic: 'checklists', reader: 'self-builder', guideType: 'checklist' },
  // Glossary
  { title: 'Property and land terms explained', topic: 'glossary', reader: 'diaspora', guideType: 'glossary' },
  { title: 'Construction terms explained', topic: 'glossary', reader: 'self-builder', guideType: 'glossary' },
]

function words(title: string): Set<string> {
  return new Set(normaliseTitle(title).split(' ').filter((w) => w.length > 2))
}

/** True when a guide with the same or a near-identical title exists (case-insensitive; 80 % word overlap). */
export function ideaExists(idea: string, titles: string[]): boolean {
  const key = normaliseTitle(idea)
  const a = words(idea)
  return titles.some((t) => {
    if (normaliseTitle(t) === key) return true
    const b = words(t)
    const shared = Array.from(a).filter((w) => b.has(w)).length
    return shared / Math.max(a.size, b.size, 1) >= 0.8
  })
}
