import { cn } from '@/lib/cn'

/** The HagerLand mark: three connected points (Supply, Build, Property) in a green circle. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8 shrink-0', className)} fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#1C7C4C" />
      <path d="M11 12 L21 12 L16 21 Z" stroke="white" strokeWidth="1.4" fill="none" opacity="0.55" />
      <circle cx="11" cy="12" r="2.6" fill="white" />
      <circle cx="21" cy="12" r="2.6" fill="white" />
      <circle cx="16" cy="21" r="2.6" fill="white" />
    </svg>
  )
}

export function Wordmark({ className, inverse }: { className?: string; inverse?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark />
      <span className={cn('font-display text-[1.375rem] font-extrabold tracking-tight', inverse ? 'text-white' : 'text-ink')}>
        HagerLand<sup className="ml-0.5 align-super text-[0.55em] font-bold">®</sup>
      </span>
    </span>
  )
}
