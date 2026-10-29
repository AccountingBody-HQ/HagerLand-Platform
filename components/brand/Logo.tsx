import { cn } from '@/lib/cn'
import { BRAND_MARK } from '@/lib/brand-mark'

/** The HagerLand mark "E1": a white house outline in a green circle (lib/brand-mark.ts). */
export function LogoMark({ className }: { className?: string }) {
  const m = BRAND_MARK
  return (
    <svg viewBox={`0 0 ${m.viewBox} ${m.viewBox}`} className={cn('size-8 shrink-0', className)} fill="none" aria-hidden="true">
      <circle cx={m.circle.cx} cy={m.circle.cy} r={m.circle.r} fill={m.green} />
      <g fill="none" stroke={m.stroke} strokeWidth={m.strokeWidth} strokeLinecap="round" strokeLinejoin="round">
        <path d={m.paths[0]} />
        <path d={m.paths[1]} />
      </g>
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
