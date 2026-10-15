'use client'

import { useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Expand, Images } from 'lucide-react'
import { MediaImage } from './MediaImage'
import { cn } from '@/lib/cn'

/** Full-screen viewer, loaded only when opened. */
const Lightbox = dynamic(() => import('./Lightbox').then((m) => m.Lightbox), { ssr: false })

export interface GalleryImage {
  path: string
  alt: string
  width: number | null
  height: number | null
}


/** Photo gallery: grid on desktop, swipe carousel on mobile, full-screen viewer. Floor plans and video as tabs. */
export function Gallery({ images, floorplans = [], videoEmbed, aspect = 'aspect-[3/2]' }: { images: GalleryImage[]; floorplans?: GalleryImage[]; videoEmbed?: string | null; aspect?: string }) {
  const [tab, setTab] = useState<'photos' | 'floorplans' | 'video'>('photos')
  const [open, setOpen] = useState<number | null>(null)
  const [slide, setSlide] = useState(0)
  const scroller = useRef<HTMLDivElement>(null)
  const set = tab === 'floorplans' ? floorplans : images

  const tabs = [
    { id: 'photos' as const, label: `Photos (${images.length})`, show: images.length > 0 },
    { id: 'floorplans' as const, label: `Floor plans (${floorplans.length})`, show: floorplans.length > 0 },
    { id: 'video' as const, label: 'Video', show: Boolean(videoEmbed) },
  ].filter((t) => t.show)

  if (images.length === 0 && !videoEmbed) {
    return (
      <div className={cn('flex items-center justify-center rounded-xl bg-stone-100 text-muted', aspect)}>
        <span className="flex items-center gap-2">
          <Images className="size-5" aria-hidden /> No photos added yet
        </span>
      </div>
    )
  }

  return (
    <div>
      {tabs.length > 1 && (
        <div role="tablist" className="mb-3 flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn('min-h-10 rounded-full border px-4 text-small font-semibold', tab === t.id ? 'border-ink bg-ink text-white' : 'border-border-strong bg-white text-ink')}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {tab === 'video' && videoEmbed ? (
        <div className="aspect-video overflow-hidden rounded-xl bg-ink">
          <iframe src={videoEmbed} title="Property video" className="size-full" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
        </div>
      ) : (
        <>
          <div className="relative md:hidden">
            <div
              ref={scroller}
              onScroll={(e) => setSlide(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
              className="-mx-4 flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {set.map((img, i) => (
                <button key={img.path} type="button" onClick={() => setOpen(i)} className={cn('relative w-full shrink-0 snap-center bg-stone-100', aspect)} aria-label={`Open photo ${i + 1}`}>
                  <MediaImage path={img.path} alt={img.alt} fill sizes="100vw" priority={i === 0} loading={i === 0 ? undefined : 'lazy'} className="object-cover" />
                </button>
              ))}
            </div>
            <span className="absolute bottom-3 right-3 rounded-full bg-ink/75 px-2.5 py-1 text-caption font-semibold tabular-nums text-white">
              {Math.min(slide + 1, set.length)} / {set.length}
            </span>
          </div>

          <div className={cn('hidden gap-2 md:grid', set.length >= 5 ? 'md:grid-cols-4 md:grid-rows-2' : set.length >= 3 ? 'md:grid-cols-3 md:grid-rows-2' : set.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1')}>
            {set.slice(0, set.length >= 5 ? 5 : set.length >= 3 ? 3 : set.length).map((img, i, shown) => {
              const isMain = i === 0 && shown.length >= 3
              const last = i === shown.length - 1
              return (
                <button
                  key={img.path}
                  type="button"
                  onClick={() => setOpen(i)}
                  className={cn('group relative overflow-hidden rounded-lg bg-stone-100', isMain ? 'col-span-2 row-span-2 aspect-[3/2]' : shown.length <= 2 ? 'aspect-[3/2]' : 'aspect-auto min-h-0')}
                  aria-label={`Open photo ${i + 1}`}
                >
                  <MediaImage path={img.path} alt={img.alt} fill sizes={isMain || shown.length <= 2 ? '(min-width: 1280px) 760px, 60vw' : '(min-width: 1280px) 380px, 30vw'} priority={i === 0} className="object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                  {last && set.length > shown.length && <span className="absolute inset-0 flex items-center justify-center bg-ink/55 font-semibold text-white">+{set.length - shown.length} more</span>}
                </button>
              )
            })}
          </div>
          {set.length > 1 && (
            <button type="button" onClick={() => setOpen(0)} className="mt-2 hidden min-h-10 items-center gap-2 text-small font-semibold text-green md:inline-flex">
              <Expand className="size-4" aria-hidden /> View all {set.length} {tab === 'floorplans' ? 'floor plans' : 'photos'}
            </button>
          )}
        </>
      )}
      {open !== null && <Lightbox images={set} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />}
    </div>
  )
}
