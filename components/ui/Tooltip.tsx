import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Explanation bubble shown on hover and on keyboard focus. The trigger is focusable,
 * and the text is also exposed to screen readers, so nothing depends on hover alone.
 * Hidden (not just invisible) until shown, so it never makes the page scroll sideways.
 */
export function Tooltip({ content, children, className }: { content: string; children: ReactNode; className?: string }) {
  return (
    <span className={cn('group relative inline-flex', className)}>
      <span tabIndex={0} className="inline-flex rounded-full" aria-label={content}>
        {children}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-max max-w-[min(16rem,calc(100vw-2rem))] -translate-x-1/2 rounded-md bg-ink px-3 py-2 text-caption font-medium text-white shadow-md group-focus-within:block group-hover:block"
      >
        {content}
      </span>
    </span>
  )
}
