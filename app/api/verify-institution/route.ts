import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySessionToken } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function POST(req: Request) {
  const token = cookies().get('hl_admin_session')?.value
  if (!verifySessionToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { institutionSlug, institutionName, institutionType, group, currentData } = await req.json()
    if (!institutionSlug || !institutionName || !group) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const GROUP_PROMPTS: Record<string, string> = {
      rates: `Verify the savings and deposit rates for ${institutionName} (${institutionSlug}), an Ethiopian ${institutionType}.
Current data: ${JSON.stringify(currentData ?? {})}
Search the official ${institutionName} website and NBE directives to verify these rates are accurate.
Check: annual_rate values (stored as percentages e.g. 9.50 means 9.50%), account types, minimum balances, sharia compliance flags.
Return a JSON object with findings array.`,

      loans: `Verify the loan rates for ${institutionName} (${institutionSlug}), an Ethiopian ${institutionType}.
Current data: ${JSON.stringify(currentData ?? {})}
Search the official ${institutionName} website to verify loan rates, tenures and collateral requirements.
Check: min_rate, max_rate (percentages), max_tenure_months, collateral_required flags.
Return a JSON object with findings array.`,

      fx: `Verify the foreign exchange rates and services for ${institutionName} (${institutionSlug}), an Ethiopian ${institutionType}.
Current data: ${JSON.stringify(currentData ?? {})}
Search the official ${institutionName} website and NBE FX summaries to verify FX rates and fees.
Check: buying_rate and selling_rate (ETB per 1 foreign unit), currency codes supported, fee structures.
Return a JSON object with findings array.`,

      insurance: `Verify the insurance products for ${institutionName} (${institutionSlug}), an Ethiopian insurer.
Current data: ${JSON.stringify(currentData ?? {})}
Search the official ${institutionName} website to verify insurance products, premiums and coverage.
Check: product_type, premium ranges, coverage amounts, sharia compliance.
Return a JSON object with findings array.`,

      digital: `Verify the digital and mobile services for ${institutionName} (${institutionSlug}), an Ethiopian ${institutionType}.
Current data: ${JSON.stringify(currentData ?? {})}
Search the official ${institutionName} website, App Store and Google Play to verify digital services.
Check: has_mobile_app, has_internet_banking, has_ussd, app_store_rating, mobile_money_platform.
Return a JSON object with findings array.`,

      transfers: `Verify the transfer and remittance services for ${institutionName} (${institutionSlug}), an Ethiopian ${institutionType}.
Current data: ${JSON.stringify(currentData ?? {})}
Search the official ${institutionName} website and NBE money transfer registry to verify transfer services.
Check: transfer types, destination countries, fee percentages, processing times.
Return a JSON object with findings array.`,

      profile: `Verify the institutional profile for ${institutionName} (${institutionSlug}), an Ethiopian ${institutionType}.
Current data: ${JSON.stringify(currentData ?? {})}
Search NBE registry, Addis Fortune and Capital Ethiopia to verify institutional data.
Check: SWIFT code, website URL, NBE licence date, branch count, key leadership.
Return a JSON object with findings array.`,
    }

    const systemPrompt = `You are a financial data verification expert specialising in Ethiopian banking and finance.
You have web search access. Use it to verify data against official sources including:
- Institution official websites
- National Bank of Ethiopia (nbe.gov.et)
- Addis Fortune (addisfortune.news)
- Capital Ethiopia (capitalethiopia.com)

RULES:
1. Search at least 2 times before responding.
2. Return a single JSON object only. No markdown, no explanation. Start with { and end with }.
3. Your response must have this structure:
{
  "institution": "${institutionSlug}",
  "group": "${group}",
  "verified_at": "${new Date().toISOString().split('T')[0]}",
  "overall_status": "verified | needs_update | unverifiable",
  "summary": "2-3 sentence summary of what you found",
  "findings": [
    {
      "field": "field_name",
      "current_value": "what is currently stored",
      "verified_value": "what official source says",
      "status": "correct | incorrect | stale | unverifiable",
      "source": "URL of source used",
      "notes": "brief explanation"
    }
  ]
}
4. Every data point in the input must appear in findings.
5. Be specific — cite exact URLs and values from official sources.`

    const userPrompt = GROUP_PROMPTS[group]
    if (!userPrompt) {
      return NextResponse.json({ error: 'Unknown verification group: ' + group }, { status: 400 })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        system: systemPrompt,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    const data = await response.json()

    if (!response.ok || data.type === 'error') {
      const msg = data?.error?.message ?? JSON.stringify(data).slice(0, 300)
      return NextResponse.json({ error: 'Anthropic API error: ' + msg }, { status: 500 })
    }

    const textBlocks = (data.content ?? []).filter((b: { type: string }) => b.type === 'text')
    const text = textBlocks[textBlocks.length - 1]?.text ?? ''

    if (!text) {
      return NextResponse.json({ error: 'No text returned. Stop reason: ' + data.stop_reason }, { status: 500 })
    }

    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1) {
      return NextResponse.json({ error: 'No JSON found in response' }, { status: 500 })
    }

    const jsonStr = text.slice(start, end + 1)
    try {
      const parsed = JSON.parse(jsonStr)
      if (!parsed.findings || !Array.isArray(parsed.findings)) {
        return NextResponse.json({ error: 'Response missing findings array' }, { status: 500 })
      }
      return NextResponse.json({ ok: true, result: parsed })
    } catch (e: unknown) {
      return NextResponse.json({ error: 'JSON parse failed: ' + (e instanceof Error ? e.message : 'Unknown error') }, { status: 500 })
    }
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
