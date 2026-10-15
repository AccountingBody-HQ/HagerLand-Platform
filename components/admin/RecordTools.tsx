'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { addNoteAction, setFeaturedAction, setStatusAction } from '@/app/roodber8/actions/entities'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { formatDate } from '@/lib/format'

type Result = { ok: true; data: { message: string } } | { ok: false; error: string }

function useRun() {
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  const run = (fn: () => Promise<Result>, after?: () => void) =>
    start(async () => {
      const res = await fn()
      toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
      if (res.ok) {
        after?.()
        router.refresh()
      }
    })
  return { pending, run }
}

export function FeatureTool({ entity, id, featuredUntil }: { entity: 'property' | 'development' | 'organisation' | 'product'; id: string; featuredUntil: string | null }) {
  const { pending, run } = useRun()
  const [until, setUntil] = useState('')
  const live = featuredUntil && new Date(featuredUntil) > new Date()
  return (
    <div className="space-y-2">
      <p className="text-small">{live ? `Featured until ${formatDate(featuredUntil)}` : 'Not featured'}</p>
      <div className="flex flex-wrap gap-2">
        <Input type="date" aria-label="Feature until" value={until} onChange={(e) => setUntil(e.target.value)} className="h-9 w-44" />
        <Button size="sm" disabled={pending || !until} onClick={() => run(() => setFeaturedAction(entity, id, until))}>
          Feature until
        </Button>
        {live && (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setFeaturedAction(entity, id, null))}>
            Stop featuring
          </Button>
        )}
      </div>
    </div>
  )
}

export function StatusTool({ entity, id, status }: { entity: 'property' | 'development' | 'organisation' | 'product'; id: string; status: string }) {
  const { pending, run } = useRun()
  const [value, setValue] = useState(status)
  return (
    <div className="flex flex-wrap gap-2">
      <Select aria-label="Status" value={value} onChange={(e) => setValue(e.target.value)} className="h-9 w-48">
        {['draft', 'pending_review', 'published', 'paused', 'expired', 'rejected', 'archived'].map((s) => (
          <option key={s} value={s}>
            {s.replace('_', ' ')}
          </option>
        ))}
      </Select>
      <Button size="sm" variant="secondary" disabled={pending || value === status} onClick={() => run(() => setStatusAction(entity, id, value))}>
        Set status
      </Button>
    </div>
  )
}

export function NotesTool({ entity, id, notes }: { entity: string; id: string; notes: { note: string; created_at: string }[] }) {
  const { pending, run } = useRun()
  const [text, setText] = useState('')
  return (
    <div className="space-y-3">
      {notes.length > 0 && (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.created_at} className="rounded-md bg-gold-soft/70 p-2 text-small">
              <p className="whitespace-pre-line">{n.note}</p>
              <p className="mt-1 text-caption text-muted">{formatDate(n.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
      <Textarea aria-label="New internal note" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Internal note (never shown to users)" />
      <Button size="sm" variant="secondary" disabled={pending || !text.trim()} onClick={() => run(() => addNoteAction(entity, id, text), () => setText(''))}>
        Add note
      </Button>
    </div>
  )
}
