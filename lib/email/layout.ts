import 'server-only'
import { brand } from '@/lib/brand'
import { escapeHtml } from '@/lib/security'
import { canonicalUrl } from '@/lib/site'

export interface RenderedEmail {
  subject: string
  html: string
  text: string
  /** Extra headers, e.g. List-Unsubscribe for alert emails. */
  headers?: Record<string, string>
}

/** QC-2: a short list inside an email, e.g. the payment methods (title on one line, then its text). */
export interface EmailList {
  items: { title: string; text: string }[]
}

interface LayoutInput {
  subject: string
  preheader: string
  heading: string
  /** Paragraphs of plain text (escaped here). QC-2: an entry may also be a short list (each item: a title, then its text). */
  paragraphs: (string | EmailList)[]
  /** Optional key/value rows (escaped here). */
  details?: [string, string][]
  /** Optional quoted block of user-written text (escaped here). */
  quote?: string
  button?: { label: string; href: string }
  reason: string
  /** Links shown under the reason, e.g. "Unsubscribe" (escaped here). */
  footerLinks?: { label: string; href: string }[]
}

/** QC-2 (W5): the company line in every email footer, before "Questions?". */
export const COMPANY_LINE = `${brand.legalName}, ${brand.legalAddress}`

const green = '#1C7C4C'
const ink = '#152238'
const muted = '#5B6472'

/** Table-based, mobile-safe HagerLand email with a matching plain-text version. */
export function renderEmail(input: LayoutInput): RenderedEmail {
  const { subject, preheader, heading, paragraphs, details, quote, button, reason, footerLinks = [] } = input
  const p = paragraphs
    .map((t) =>
      typeof t === 'string'
        ? `<p style="margin:0 0 16px;font-size:16px;line-height:24px;color:${ink}">${escapeHtml(t)}</p>`
        : `<ul style="margin:0 0 16px;padding-left:20px;font-size:16px;line-height:24px;color:${ink}">${t.items.map((i) => `<li style="margin:0 0 8px"><strong>${escapeHtml(i.title)}</strong><br><span style="white-space:pre-line">${escapeHtml(i.text)}</span></li>`).join('')}</ul>`,
    )
    .join('')
  const rows = details?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid #E4E6E3;border-radius:10px">${details
        .map(
          ([k, v]) =>
            `<tr><td style="padding:10px 14px;font-size:14px;color:${muted};width:38%;vertical-align:top;border-bottom:1px solid #F4F2EE">${escapeHtml(k)}</td><td style="padding:10px 14px;font-size:14px;color:${ink};vertical-align:top;border-bottom:1px solid #F4F2EE">${escapeHtml(v)}</td></tr>`,
        )
        .join('')}</table>`
    : ''
  const q = quote
    ? `<div style="margin:0 0 20px;padding:14px 16px;background:#FAF9F7;border-left:4px solid ${green};font-size:15px;line-height:22px;color:${ink};white-space:pre-wrap">${escapeHtml(quote)}</div>`
    : ''
  const btn = button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px"><tr><td style="border-radius:10px;background:${green}"><a href="${escapeHtml(button.href)}" style="display:inline-block;padding:14px 24px;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px">${escapeHtml(button.label)}</a></td></tr></table>`
    : ''

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#F4F2EE;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F2EE"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="background:${ink};padding:20px 28px"><span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.3px">HagerLand</span><br><span style="font-size:13px;color:#B8862E">${escapeHtml(brand.descriptor)}</span></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-size:22px;line-height:30px;color:${ink}">${escapeHtml(heading)}</h1>
${p}${rows}${q}${btn}
</td></tr>
<tr><td style="padding:20px 28px;background:#FAF9F7;font-size:12px;line-height:18px;color:${muted}">
${escapeHtml(reason)}<br>${escapeHtml(COMPANY_LINE)}<br>${footerLinks.map((l) => `<a href="${escapeHtml(l.href)}" style="color:${green}">${escapeHtml(l.label)}</a> · `).join('')}Questions? <a href="${canonicalUrl('/contact')}" style="color:${green}">Contact HagerLand</a>
</td></tr></table></td></tr></table></body></html>`

  const textParts = [
    'HagerLand',
    '',
    heading,
    '',
    ...paragraphs.flatMap((t) => (typeof t === 'string' ? [t, ''] : [...t.items.flatMap((i) => [i.title, i.text, '']), ''].slice(0, -1))),
    ...(details?.length ? [...details.map(([k, v]) => `${k}: ${v}`), ''] : []),
    ...(quote ? [quote, ''] : []),
    ...(button ? [`${button.label}: ${button.href}`, ''] : []),
    '--',
    reason,
    ...footerLinks.map((l) => `${l.label}: ${l.href}`),
    COMPANY_LINE,
    `Contact HagerLand: ${canonicalUrl('/contact')}`,
  ]
  return { subject, html, text: textParts.join('\n') }
}
