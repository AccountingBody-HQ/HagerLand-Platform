import 'server-only'
import { brand } from '@/lib/brand'
import { escapeHtml } from '@/lib/security'
import { canonicalUrl } from '@/lib/site'

export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

interface LayoutInput {
  subject: string
  preheader: string
  heading: string
  /** Paragraphs of plain text (escaped here). */
  paragraphs: string[]
  /** Optional key/value rows (escaped here). */
  details?: [string, string][]
  /** Optional quoted block of user-written text (escaped here). */
  quote?: string
  button?: { label: string; href: string }
  reason: string
}

const green = '#1C7C4C'
const ink = '#152238'
const muted = '#5B6472'

/** Table-based, mobile-safe HagerLand email with a matching plain-text version. */
export function renderEmail(input: LayoutInput): RenderedEmail {
  const { subject, preheader, heading, paragraphs, details, quote, button, reason } = input
  const p = paragraphs
    .map((t) => `<p style="margin:0 0 16px;font-size:16px;line-height:24px;color:${ink}">${escapeHtml(t)}</p>`)
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
${escapeHtml(reason)}<br>Questions? <a href="${canonicalUrl('/contact')}" style="color:${green}">Contact HagerLand</a>${brand.legalEntityLine ? `<br>${escapeHtml(brand.legalEntityLine)}` : ''}
</td></tr></table></td></tr></table></body></html>`

  const textParts = [
    'HagerLand',
    '',
    heading,
    '',
    ...paragraphs.flatMap((t) => [t, '']),
    ...(details?.length ? [...details.map(([k, v]) => `${k}: ${v}`), ''] : []),
    ...(quote ? [quote, ''] : []),
    ...(button ? [`${button.label}: ${button.href}`, ''] : []),
    '--',
    reason,
    `Contact HagerLand: ${canonicalUrl('/contact')}`,
  ]
  return { subject, html, text: textParts.join('\n') }
}
