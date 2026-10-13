import { cn } from '@/lib/cn'

/** Small "Soon" marker for coming-soon verticals in menus and tiles (spec 24.3). */
export function SoonBadge({ className, long }: { className?: string; long?: boolean }) {
  return <span className={cn('inline-flex items-center rounded-full bg-gold-soft px-2 py-0.5 text-caption font-semibold text-gold-dark', className)}>{long ? 'Coming soon' : 'Soon'}</span>
}
