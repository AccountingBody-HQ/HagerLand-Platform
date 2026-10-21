import Link from 'next/link'
import { GUIDE_TOPICS, parseGuideBody, parseGuideInline, type FaqItem } from '@/lib/guides'
import { formatDate } from '@/lib/format'
import { Accordion } from '@/components/ui/Accordion'

/** Paragraph or bullet text; links appear only for approved HagerLand pages (parseGuideInline). */
function Inline({ text }: { text: string }) {
  return parseGuideInline(text).map((s, i) =>
    s.type === 'link' ? (
      <Link key={i} href={s.href} className="font-semibold text-green hover:underline">
        {s.text}
      </Link>
    ) : (
      s.text
    ),
  )
}

/** The guide article as visitors see it; also used for the Guide studio import preview. */
export function GuideArticle({ guide, faq }: { guide: { topic: string | null; title: string | null; summary: string | null; body: string | null; updated_at: string | null }; faq: FaqItem[] }) {
  const blocks = parseGuideBody(guide.body ?? '')
  return (
    <article className="mt-6">
      <p className="text-small font-semibold text-green">{GUIDE_TOPICS.find((t) => t.value === guide.topic)?.label}</p>
      <h1 className="hl-h1 mt-1">{guide.title}</h1>
      <p className="mt-3 text-[1.0625rem] text-muted">{guide.summary}</p>
      <p className="mt-3 text-small text-muted">Updated {formatDate(guide.updated_at)}</p>
      <div className="mt-8 space-y-4 text-[1.0625rem] leading-relaxed">
        {blocks.map((b, i) =>
          b.type === 'h2' ? (
            <h2 key={i} className="hl-h3 pt-4">
              {b.text}
            </h2>
          ) : b.type === 'ul' ? (
            <ul key={i} className="list-disc space-y-1 pl-6">
              {b.items.map((it, j) => (
                <li key={j}>
                  <Inline text={it} />
                </li>
              ))}
            </ul>
          ) : (
            <p key={i}>
              <Inline text={b.text} />
            </p>
          ),
        )}
      </div>
      {faq.length > 0 && (
        <section aria-labelledby="faq-heading" className="mt-12">
          <h2 id="faq-heading" className="hl-h2 mb-4">
            Questions
          </h2>
          <Accordion items={faq.map((f, i) => ({ id: `faq-${i}`, title: f.question, content: f.answer }))} />
        </section>
      )}
      <p className="mt-12 rounded-md bg-stone-50 p-4 text-small text-muted">This guide is general information, not legal, financial or professional advice. Check anything important with a qualified professional.</p>
    </article>
  )
}
