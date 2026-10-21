// Guides content hub (spec 25.2g): topics, the admin form schema and a small, safe body format.
import { z } from 'zod'
import { optionalText, textSchema } from '@/lib/validation/common'

export const GUIDE_TOPICS = [
  { value: 'property', label: 'Buying, selling and renting' },
  { value: 'building', label: 'Building and renovating' },
  { value: 'supplies', label: 'Materials and supplies' },
  { value: 'diaspora', label: 'Ethiopians abroad' },
  { value: 'services', label: 'Services and maintenance' },
  { value: 'buying', label: 'Buying' },
  { value: 'renting', label: 'Renting' },
  { value: 'selling', label: 'Selling' },
  { value: 'checklists', label: 'Process checklists' },
  { value: 'glossary', label: 'Glossary' },
] as const
export type GuideTopic = (typeof GUIDE_TOPICS)[number]['value']

export interface FaqItem {
  question: string
  answer: string
}

export type GuideBlock = { type: 'h2'; text: string } | { type: 'p'; text: string } | { type: 'ul'; items: string[] }

/**
 * Guide bodies are plain text: "## " starts a heading, "- " starts a bullet, blank lines separate paragraphs.
 * Rendered as React text, so nothing in a guide can inject HTML.
 */
export function parseGuideBody(body: string): GuideBlock[] {
  const blocks: GuideBlock[] = []
  for (const chunk of body.replace(/\r\n/g, '\n').split(/\n{2,}/)) {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean)
    let para: string[] = []
    let list: string[] = []
    const flush = () => {
      if (para.length) blocks.push({ type: 'p', text: para.join(' ') })
      if (list.length) blocks.push({ type: 'ul', items: list })
      para = []
      list = []
    }
    for (const line of lines) {
      if (line.startsWith('## ')) {
        flush()
        blocks.push({ type: 'h2', text: line.slice(3).trim() })
      } else if (line.startsWith('- ')) {
        if (para.length) {
          blocks.push({ type: 'p', text: para.join(' ') })
          para = []
        }
        list.push(line.slice(2).trim())
      } else {
        if (list.length) {
          blocks.push({ type: 'ul', items: list })
          list = []
        }
        para.push(line)
      }
    }
    flush()
  }
  return blocks
}

/** FAQ entries typed in admin as "Q: …" / "A: …" pairs separated by blank lines. */
export function parseFaqText(text: string): FaqItem[] {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((block) => {
      const q = /^Q:\s*([\s\S]*?)(?:\nA:|$)/m.exec(block)?.[1]?.trim() ?? ''
      const a = /\nA:\s*([\s\S]*)$/.exec(block)?.[1]?.trim() ?? ''
      return { question: q, answer: a }
    })
    .filter((f) => f.question && f.answer)
}

export function faqToText(items: FaqItem[]): string {
  return items.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')
}

export function asFaq(v: unknown): FaqItem[] {
  return Array.isArray(v) ? v.filter((f): f is FaqItem => Boolean(f) && typeof f === 'object' && typeof (f as FaqItem).question === 'string' && typeof (f as FaqItem).answer === 'string') : []
}

/** "[CHECK: …]" notes mark facts still to verify (Guide studio). A guide that contains one is never checked, published or shown. */
const CHECK_MARKER = /\[CHECK:\s*([^\]]*)\]/gi

export function findCheckMarkers(...texts: (string | null | undefined)[]): string[] {
  return texts.flatMap((t) => Array.from((t ?? '').matchAll(CHECK_MARKER)).map((m) => m[1].trim()))
}

/** Markers anywhere a visitor could read them: title, summary, text, FAQ and the SEO fields. */
export function guideCheckMarkers(g: { title?: string | null; summary?: string | null; body?: string | null; faq?: unknown; seo_title?: string | null; seo_description?: string | null }): string[] {
  return findCheckMarkers(g.title, g.summary, g.body, g.seo_title, g.seo_description, ...asFaq(g.faq).flatMap((f) => [f.question, f.answer]))
}

/** Public guard: a guide that still contains a CHECK note is never shown to visitors (its page answers 404). */
export function visibleGuide<T extends Parameters<typeof guideCheckMarkers>[0]>(g: T | null): T | null {
  return g && guideCheckMarkers(g).length === 0 ? g : null
}

export function checkNotesMessage(count: number): string {
  return `Remove or resolve the CHECK notes first (${count} remaining).`
}

export const guideSchema = z
  .object({
    id: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.uuid().optional()),
    title: textSchema(160, { min: 5, label: 'Title' }),
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lower-case letters, numbers and hyphens').max(80),
    topic: z.enum(GUIDE_TOPICS.map((t) => t.value) as [GuideTopic, ...GuideTopic[]]),
    summary: textSchema(400, { min: 10, label: 'Summary' }),
    body: z.string().max(60000).transform((v) => v.replace(/\r\n/g, '\n').trim()).pipe(z.string().min(50, 'Write at least a few sentences')),
    faq_text: z.string().max(20000).default(''),
    seo_title: optionalText(70, 'SEO title'),
    seo_description: optionalText(170, 'SEO description'),
    status: z.enum(['draft', 'published', 'archived']),
    reviewed: z.preprocess((v) => v === 'on' || v === 'true', z.boolean()),
  })
  // CHECK notes first, so their message is the one shown when both rules fail.
  .superRefine((d, ctx) => {
    if (!d.reviewed && d.status !== 'published') return
    const markers = findCheckMarkers(d.title, d.summary, d.body, d.faq_text, d.seo_title, d.seo_description)
    if (markers.length) ctx.addIssue({ code: 'custom', message: checkNotesMessage(markers.length), path: ['reviewed'] })
  })
  .refine((d) => d.status !== 'published' || d.reviewed, { message: 'Tick "Content checked" before publishing.', path: ['reviewed'] })
