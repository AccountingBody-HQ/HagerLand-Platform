import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { log } from '@/lib/log'

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5'
let client: Anthropic | null = null

/**
 * Drafts a short, factual profile description for an imported business. Uses only the facts given
 * (no invented claims, prices or awards). Returns null when AI is not configured or fails; the admin
 * reviews every draft before the profile goes live.
 */
export async function draftDescription(p: { name: string; kindLabel: string; services: string[]; address: string; types: string[]; website: string | null }): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  if (!client) client = new Anthropic({ apiKey })
  const facts = [
    `Business name: ${p.name}`,
    `Type: ${p.kindLabel}`,
    p.services.length ? `Services (chosen by HagerLand staff): ${p.services.join(', ')}` : '',
    p.address ? `Address: ${p.address}` : '',
    p.types.length ? `Google categories: ${p.types.slice(0, 6).join(', ')}` : '',
    p.website ? `Website: ${p.website}` : '',
  ]
    .filter(Boolean)
    .join('\n')
  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      system:
        'You write short business profile descriptions for HagerLand, an Ethiopian construction and property directory. Write 2 or 3 plain, neutral sentences in British English using ONLY the facts provided. Do not invent anything: no years, awards, prices, staff numbers, quality claims or superlatives. Do not mention Google. Output only the description text.',
      messages: [{ role: 'user', content: facts }],
    })
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join(' ')
      .trim()
    return text ? text.slice(0, 1200) : null
  } catch (err) {
    log.error('ai', 'description draft failed', err)
    return null
  }
}
