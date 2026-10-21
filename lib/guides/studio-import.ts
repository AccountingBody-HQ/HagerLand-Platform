// Guide studio (admin): checks and cleans the JSON AB pastes back from Claude before it becomes a draft guide.
// Pure, so it is unit-tested; the import action adds the database look-ups (existing slugs and titles).
import { findCheckMarkers, GUIDE_LINK, GUIDE_TOPICS, guideLinkHref, type FaqItem, type GuideTopic } from '@/lib/guides'
import { slugify } from '@/lib/slug'
import { GUIDE_JSON_LIMITS } from './studio-prompt'

export interface ImportedGuide {
  title: string
  slug: string
  topic: GuideTopic
  summary: string
  body: string
  faq: FaqItem[]
  seo_title: string | null
  seo_description: string | null
}

export interface GuideJsonCheck {
  ok: boolean
  errors: { field: string; message: string }[]
  /** Changes the importer made on its own (links removed, formatting tidied), shown to AB before importing. */
  notes: string[]
  guide: ImportedGuide | null
  markers: string[]
  duplicateTitle: string | null
  slugChanged: boolean
}

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** Strips accidental ``` fences and any text before the first "{" or after the last "}". */
export function extractJsonText(raw: string): string {
  const text = raw.replace(/^﻿/, '').replace(/```(?:json)?/gi, '')
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  return start >= 0 && end > start ? text.slice(start, end + 1) : text.trim()
}

function lineHint(json: string, message: string): string {
  const pos = /position (\d+)/.exec(message)?.[1]
  const line = /line (\d+)/.exec(message)?.[1] ?? (pos ? String(json.slice(0, Number(pos)).split('\n').length) : null)
  return line ? ` (around line ${line})` : ''
}

export function parseGuideJson(raw: string): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  const json = extractJsonText(raw)
  if (!json) return { ok: false, error: 'Paste the JSON from Claude first.' }
  try {
    const value: unknown = JSON.parse(json)
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, error: 'The JSON must be one object in curly brackets { … }.' }
    return { ok: true, value: value as Record<string, unknown> }
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    return { ok: false, error: `This is not valid JSON${lineHint(json, message)}. Check for a missing comma or quote, or curly quotes (“ ”) instead of straight ones (").` }
  }
}

/** Next free address: the slug itself, else slug-2, slug-3, … (kept within 80 characters). */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken)
  if (!used.has(base)) return base
  for (let n = 2; ; n++) {
    const suffix = `-${n}`
    const candidate = `${base.slice(0, GUIDE_JSON_LIMITS.slug - suffix.length).replace(/-+$/, '')}${suffix}`
    if (!used.has(candidate)) return candidate
  }
}

export function normaliseTitle(title: string): string {
  return title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

/**
 * Cleans links. In guide text (`keepLinks`), "[words](/path)" to an approved HagerLand page stays a link; every other
 * link becomes its words, and bare web addresses are removed. Titles, summaries and FAQ show no links: words only.
 */
export function sanitiseLinks(text: string, notes: string[], keepLinks = false): string {
  const withMarkdown = text.replace(GUIDE_LINK, (whole, label: string, target: string) => {
    const href = guideLinkHref(target)
    if (href && keepLinks) return `[${label}](${href})`
    if (!href) notes.push(`Turned a link that is not on the approved list into plain words: ${target || whole}`)
    return label
  })
  return withMarkdown.replace(/https?:\/\/[^\s)\]]+/g, (href) => {
    notes.push(`Removed a web address that is not on the approved list: ${href}`)
    return ''
  })
}

/** Turns the content into the site's plain-text guide format, tidying common slips and noting each change. */
export function sanitiseContent(raw: string, notes: string[]): { body: string; tags: string[] } {
  const tags = Array.from(new Set(Array.from(raw.matchAll(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi)).map((m) => m[1].toLowerCase())))
  let tidied = false
  const lines = sanitiseLinks(raw.replace(/\r\n/g, '\n'), notes, true)
    .split('\n')
    .map((line) => {
      const next = line
        .replace(/^\s*#{1,6}\s+/, '## ')
        .replace(/^\s*[*•]\s+/, '- ')
        .replace(/^\s*\d+[.)]\s+/, '- ')
        .replace(/\*\*|__/g, '')
        .replace(/[ \t]+$/, '')
      if (next !== line.replace(/[ \t]+$/, '')) tidied = true
      return next
    })
  if (tidied) notes.push('Tidied the formatting to the guide format (single heading level, "- " bullets, no bold).')
  return { body: lines.join('\n').replace(/\n{3,}/g, '\n\n').trim(), tags }
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim() : ''
}

function topicFrom(v: unknown): GuideTopic | null {
  const s = str(v).toLowerCase()
  return GUIDE_TOPICS.find((t) => t.value === s || t.label.toLowerCase() === s)?.value ?? null
}

