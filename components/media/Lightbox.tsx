'use client'

import { useCallback, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { MediaImage } from './MediaImage'
import type { GalleryImage } from './Gallery'

export function Lightbox({ images, index, onClose, onIndex }: { images: GalleryImage[]; index: number; onClose: () => void; onIndex: (i: number) => void }) {
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
