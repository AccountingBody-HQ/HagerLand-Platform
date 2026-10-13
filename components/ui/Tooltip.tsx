import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Explanation bubble shown on hover and on keyboard focus. The trigger is focusable,
 * and the text is also exposed to screen readers, so nothing depends on hover alone.
 */
export function Tooltip({ content, children, className }: { content: string; children: ReactNode; className?: string }) {
  return (
    <span className={cn('group relative inline-flex', className)}>
      <span tabIndex={0} className="inline-flex rounded-full" aria-label={content}>
        {children}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-64 -translate-x-1/2 rounded-md bg-ink px-3 py-2 text-caption font-medium text-white opacity-0 shadow-md transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        {content}
      </span>
    </span>
  )
}