/** Validates the pasted JSON. `existingSlugs` and `existingTitles` come from the guides table. */
export function checkGuideJson(raw: string, existing: { slugs: string[]; titles: string[] }): GuideJsonCheck {
  const empty: GuideJsonCheck = { ok: false, errors: [], notes: [], guide: null, markers: [], duplicateTitle: null, slugChanged: false }
  const parsed = parseGuideJson(raw)
  if (!parsed.ok) return { ...empty, errors: [{ field: 'JSON', message: parsed.error }] }
  const v = parsed.value
  const errors: GuideJsonCheck['errors'] = []
  const notes: string[] = []
  const need = (field: string, value: string, min: number, max: number, label: string) => {
    if (!value) errors.push({ field, message: `${label} is missing.` })
    else if (value.length < min) errors.push({ field, message: `${label} is too short (at least ${min} characters).` })
    else if (value.length > max) errors.push({ field, message: `${label} is too long: ${value.length} characters, the limit is ${max}.` })
  }

  const title = sanitiseLinks(str(v.title), notes)
  need('title', title, 5, GUIDE_JSON_LIMITS.title, 'Title')

  const rawSlug = str(v.slug) || slugify(title)
  if (!SLUG_RE.test(rawSlug) || rawSlug.length > GUIDE_JSON_LIMITS.slug) errors.push({ field: 'slug', message: `"${rawSlug}" is not a valid web address: use lower-case letters, numbers and single hyphens, at most ${GUIDE_JSON_LIMITS.slug} characters.` })

  const topic = topicFrom(v.topic)
  if (!topic) errors.push({ field: 'topic', message: `Unknown topic "${str(v.topic)}". Use one of: ${GUIDE_TOPICS.map((t) => t.value).join(', ')}.` })

  const summary = sanitiseLinks(str(v.summary), notes)
  need('summary', summary, 10, GUIDE_JSON_LIMITS.summary, 'Summary')

  const { body, tags } = sanitiseContent(typeof v.content === 'string' ? v.content : '', notes)
  if (tags.length) errors.push({ field: 'content', message: `The text contains HTML (${tags.map((t) => `<${t}>`).join(', ')}). Guides use plain text: "## " for headings and "- " for bullets. Ask Claude to resend without HTML.` })
  need('content', body, 50, 60000, 'Content')

  const faq: FaqItem[] = []
  if (v.faq !== undefined && !Array.isArray(v.faq)) errors.push({ field: 'faq', message: 'FAQ must be a list of { "question", "answer" } pairs.' })
  for (const [i, item] of (Array.isArray(v.faq) ? v.faq : []).entries()) {
    const q = sanitiseLinks(str((item as Record<string, unknown> | null)?.question), notes)
    const a = sanitiseLinks(str((item as Record<string, unknown> | null)?.answer), notes)
    if (!q || !a) errors.push({ field: 'faq', message: `FAQ ${i + 1} needs both a question and an answer.` })
    else if (q.length > 300 || a.length > 1500) errors.push({ field: 'faq', message: `FAQ ${i + 1} is too long (question up to 300 characters, answer up to 1,500).` })
    else if (/<\/?[a-z][a-z0-9]*\b[^>]*>/i.test(q + a)) errors.push({ field: 'faq', message: `FAQ ${i + 1} contains HTML. Use plain text.` })
    else faq.push({ question: q, answer: a })
  }
  if (faq.length > 10) errors.push({ field: 'faq', message: `Too many FAQ entries (${faq.length}); keep 10 or fewer.` })

  const seoTitle = str(v.seo_title)
  if (seoTitle.length > GUIDE_JSON_LIMITS.seoTitle) errors.push({ field: 'seo_title', message: `SEO title is too long: ${seoTitle.length} characters, the limit is ${GUIDE_JSON_LIMITS.seoTitle}.` })
  const seoDescription = str(v.seo_description)
  if (seoDescription.length > GUIDE_JSON_LIMITS.seoDescription) errors.push({ field: 'seo_description', message: `SEO description is too long: ${seoDescription.length} characters, the limit is ${GUIDE_JSON_LIMITS.seoDescription}.` })

  const slug = uniqueSlug(rawSlug, existing.slugs)
  const titleKey = normaliseTitle(title)
  const duplicateTitle = existing.titles.find((t) => normaliseTitle(t) === titleKey) ?? null
  const markers = findCheckMarkers(title, summary, body, seoTitle, seoDescription, ...faq.flatMap((f) => [f.question, f.answer]))
  const guide: ImportedGuide | null = topic && !errors.length ? { title, slug, topic, summary, body, faq, seo_title: seoTitle || null, seo_description: seoDescription || null } : null
  return { ok: !errors.length, errors, notes: Array.from(new Set(notes)), guide, markers, duplicateTitle, slugChanged: !errors.length && slug !== rawSlug }
}
