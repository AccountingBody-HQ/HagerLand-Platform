/** Area guides (spec 26.10): FAQs typed in admin as text. */

/** "Question" on the first line, the answer below; pairs separated by a blank line. */
export function parseFaqText(text: string): { question: string; answer: string }[] {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim().split('\n'))
    .filter((lines) => lines.length >= 2)
    .map(([q, ...a]) => ({ question: q.trim().slice(0, 200), answer: a.join(' ').trim().slice(0, 1000) }))
    .filter((f) => f.question && f.answer)
    .slice(0, 12)
}
