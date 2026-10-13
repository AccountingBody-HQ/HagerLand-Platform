'use client'

import Image from 'next/image'
import { useState, useTransition } from 'react'
import { ArrowLeft, ArrowRight, Star, Trash2 } from 'lucide-react'
import { deleteMediaAction, reorderMediaAction, setCoverAction, updateAltAction, type MediaItem } from '@/lib/media-actions'
import { publicMediaUrl, MEDIA_LIMITS } from '@/lib/media'
import { FileDrop } from './FileDrop'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'

type Entity = 'property' | 'development' | 'organisation' | 'portfolio' | 'product'

/** Upload, reorder, choose the cover, describe and delete photos for one record. */
export function MediaManager({
  entityType,
  entityId,
  kind = 'image',
  initial,
  label = 'Add photos',
  hint,
  minRequired,
}: {
  entityType: Entity
  entityId: string
  kind?: 'image' | 'floorplan'
  initial: MediaItem[]
  label?: string
  hint?: string
  minRequired?: number
}) {
  const [items, setItems] = useState<MediaItem[]>(() => initial.filter((m) => m.kind === kind).sort((a, b) => a.sort - b.sort))
  const [pending, startTransition] = useTransition()
  const toast = useToast()
  const max = MEDIA_LIMITS[entityType][kind] ?? 0

  function move(index: number, dir: -1 | 1) {
    const next = [...items]
    const j = index + dir
    if (j < 0 || j >= next.length) return
    ;[next[index], next[j]] = [next[j], next[index]]
    setItems(next)
    startTransition(async () => {
      const res = await reorderMediaAction(entityType, entityId, next.map((m) => m.id))
      if (!res.ok) toast(res.error, 'error')
    })
  }

  return (
    <div className="space-y-4">
      {items.length < max && (
        <FileDrop
          target={{ purpose: 'media', entity_type: entityType, entity_id: entityId, kind }}
          accept="image/jpeg,image/png,image/webp"
          maxFiles={max - items.length}
          label={label}
          hint={hint ?? `JPEG, PNG or WebP, up to 12 MB each. ${items.length} of ${max} added.`}
          onMediaUploaded={(m) => setItems((all) => [...all, m])}
        />
      )}
      {minRequired && items.length < minRequired && (
        <p className="text-small text-warning">
          Add at least {minRequired} photos ({minRequired - items.length} more) before you submit.
        </p>
      )}
      {items.length > 0 && (
        <ul className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4', pending && 'opacity-70')}>
          {items.map((m, i) => {
            const src = publicMediaUrl(m.thumb_path ?? m.storage_path)
            return (
              <li key={m.id} className="overflow-hidden rounded-lg border border-border bg-white">
                <div className="relative aspect-[4/3] bg-stone-100">
                  {src && <Image src={src} alt={m.alt ?? `Photo ${i + 1}`} fill sizes="(min-width: 1024px) 200px, 45vw" className="object-cover" />}
                  <div className="absolute left-2 top-2 flex gap-1">
                    {m.is_cover && <Badge tone="ink">Cover</Badge>}
                    {m.status === 'pending' && <Badge tone="white">In review</Badge>}
                  </div>
                </div>
                <div className="space-y-2 p-2">
                  <input
                    aria-label={`Description of photo ${i + 1}`}
                    defaultValue={m.alt ?? ''}
                    placeholder="Describe this photo"
                    maxLength={200}
                    onBlur={(e) => {
                      if (e.target.value !== (m.alt ?? '')) void updateAltAction(m.id, e.target.value)
                    }}
                    className="h-9 w-full rounded-sm border border-border px-2 text-small"
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex">
                      <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="inline-flex size-9 items-center justify-center rounded hover:bg-stone-100 disabled:opacity-30" aria-label="Move earlier">
                        <ArrowLeft className="size-4" />
                      </button>
                      <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="inline-flex size-9 items-center justify-center rounded hover:bg-stone-100 disabled:opacity-30" aria-label="Move later">
                        <ArrowRight className="size-4" />
                      </button>
                    </div>
                    <div className="flex">
                      {kind === 'image' && !m.is_cover && (
                        <button
                          type="button"
                          aria-label="Make cover photo"
                          title="Make cover photo"
                          className="inline-flex size-9 items-center justify-center rounded hover:bg-stone-100"
                          onClick={() =>
                            startTransition(async () => {
                              const res = await setCoverAction(m.id)
                              if (res.ok) setItems((all) => all.map((x) => ({ ...x, is_cover: x.id === m.id })))
                            })
                          }
                        >
                          <Star className="size-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label="Delete photo"
                        title="Delete photo"
                        className="inline-flex size-9 items-center justify-center rounded text-error hover:bg-error/10"
                        onClick={() =>
                          startTransition(async () => {
                            const res = await deleteMediaAction(m.id)
                            if (res.ok) setItems((all) => all.filter((x) => x.id !== m.id))
                            else toast(res.error, 'error')
                          })
                        }
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
