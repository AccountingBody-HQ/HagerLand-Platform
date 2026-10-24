'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { discardImportsAction, publishImportsAction, saveImportDescriptionAction } from '../actions/imports'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'

interface Item {
  id: string
  name: string
  kind: string
  description: string | null
  phone: string | null
  website: string | null
  address: string | null
  location: string | null
  services: string[]
  /** Where its details stand (confirmed with the business, Google data, or lead with the place ID only). */
  state: string
  /** Why it cannot be published yet. */
  block: string | null
}

function DescriptionEditor({ item }: { item: Item }) {
  const [text, setText] = useState(item.description ?? '')
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  const changed = text !== (item.description ?? '')
  return (
    <div className="mt-2">
      <Textarea aria-label={`Description for ${item.name}`} value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Write 2–3 factual sentences. Needed before publishing." />
      {changed && (
        <Button
          size="sm"
          variant="secondary"
          className="mt-1"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await saveImportDescriptionAction(item.id, text)
              toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
              if (res.ok) router.refresh()
            })
          }
        >
          Save description
        </Button>
      )}
    </div>
  )
}

export function ImportReview({ items }: { items: Item[] }) {
  const [selected, setSelected] = useState<string[]>([])
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  const run = (fn: () => Promise<{ ok: true; data: { message: string } } | { ok: false; error: string }>) =>
    start(async () => {
      const res = await fn()
      toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
      if (res.ok) {
        setSelected([])
        router.refresh()
      }
    })
  if (items.length === 0) return <p className="rounded-lg border border-dashed border-border-strong bg-white p-8 text-center text-small text-muted">No leads waiting. Imported businesses appear here until they are confirmed with the business and published.</p>
  const all = selected.length === items.length
  return (
    <div className="rounded-lg border border-border bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <label className="flex min-h-11 items-center gap-2 text-small font-semibold">
          <input type="checkbox" className="size-5 accent-green" checked={all} onChange={() => setSelected(all ? [] : items.map((i) => i.id))} /> Select all ({items.length})
        </label>
        <div className="ml-auto flex gap-2">
          <Button size="sm" disabled={pending || !selected.length} onClick={() => run(() => publishImportsAction(selected))}>
            Publish {selected.length || ''}
          </Button>
          <Button size="sm" variant="ghost" disabled={pending || !selected.length} onClick={() => run(() => discardImportsAction(selected))}>
            Discard
          </Button>
        </div>
      </div>
      <ul className="divide-y divide-border">
        {items.map((i) => (
          <li key={i.id} className="flex gap-3 p-3">
            <input type="checkbox" aria-label={`Select ${i.name}`} className="mt-1 size-5 shrink-0 accent-green" checked={selected.includes(i.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, i.id] : selected.filter((x) => x !== i.id))} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                <Link href={`/roodber8/organisations/${i.id}`} className="hover:underline">
                  {i.name}
                </Link>{' '}
                <span className="text-caption font-normal text-muted">{i.kind.replace('_', ' ')}</span>
              </p>
              <p className="text-caption text-muted">{[i.location ?? 'No location', i.phone ?? 'no phone', i.website, i.services.join(', ')].filter(Boolean).join(' · ')}</p>
              {i.address && <p className="text-caption text-muted">{i.address}</p>}
              <p className="mt-1 text-caption">
                <span className="font-semibold">{i.state}</span>
                {i.block && (
                  <>
                    {' · '}
                    <Link href={`/roodber8/organisations/${i.id}#google-data`} prefetch={false} className="font-semibold text-green underline">
                      Confirm with the business
                    </Link>
                  </>
                )}
              </p>
              {i.block && <p className="text-caption text-muted">{i.block}</p>}
              <DescriptionEditor item={i} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
