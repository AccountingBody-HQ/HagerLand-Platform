import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type BadgeTone = 'neutral' | 'green' | 'gold' | 'ink' | 'info' | 'warning' | 'danger' | 'outline' | 'white'

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-stone-100 text-ink',
  green: 'bg-green-soft text-green-darker',
  gold: 'bg-gold-soft text-gold-dark',
  ink: 'bg-ink text-white',
  info: 'bg-info/10 text-info-dark',
  warning: 'bg-warning/10 text-warning-dark',
  danger: 'bg-error/10 text-error',
  outline: 'border border-border-strong text-ink bg-white',
  white: 'bg-white/95 text-ink shadow-xs',
}

export function Badge({ tone = 'neutral', icon, children, className }: { tone?: BadgeTone; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-caption font-semibold [&_svg]:size-3.5',
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
