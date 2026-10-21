import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { GuideArticle } from '@/components/guides/GuideArticle'
import { guideLinkHref, parseGuideInline } from '@/lib/guides'

// The starter guide "Property viewing checklist" (migration 0021), which contains no links.
const viewingChecklist = {
  topic: 'property',
  title: 'Property viewing checklist',
  summary: 'What to look at, and what to ask, when you view a house or apartment.',
  updated_at: '2026-10-15T12:00:00Z',
  body: 'A viewing is your chance to check the property and ask questions before you make an offer or sign a lease.\n\n## Outside\n- Cracks in walls, signs of damp and the condition of the roof\n- Access roads, parking and the neighbourhood at different times of day\n\n## Inside\n- Water pressure, electricity and signs of leaks\n- Doors, windows and locks\n- Natural light and ventilation\n\n## Questions to ask\n- Who owns the property, and can I see the documents?\n- What is included in the price or rent?\n- Are there any service charges or shared costs?\n\nNever pay a deposit before you have seen the property and checked who you are dealing with.',
}
const faq = [{ question: 'Can someone view a property for me if I live abroad?', answer: "Yes. You can ask a trusted person, or use HagerLand's services for buyers abroad where available." }]

function render(body: string): string {
  return renderToStaticMarkup(createElement(GuideArticle, { guide: { ...viewingChecklist, body }, faq: [] }))
}

describe('guide renderer', () => {
  it('renders a guide without links exactly as before', () => {
    expect(renderToStaticMarkup(createElement(GuideArticle, { guide: viewingChecklist, faq }))).toMatchSnapshot()
  })
})

describe('links in guide text', () => {
  const a = (html: string) => Array.from(html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)).map((m) => [m[1], m[2]])

  it('links an approved HagerLand page, with an optional #fragment', () => {
    expect(parseGuideInline('Send [your materials list](/supplies/materials-list) today.')).toEqual([
      { type: 'text', text: 'Send ' },
      { type: 'link', text: 'your materials list', href: '/supplies/materials-list' },
      { type: 'text', text: ' today.' },
    ])
    expect(a(render('See [the jobs board](/jobs#latest).'))).toEqual([['/jobs#latest', 'the jobs board']])
    expect(guideLinkHref('https://www.hagerland.com/buy')).toBe('/buy')
    expect(guideLinkHref('/buy#a#b')).toBeNull()
    expect(guideLinkHref('/buy#"x')).toBeNull()
  })

  it('shows anything else as its words, never as a link or brackets', () => {
    for (const target of ['https://example.com', '//evil.example', '/not-a-page', '/roodber8', 'javascript:alert(1)', 'data:text/html,hi', '']) {
      const html = render(`Read [these words](${target}) now.`)
      expect(a(html), target).toEqual([])
      expect(html, target).toContain('<p>Read these words now.</p>')
    }
  })

  it('keeps broken link syntax readable', () => {
    expect(render('A [broken link](/buy and more.')).toContain('<p>A broken link and more.</p>')
    expect(render('Ends with [half](/rent')).toContain('<p>Ends with half</p>')
    expect(render('Square [brackets] stay.')).toContain('<p>Square [brackets] stay.</p>')
  })

  it('links inside a bullet and escapes the text', () => {
    const html = render('- Ask [a professional](/professionals) & <b>check</b>')
    expect(a(html)).toEqual([['/professionals', 'a professional']])
    expect(html).toContain('&amp; &lt;b&gt;check&lt;/b&gt;</li>')
    expect(html).toContain('class="font-semibold text-green hover:underline"')
  })
})
