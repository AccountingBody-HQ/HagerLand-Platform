'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Expand, Images, X } from 'lucide-react'
import { MediaImage } from './MediaImage'
import { cn } from '@/lib/cn'

export interface GalleryImage {
  path: string
  alt: string
  width: number | null
  height: number | null
}

function Lightbox({ images, index, onClose, onIndex }: { images: GalleryImage[]; index: number; onClose: () => void; onIndex: (i: number) => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const go = useCallback((d: number) => onIndex((index + d + images.length) % images.length), [index, images.length, onIndex])
  useEffect(() => {
    ref.current?.showModal()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [go])
  const img = images[index]
  return (
    <dialog ref={ref} onClose={onClose} aria-label="Photo viewer" className="m-0 h-full max-h-none w-full max-w-none bg-ink p-0 text-white backdrop:bg-ink open:flex open:flex-col">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-small tabular-nums">
          {index + 1} / {images.length}
        </span>
        <button type="button" onClick={onClose} aria-label="Close photo viewer" className="inline-flex size-11 items-center justify-center rounded-md hover:bg-white/10">
          <X className="size-6" />
        </button>
      </div>
      <div className="relative flex-1">
        <MediaImage key={img.path} path={img.path} alt={img.alt} fill sizes="100vw" className="object-contain" />
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Previous photo" className="absolute left-2 top-1/2 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 hover:bg-white/25">
              <ChevronLeft className="size-6" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next photo" className="absolute right-2 top-1/2 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 hover:bg-white/25">
              <ChevronRight className="size-6" />
            </button>
          </>
        )}
      </div>
      <p className="px-4 py-3 text-center text-small text-white/80">{img.alt}</p>
    </dialog>
  )
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
          <Images className="size-5" aria-hidden /> Photos coming soon
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
