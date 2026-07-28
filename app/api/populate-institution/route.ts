import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifySessionToken } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const maxDuration = 120

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!

export async function POST(req: NextRequest) {
  const token = cookies().get('hl_admin_session')?.value
  if (!verifySessionToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { institutionSlug, institutionName, institutionType } = await req.json()
    if (!institutionSlug || !institutionName || !institutionType) {
      return NextResponse.json({ error: 'Missing institutionSlug, institutionName or institutionType' }, { status: 400 })
    }

    const prompt = `You are an expert in Ethiopian banking, insurance, and financial services with deep knowledge of the National Bank of Ethiopia (NBE) regulatory framework.

Your task is to return a complete, accurate JSON dataset for the following Ethiopian financial institution:
- Name: ${institutionName}
- Slug: ${institutionSlug}
- Type: ${institutionType}

CRITICAL RULES:
1. Return ONLY a raw JSON object. No markdown. No code blocks. No explanation. Start with { and end with }.
2. All monetary values must be in ETB (Ethiopian Birr).
3. All rates must be percentages stored as numbers (e.g. 9.5 for 9.5%, NOT 0.095).
4. FX rates must be ETB per 1 foreign currency unit (e.g. 1 USD = 156.50 ETB, stored as 156.50).
5. is_sharia_compliant must be true for Islamic/ZamZam/Hijra banks, false for all others.
6. last_verified_date must be today: ${new Date().toISOString().split('T')[0]}.
7. If you do not have specific data for a field, use null rather than guessing.

RETURN THIS EXACT JSON STRUCTURE:

{
  "institution": {
    "name": "${institutionName}",
    "slug": "${institutionSlug}",
    "type": "${institutionType}",
    "swift_code": "string or null",
    "website_url": "string or null",
    "founded_year": "integer or null",
    "headquarters_city": "string, default Addis Ababa",
    "headquarters": "string, full address or city, default Addis Ababa",
    "hq_region": "string, e.g. Addis Ababa, Oromia, Amhara etc.",
    "description": "200-300 word English description of the institution, its history, focus areas, and key products",
    "nbe_licence_date": "YYYY-MM-DD or null",
    "nbe_licence_number": "string or null",
    "ceo_name": "string or null",
    "branches_count": "integer or null"
  },
  "savings_rates": [
    {
      "account_type": "one of: regular_savings | fixed_deposit_3m | fixed_deposit_6m | fixed_deposit_12m | fixed_deposit_24m | current | diaspora | youth | women",
      "annual_rate": "number, e.g. 9.50",
      "minimum_balance_etb": "number or null",
      "is_sharia_compliant": "boolean"
    }
  ],
  "loan_rates": [
    {
      "loan_type": "one of: personal | home | business | car | agriculture",
      "min_rate": "number, e.g. 12.00",
      "max_rate": "number or null",
      "max_tenure_months": "integer or null",
      "min_amount_etb": "number or null",
      "collateral_required": "boolean"
    }
  ],
  "digital_services": {
    "has_mobile_app": "boolean",
    "has_internet_banking": "boolean",
    "has_ussd": "boolean",
    "has_swift": "boolean",
    "mobile_money_platform": "string or null, e.g. CBEBirr, HelloCash",
    "app_store_rating": "number or null, e.g. 4.2"
  },
  "guide": {
    "title": "Complete guide to ${institutionName} — products, rates and services",
    "body": "800-word comprehensive English guide covering the institution history, savings products and rates, loan products, digital services, special accounts (diaspora, youth, women), how to open an account, and who the institution is best suited for. Write in a factual, helpful tone suitable for Ethiopian consumers and the diaspora."
  }
}

Return the JSON now for ${institutionName}. Start immediately with {`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const textContent = (data.content ?? [])
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('')

    if (!textContent) {
      return NextResponse.json({ error: 'No text response from AI', raw: data }, { status: 500 })
    }

    let parsed: Record<string, unknown>
    try {
      let clean = textContent.trim()
      const fenceMatch = clean.match(/\`\`\`(?:json)?\s*([\s\S]*?)\`\`\`/)
      if (fenceMatch) {
        clean = fenceMatch[1].trim()
      } else {
        const start = clean.indexOf('{')
        const end = clean.lastIndexOf('}')
        if (start !== -1 && end !== -1) clean = clean.slice(start, end + 1)
      }
      parsed = JSON.parse(clean)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI JSON', raw: textContent.slice(0, 800) }, { status: 500 })
    }

    const required = ['institution', 'savings_rates', 'loan_rates', 'digital_services', 'guide']
    const missing = required.filter(k => !parsed[k])
    if (missing.length > 0) {
      return NextResponse.json({ error: 'AI response missing: ' + missing.join(', '), raw: textContent.slice(0, 800) }, { status: 500 })
    }

    return NextResponse.json({ ok: true, data: parsed })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
