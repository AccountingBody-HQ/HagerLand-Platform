// Guide studio (admin): builds the prompt AB pastes into his own Claude chat. Pure, so it is unit-tested and the
// site never calls an AI service. The JSON it asks for is what /roodber8/guides/import accepts.
import { GUIDE_TOPICS, type GuideTopic } from '@/lib/guides'
import { APPROVED_GUIDE_LINKS, STUDIO_GUIDE_TYPES, STUDIO_LENGTHS, STUDIO_READERS, type StudioGuideType, type StudioLength, type StudioMode, type StudioReader } from './studio-options'

export interface GuidePromptInput {
  mode: StudioMode
  text: string
  topic: GuideTopic
  reader: StudioReader
  guideType: StudioGuideType
  length: StudioLength
}

/** Field limits shared by the prompt and the importer. */
export const GUIDE_JSON_LIMITS = { title: 100, slug: 80, summary: 200, seoTitle: 60, seoDescription: 155, faqMin: 3, faqMax: 5 } as const

const STRUCTURE: Record<StudioGuideType, string> = {
  'how-to': `Step-by-step how-to. One "## Step N: <action>" heading per step, in the order the reader does them (usually 5 to 9 steps). Under each step cover, in short paragraphs or bullets: what to do; why it matters; the documents or information needed (as bullets, only where they genuinely apply); and the common mistake at that step.`,
  checklist: `Checklist. Group the items under 3 to 6 "## " headings (for example by stage: before, during, after). Each item is one bullet: the thing to check, a colon, then a one-line reason it matters. No checkbox characters such as "[ ]".`,
  explainer: `Explainer. Use these "## " sections in this order: what it is; why it matters to the reader; how it works in practice in Ethiopia (stages, who is involved, what documents change hands); pitfalls to avoid.`,
  cost: `Cost and budgeting guide. Use these "## " sections in this order: what the cost is made of (each component as a bullet with a short explanation); what pushes the cost up or down; how to get accurate, comparable quotes; how big a contingency buffer to keep and why. Any figure must follow the price rule in the accuracy rules.`,
  questions: `Questions to ask. Group the questions under 3 to 5 "## " headings. Each question is one bullet written as: the question, then " Why it matters: …", then " A good answer: …" (what a trustworthy, specific answer sounds like).`,
  glossary: `Glossary. Terms in strict alphabetical order, grouped under one "## " heading per starting letter (for example "## A"). Each term is one bullet: "<Term>: <plain definition in one or two sentences>. Example: <a short, concrete Ethiopian example>." Amharic terms keep the English explanation in the same bullet.`,
}

function labelOf<T extends { value: string; label: string }>(list: readonly T[], value: string): string {
  return list.find((x) => x.value === value)?.label ?? value
}

function briefLine(input: GuidePromptInput): string {
  const text = input.text.trim()
  if (input.mode === 'url')
    return `Reference URL (thematic inspiration only): ${text}\nYou may only use this address to understand the general theme. Do not open, copy, quote, summarise or closely paraphrase it. Write the guide from first principles.`
  if (input.mode === 'idea') return `Guide idea from the editor: ${text}`
  return `Guide topic: ${text}`
}

