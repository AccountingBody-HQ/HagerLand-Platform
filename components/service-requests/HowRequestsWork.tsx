import { ClipboardList, MessageSquareQuote, UserCheck } from 'lucide-react'
import { DEFAULT_REQUEST_STEPS, type RequestStep } from '@/lib/service-requests/form-copy'

const ICONS = [ClipboardList, UserCheck, MessageSquareQuote]

export function HowRequestsWork({ compact, steps = DEFAULT_REQUEST_STEPS }: { compact?: boolean; steps?: RequestStep[] }) {
  return (
    <ol className={compact ? 'space-y-4' : 'grid gap-4 sm:grid-cols-3'}>
      {steps.map((s, i) => {
        const Icon = ICONS[i % ICONS.length]
        return (
          <li key={s.title} className="flex gap-4 rounded-lg border border-border bg-stone-50 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-soft font-display font-bold text-green">{i + 1}</span>
            <div>
              <p className="flex items-center gap-2 font-semibold text-ink">
                <Icon className="size-4 text-green" aria-hidden /> {s.title}
              </p>
              <p className="mt-1 text-small text-muted">{s.text}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
