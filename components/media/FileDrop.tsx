'use client'

import { useRef, useState } from 'react'
import { CircleAlert, CircleCheck, LoaderCircle, Upload } from 'lucide-react'
import { processMediaUploadAction, processPrivateUploadAction, processUpdatePhotoAction, type MediaItem } from '@/lib/media-actions'
import { cn } from '@/lib/cn'
import type { PrivateArea } from '@/lib/media'

export type UploadTarget =
  | { purpose: 'media'; entity_type: 'property' | 'development' | 'organisation' | 'portfolio' | 'product'; entity_id: string; kind: 'image' | 'floorplan' | 'logo' | 'cover' }
  | { purpose: 'private'; area: PrivateArea; id: string }
  | { purpose: 'update-photo'; development_id: string }

export interface UploadedDoc {
  path: string
  name: string
  content_type: string
}

interface Progress {
  key: string
  name: string
  pct: number
  state: 'uploading' | 'processing' | 'done' | 'error'
  error?: string
}

function putWithProgress(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('Upload failed')))
    xhr.onerror = () => reject(new Error('Network error. Check your connection and try again.'))
    const body = new FormData()
    body.append('cacheControl', '3600')
    body.append('', file)
    xhr.send(body)
  })
}

/** Drag-and-drop (or tap to choose) uploader with per-file progress. */
export function FileDrop({
  target,
  accept,
  multiple = true,
  maxFiles,
  label,
  hint,
  onMediaUploaded,
  onDocUploaded,
  disabled,
}: {
  target: UploadTarget
  accept: string
  multiple?: boolean
  maxFiles?: number
  label: string
  hint?: string
  onMediaUploaded?: (item: MediaItem) => void
  onDocUploaded?: (doc: UploadedDoc) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [items, setItems] = useState<Progress[]>([])

  const update = (key: string, patch: Partial<Progress>) => setItems((all) => all.map((i) => (i.key === key ? { ...i, ...patch } : i)))

  async function uploadOne(file: File) {
    const key = `${file.name}-${file.size}-${Math.random()}`
    setItems((all) => [...all, { key, name: file.name, pct: 0, state: 'uploading' }])
    try {
      const signRes = await fetch('/api/uploads/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          target.purpose === 'media'
            ? { purpose: 'media', entity_type: target.entity_type, entity_id: target.entity_id, kind: target.kind, content_type: file.type, size: file.size }
            : target.purpose === 'update-photo'
              ? { purpose: 'media', entity_type: 'development', entity_id: target.development_id, kind: 'image', content_type: file.type, size: file.size }
              : { purpose: 'private', area: target.area, id: target.id, content_type: file.type, size: file.size },
        ),
      })
      const signed = (await signRes.json()) as { path?: string; signedUrl?: string; error?: string }
      if (!signRes.ok || !signed.signedUrl || !signed.path) throw new Error(signed.error ?? 'Upload is unavailable right now.')
      await putWithProgress(signed.signedUrl, file, (pct) => update(key, { pct }))
      update(key, { state: 'processing', pct: 100 })
      if (target.purpose === 'media') {
        const res = await processMediaUploadAction({ incoming_path: signed.path, entity_type: target.entity_type, entity_id: target.entity_id, kind: target.kind })
        if (!res.ok) throw new Error(res.error)
        onMediaUploaded?.(res.data)
      } else if (target.purpose === 'update-photo') {
        const res = await processUpdatePhotoAction({ incoming_path: signed.path, development_id: target.development_id })
        if (!res.ok) throw new Error(res.error)
        onDocUploaded?.({ path: res.data.path, name: file.name, content_type: 'image/webp' })
      } else {
        const res = await processPrivateUploadAction({ incoming_path: signed.path, area: target.area, id: target.id, content_type: file.type })
        if (!res.ok) throw new Error(res.error)
        onDocUploaded?.({ path: res.data.path, name: file.name, content_type: file.type })
      }
      update(key, { state: 'done' })
      window.setTimeout(() => setItems((all) => all.filter((i) => i.key !== key)), 2500)
    } catch (err) {
      update(key, { state: 'error', error: err instanceof Error ? err.message : 'Upload failed' })
    }
  }

  async function handle(files: FileList | null) {
    if (!files || disabled) return
    const list = Array.from(files).slice(0, maxFiles ?? files.length)
    for (const file of list) await uploadOne(file)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void handle(e.dataTransfer.files)
        }}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60',
          dragging ? 'border-green bg-green-tint' : 'border-border-strong bg-stone-50 hover:border-green',
        )}
      >
        <Upload className="size-6 text-green" aria-hidden />
        <span className="font-semibold text-ink">{label}</span>
        {hint && <span className="text-small text-muted">{hint}</span>}
      </button>
      <input ref={inputRef} type="file" aria-label={label} accept={accept} multiple={multiple} className="sr-only" tabIndex={-1} onChange={(e) => void handle(e.target.files)} />
      {items.length > 0 && (
        <ul className="mt-3 space-y-2" aria-live="polite">
          {items.map((i) => (
            <li key={i.key} className="rounded-md border border-border bg-white px-3 py-2 text-small">
              <div className="flex items-center gap-2">
                {i.state === 'error' ? (
                  <CircleAlert className="size-4 text-error" aria-hidden />
                ) : i.state === 'done' ? (
                  <CircleCheck className="size-4 text-green" aria-hidden />
                ) : (
                  <LoaderCircle className="size-4 animate-spin text-muted" aria-hidden />
                )}
                <span className="flex-1 truncate">{i.name}</span>
                <span className="text-muted">{i.state === 'uploading' ? `${i.pct}%` : i.state === 'processing' ? 'Processing…' : i.state === 'done' ? 'Done' : ''}</span>
              </div>
              {i.state === 'uploading' && (
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-stone-200">
                  <div className="h-full bg-green transition-all" style={{ width: `${i.pct}%` }} />
                </div>
              )}
              {i.error && <p className="mt-1 text-error">{i.error}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
