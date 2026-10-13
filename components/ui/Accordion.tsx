import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Native details/summary accordion: works without JavaScript and with the keyboard. */
export function Accordion({ items, className }: { items: { id: string; title: ReactNode; content: ReactNode }[]; className?: string }) {
  return (
    <div className={cn('divide-y divide-border rounded-lg border border-border bg-white', className)}>
      {items.map((item) => (
        <details key={item.id} id={item.id} className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 font-semibold text-ink [&::-webkit-details-marker]:hidden">
            <span>{item.title}</span>
            <ChevronDown className="size-5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="px-5 pb-5 text-muted">{item.content}</div>
        </details>
      ))}
    </div>
  )
}
