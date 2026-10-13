import Link from 'next/link'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

const chip = 'inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-small font-medium transition-colors [&_svg]:size-4'

export function ChipLink({ href, children, active, icon, className }: { href: string; children: ReactNode; active?: boolean; icon?: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(chip, active ? 'border-ink bg-ink text-white' : 'border-border-strong bg-white text-ink hover:border-ink', className)}
    >
      {icon}
      {children}
    </Link>
  )
}

/** An applied filter with a link that removes it. */
export function FilterChip({ label, removeHref }: { label: string; removeHref: string }) {
  return (
    <Link href={removeHref} className={cn(chip, 'border-green/30 bg-green-soft text-green-darker hover:border-green')} aria-label={`Remove filter: ${label}`}>
      {label}
      <X aria-hidden />
    </Link>
  )
}