export function buildGuidePrompt(input: GuidePromptInput): string {
  const length = STUDIO_LENGTHS.find((l) => l.value === input.length) ?? STUDIO_LENGTHS[1]
  const reader = labelOf(STUDIO_READERS, input.reader)
  const guideType = labelOf(STUDIO_GUIDE_TYPES, input.guideType)
  const topicLabel = labelOf(GUIDE_TOPICS, input.topic)
  const abroad =
    input.reader === 'diaspora'
      ? `Include a "## Doing this from abroad" section (required for this reader): what can be done remotely, what needs a trusted person on the ground, how to stay in control of money and documents, and when a power of attorney may be needed (with a [CHECK: …] marker on any legal detail).`
      : `Include a "## Doing this from abroad" section only if the topic genuinely suits Ethiopians living abroad; otherwise leave it out.`
  const links = APPROVED_GUIDE_LINKS.map((l) => `- ${l.href} (${l.label})`).join('\n')
  const topics = GUIDE_TOPICS.map((t) => `"${t.value}" (${t.label})`).join(', ')
  const readTime = Math.round((length.min + length.max) / 2 / 220)

  return `You are a senior property and construction writer for HagerLand (www.hagerland.com), Ethiopia's construction and property platform. You have deep, practical, on-the-ground knowledge of buying, renting, building and maintaining property in Ethiopia, in Addis Ababa and in regional towns. You write guides people actually use to make decisions and avoid expensive mistakes.

# The brief
${briefLine(input)}
Topic area: ${topicLabel} (use "${input.topic}" as the topic value)
Main reader: ${reader}
Guide type: ${guideType}
Length of "content": ${length.min.toLocaleString('en-GB')} to ${length.max.toLocaleString('en-GB')} words (FAQ answers not counted)

# Audience and voice
- Write in plain, warm, practical international English for Ethiopians at home and abroad, and for anyone working with them. Many readers use English as a second language: prefer short, common words.
- Address the reader as "you". Be direct and specific; every paragraph must help the reader do or decide something.
- Paragraphs of at most 4 sentences. Sentences of about 25 words or fewer.
- Explain every technical, legal or local term the first time you use it. Amharic terms are allowed only with an English explanation in the same sentence.
- No hype, no filler, no clichés, no rhetorical questions as openers. Never write "In this article", "In this guide we will", "In conclusion", "delve", "navigate the complexities" or similar.

# Originality
Write from first principles and practical experience. Never copy, quote or closely paraphrase any website, article or document, including any reference URL in the brief. If the brief includes a URL, it is inspiration for the theme only.

# Accuracy rules (non-negotiable)
1. Never invent laws, proclamation numbers, regulation names, government office or agency names, fees, tax rates, prices, exchange rates, timeframes, processing times or statistics.
2. Where a specific fact would help but you are not certain it is correct and current, write the point in general terms AND put an inline marker straight after it in exactly this format: [CHECK: what needs verifying]. Example: "The transfer is registered with the city's land administration office [CHECK: name of the office that registers transfers in Addis Ababa]."
3. Prefer fewer facts that are correct over many that might be wrong.
4. Prices and costs are only ever given as ranges, with a date reference ("as of 2026") and a [CHECK: …] marker. Example: "Expect roughly X to Y birr per square metre as of 2026 [CHECK: current cost range per square metre]."
5. Never present legal, tax or financial points as definitive advice. Say clearly when the reader should consult a lawyer, a licensed professional (engineer, surveyor, accountant) or the relevant authority.
6. The marker format is exact: an opening square bracket, the word CHECK in capitals, a colon, a space, the note, a closing square bracket. No other brackets or variations.

# Structure
Opening (before the first heading, 1 to 2 short paragraphs): say who this guide is for and what they will be able to do after reading it. Include the primary search phrase naturally.

Body: ${STRUCTURE[input.guideType]}

Every guide also includes, after the body and in this order:
- "## Common mistakes": 2 to 4 specific, realistic mistakes as bullets, each with how to avoid it.
- ${abroad}
- "## Key points": exactly 4 bullets, each a single sentence.
- "## How HagerLand can help": one short paragraph. Mention only what HagerLand really offers (see the honesty rules) and point to 1 or 2 relevant pages from the approved list.

# Internal links
- Include 2 to 4 links in total, chosen ONLY from this approved list of HagerLand pages:
${links}
- Write each link in exactly this form: [anchor text](/path), with the path copied exactly from the list. Place links inside paragraphs or bullets, never in headings.
- Use natural, descriptive anchor text that tells the reader where the link goes (for example "send your materials list for quotes"). Never use "click here", "here" or a bare address as anchor text.
- No other links: no other HagerLand addresses, no external websites and no bare web addresses. Anything else is shown as plain words.

# Honesty about HagerLand
- HagerLand is a platform that connects people with property listings, building materials suppliers, professionals and services, construction jobs, and help for owners abroad. Describe it only in those terms.
- Do not claim services, partners, numbers of users or listings, ratings, guarantees, insurance or features that are not stated here.
- Finance and insurance on HagerLand are "coming soon" only. Never say or imply that HagerLand is a lender, a bank, an insurer, a law firm or a government body.

# SEO
- Choose one primary search phrase a real person would type (for example "how to check a title deed in Ethiopia"). Use it in the title, in the first paragraph and in at least two "## " headings.
- Use 3 to 5 closely related phrases naturally across the text. Never stuff keywords.
- "seo_title": at most ${GUIDE_JSON_LIMITS.seoTitle} characters, starts with or contains the primary phrase.
- "seo_description": at most ${GUIDE_JSON_LIMITS.seoDescription} characters, a plain sentence saying what the reader will learn.

# Formatting of "content"
HagerLand stores guide text in a simple plain-text format. Use only these:
- Paragraphs: separated by one blank line.
- Headings: a line that starts with "## " (one heading level only; never "#" or "###").
- Bullets: lines that start with "- ". Bullets of one list sit on consecutive lines, with a blank line before and after the list.
- Links: [anchor text](/path) to approved pages only, as described above.
Nothing else: no HTML tags, no bold or italics (no ** or __), no numbered-list syntax ("1."), no tables, no images, no emojis, no code. Inside the JSON string, write line breaks as \\n.

# FAQ
"faq": ${GUIDE_JSON_LIMITS.faqMin} to ${GUIDE_JSON_LIMITS.faqMax} questions real readers ask about this topic that the body does not already answer in full. Each answer is 1 to 3 sentences and follows the same accuracy and marker rules.

# Silent self-audit (do this before you answer; do not show it)
- "content" is between ${length.min} and ${length.max} words.
- Every uncertain fact, price, fee, timeframe, office name and legal point has a marker in the exact [CHECK: …] format.
- Every link is in the [anchor text](/path) form and from the approved list; 2 to 4 links in total.
- Nothing is invented; no claims about HagerLand beyond the honesty rules.
- The structure is complete: opening, body for the guide type, Common mistakes, Doing this from abroad (if required or suitable), Key points (exactly 4), How HagerLand can help.
- Only the allowed formatting is used. Field lengths are within the limits. The JSON is valid.

# Output
Reply with ONLY one valid JSON object: no code fences, no text before or after it. Use straight double quotes. Use exactly these keys:
{
  "title": "string, at most ${GUIDE_JSON_LIMITS.title} characters, contains the primary phrase",
  "slug": "string, lower-case words separated by hyphens, at most 60 characters, for example how-to-check-a-title-deed",
  "topic": "${input.topic}",
  "summary": "string, at most ${GUIDE_JSON_LIMITS.summary} characters, one or two plain sentences",
  "content": "string, the guide in the plain-text format above",
  "faq": [{ "question": "string", "answer": "string" }],
  "seo_title": "string, at most ${GUIDE_JSON_LIMITS.seoTitle} characters",
  "seo_description": "string, at most ${GUIDE_JSON_LIMITS.seoDescription} characters",
  "reader": "${input.reader}",
  "guide_type": "${input.guideType}",
  "read_time_minutes": ${readTime},
  "check_markers_count": 0
}
"topic" must be exactly one of: ${topics}. Set "read_time_minutes" to the word count of "content" divided by 220, rounded. Set "check_markers_count" to the number of [CHECK: …] markers in all fields.`
}
