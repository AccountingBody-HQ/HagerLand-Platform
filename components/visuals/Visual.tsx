import Image from 'next/image'
import type { ReactNode } from 'react'
import { VISUALS, type VisualImage, type VisualSlot } from '@/lib/content/visuals'
import { cn } from '@/lib/cn'

/**
 * A photo-ready visual slot: the original line drawing (gold on forest, on the blueprint grid) until a photograph is
 * registered for the slot in lib/content/visuals.ts; then the photograph, cropped around its focal point, with a
 * fine gold frame line and a soft forest shade at the foot so it sits in the same family as the drawings.
 * `image` overrides the registry (for previews and tests). `bare` drops the panel, for drawings placed straight on a
 * forest surface (the hero).
 */
export function Visual({ slot, drawing, image, sizes = '(min-width: 1024px) 50vw, 100vw', className, priority, bare }: { slot: VisualSlot; drawing: ReactNode; image?: VisualImage | null; sizes?: string; className?: string; priority?: boolean; bare?: boolean }) {
  const photo = image === undefined ? VISUALS[slot] : image
  return (
    <div className={cn('relative overflow-hidden', !bare && 'rounded-[4px] bg-forest', bare && photo && 'rounded-[4px]', className)}>
      {photo ? (
        <>
          <Image src={photo.src} alt={photo.alt} fill sizes={sizes} priority={priority} className="object-cover" style={{ objectPosition: photo.focal ?? '50% 50%' }} />
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-forest/45 via-transparent to-transparent" aria-hidden />
          <span className="pointer-events-none absolute inset-3 rounded-[2px] ring-1 ring-gold-pale/40" aria-hidden />
        </>
      ) : (
        <div className={cn('flex h-full w-full items-center justify-center text-gold', !bare && 'hl-blueprint p-6 sm:p-10')}>{drawing}</div>
      )}
    </div>
  )
}
