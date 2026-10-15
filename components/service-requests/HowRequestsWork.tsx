import { ClipboardList, MessageSquareQuote, UserCheck } from 'lucide-react'

const STEPS = [
  { icon: ClipboardList, title: 'Tell us what you need', text: 'A few questions about the job, where it is and how soon.' },
  { icon: UserCheck, title: 'We match up to three providers', text: 'Chosen by service, location and verification. They contact you directly.' },
  { icon: MessageSquareQuote, title: 'Compare quotes and choose', text: 'Quotes appear on your request page. Agree everything in writing before you pay.' },
]

export function HowRequestsWork({ compact }: { compact?: boolean }) {
  return (
    <ol className={compact ? 'space-y-4' : 'grid gap-4 sm:grid-cols-3'}>
      {STEPS.map((s, i) => (
        <li key={s.title} className="flex gap-4 rounded-lg border border-border bg-stone-50 p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-soft font-display font-bold text-green">{i + 1}</span>
          <div>
            <p className="flex items-center gap-2 font-semibold text-ink">
              <s.icon className="size-4 text-green" aria-hidden /> {s.title}
            </p>
            <p className="mt-1 text-small text-muted">{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
