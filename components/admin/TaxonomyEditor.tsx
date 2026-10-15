'use client'

import { useActionState, useEffect, useId, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, ChevronRight, Pencil } from 'lucide-react'
import { mergeLocationAction, moveCategoryAction, moveLocationAction, saveCategoryAction, saveLocationAction } from '@/app/roodber8/actions/taxonomy'
import type { ActionResult } from '@/lib/action-result'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'
import { useToast } from '@/components/ui/Toast'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/cn'
import { NoResetForm } from '@/components/forms/NoResetForm'

export interface TreeNode {
  id: string
  parent_id: string | null
  name: string
  sort: number
  is_active: boolean
  slug: string
  /** Line under the name, e.g. Amharic name or "12 products". */
  meta?: string
  level?: string
  fields: Record<string, string | null>
}

type Mode = { kind: 'category'; category: 'product' | 'service' } | { kind: 'location' }

type Msg = ActionResult<{ message: string }>

interface FieldDef {
  name: string
  label: string
  long?: boolean
  hint?: string
}

const CATEGORY_FIELDS: FieldDef[] = [
  { name: 'description', label: 'Short description', long: true },
  { name: 'seo_title', label: 'SEO title', hint: 'Up to 70 characters. Leave empty to use the name.' },
  { name: 'seo_intro', label: 'Intro paragraph on the public category page', long: true },
]
const LOCATION_FIELDS: FieldDef[] = [
  { name: 'name_am', label: 'Name in Amharic' },
  { name: 'seo_intro_sale', label: 'Intro on “for sale” pages', long: true },
  { name: 'seo_intro_rent', label: 'Intro on “for rent” pages', long: true },
  { name: 'seo_intro_professionals', label: 'Intro on professionals pages', long: true },
]

function useSave(mode: Mode) {
  const bound = mode.kind === 'category' ? saveCategoryAction.bind(null, mode.category) : saveLocationAction
  return useActionState<Msg | null, FormData>(bound, null)
}

function NodeForm({ mode, node, parents, onDone, allowRoot = true }: { mode: Mode; node?: TreeNode; parents: { id: string; label: string }[]; onDone?: () => void; allowRoot?: boolean }) {
  const [state, action] = useSave(mode)
  const router = useRouter()
  const uid = useId()
  const fields = mode.kind === 'category' ? CATEGORY_FIELDS : LOCATION_FIELDS
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  useEffect(() => {
    if (state?.ok) {
      router.refresh()
      onDone?.()
    }
  }, [state, router, onDone])
  return (
    <NoResetForm action={action} className="grid gap-3 sm:grid-cols-2" noValidate>
      {node && <input type="hidden" name="id" value={node.id} />}
      {state && !state.ok && <FormAlert className="sm:col-span-2">{state.error}</FormAlert>}
      {state?.ok && !node && <FormAlert tone="success" className="sm:col-span-2">{state.message}</FormAlert>}
      <Field label={mode.kind === 'location' ? 'Name (English)' : 'Name'} htmlFor={`${uid}-name`} error={errors.name} required>
        <Input id={`${uid}-name`} name="name" defaultValue={node?.name} invalid={Boolean(errors.name)} />
      </Field>
      {mode.kind === 'location' && node ? (
        <input type="hidden" name="parent_id" value={node.parent_id ?? ''} />
      ) : (
        <Field label="Parent" htmlFor={`${uid}-parent`} hint={mode.kind === 'location' ? 'The level is set from the parent.' : undefined}>
          <Select id={`${uid}-parent`} name="parent_id" defaultValue={node?.parent_id ?? ''}>
            {allowRoot && <option value="">{mode.kind === 'location' ? 'None (new region)' : 'None (top level)'}</option>}
            {parents
              .filter((p) => p.id !== node?.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
          </Select>
        </Field>
      )}
      {node &&
        fields.map((f) => (
          <Field key={f.name} label={f.label} htmlFor={`${uid}-${f.name}`} optional hint={f.hint} error={errors[f.name]} className={f.long ? 'sm:col-span-2' : undefined}>
            {f.long ? <Textarea id={`${uid}-${f.name}`} name={f.name} defaultValue={node.fields[f.name] ?? ''} rows={3} /> : <Input id={`${uid}-${f.name}`} name={f.name} defaultValue={node.fields[f.name] ?? ''} />}
          </Field>
        ))}
      {!node && mode.kind === 'location' && (
        <Field label="Name in Amharic" htmlFor={`${uid}-am`} optional>
          <Input id={`${uid}-am`} name="name_am" />
        </Field>
      )}
      {node && (
        <>
          <input type="hidden" name="sort" value={node.sort} />
          <label className="flex min-h-11 items-center gap-2 text-small sm:col-span-2">
            <input type="checkbox" name="is_active" value="true" defaultChecked={node.is_active} className="size-5 accent-green" />
            Active (shown on the website and in forms)
          </label>
        </>
      )}
      {!node && <input type="hidden" name="is_active" value="true" />}
      <div className="flex gap-2 sm:col-span-2">
        <SubmitButton size="sm" pendingText="Saving…">
          {node ? 'Save' : 'Add'}
        </SubmitButton>
        {onDone && node && (
          <Button size="sm" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        )}
      </div>
    </NoResetForm>
  )
}

function MergeForm({ node, targets, onDone }: { node: TreeNode; targets: { id: string; label: string }[]; onDone: () => void }) {
  const [into, setInto] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  const uid = useId()
  return (
    <div className="mt-4 rounded-md border border-warning/40 bg-warning/5 p-3">
      <p className="text-small font-semibold">Merge this duplicate into another location</p>
      <p className="text-caption text-muted">Everything linked to “{node.name}” moves to the location you choose. “{node.name}” is then switched off.</p>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <Field label="Merge into" htmlFor={`${uid}-into`} className="min-w-64 flex-1">
          <Select id={`${uid}-into`} value={into} onChange={(e) => (setInto(e.target.value), setConfirm(false))}>
            <option value="">Choose</option>
            {targets
              .filter((t) => t.id !== node.id)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
          </Select>
        </Field>
        {!confirm ? (
          <Button size="sm" variant="secondary" disabled={!into} onClick={() => setConfirm(true)}>
            Merge…
          </Button>
        ) : (
          <Button
            size="sm"
            variant="danger"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await mergeLocationAction(node.id, into)
                toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
                if (res.ok) {
                  onDone()
                  router.refresh()
                }
              })
            }
          >
            Yes, merge now
          </Button>
        )}
      </div>
    </div>
  )
}

function Row({ mode, node, all, depth, parents, mergeTargets }: { mode: Mode; node: TreeNode; all: TreeNode[]; depth: number; parents: { id: string; label: string }[]; mergeTargets: { id: string; label: string }[] }) {
  const children = all.filter((n) => n.parent_id === node.id).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))
  const [open, setOpen] = useState(depth === 0 && children.length > 0 && all.length < 120)
  const [editing, setEditing] = useState(false)
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  const move = (dir: 'up' | 'down') =>
    start(async () => {
      const res = mode.kind === 'category' ? await moveCategoryAction(mode.category, node.id, dir) : await moveLocationAction(node.id, dir)
      if (!res.ok) toast(res.error, 'error')
      router.refresh()
    })
  return (
    <li>
      <div className={cn('flex flex-wrap items-center gap-2 border-b border-border py-2 pr-2', !node.is_active && 'opacity-60')} style={{ paddingLeft: `${depth * 1.25 + 0.25}rem` }}>
        {children.length > 0 ? (
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={`${open ? 'Collapse' : 'Expand'} ${node.name}`} className="inline-flex size-8 items-center justify-center rounded hover:bg-stone-100">
            <ChevronRight className={cn('size-4 transition-transform', open && 'rotate-90')} />
          </button>
        ) : (
          <span className="size-8" aria-hidden />
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">
            {node.name} {!node.is_active && <Badge tone="neutral">off</Badge>} {node.level && <span className="text-caption font-normal text-muted">{node.level.replace('_', '-')}</span>}
          </p>
          <p className="truncate text-caption text-muted">
            /{node.slug}
            {node.meta ? ` · ${node.meta}` : ''}
          </p>
        </div>
        <div className="flex gap-1">
          <button type="button" disabled={pending} onClick={() => move('up')} aria-label={`Move ${node.name} up`} className="inline-flex size-9 items-center justify-center rounded border border-border hover:bg-stone-100 disabled:opacity-50">
            <ArrowUp className="size-4" />
          </button>
          <button type="button" disabled={pending} onClick={() => move('down')} aria-label={`Move ${node.name} down`} className="inline-flex size-9 items-center justify-center rounded border border-border hover:bg-stone-100 disabled:opacity-50">
            <ArrowDown className="size-4" />
          </button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(!editing)} aria-expanded={editing}>
            <Pencil /> Edit
          </Button>
        </div>
      </div>
      {editing && (
        <div className="border-b border-border bg-stone-50 p-4" style={{ paddingLeft: `${depth * 1.25 + 2.5}rem` }}>
          <NodeForm mode={mode} node={node} parents={parents} onDone={() => setEditing(false)} />
          {mode.kind === 'location' && <MergeForm node={node} targets={mergeTargets} onDone={() => setEditing(false)} />}
        </div>
      )}
      {open && children.length > 0 && (
        <ul>
          {children.map((c) => (
            <Row key={c.id} mode={mode} node={c} all={all} depth={depth + 1} parents={parents} mergeTargets={mergeTargets} />
          ))}
        </ul>
      )}
    </li>
  )
}

/** Editable tree for product categories, service categories or locations. */
export function TaxonomyEditor({ mode, nodes, parents, mergeTargets = [], addTitle, allowRoot = true }: { mode: Mode; nodes: TreeNode[]; parents: { id: string; label: string }[]; mergeTargets?: { id: string; label: string }[]; addTitle: string; allowRoot?: boolean }) {
  const [filter, setFilter] = useState('')
  const filterId = useId()
  const roots = nodes.filter((n) => !n.parent_id).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))
  const term = filter.trim().toLowerCase()
  const matches = term ? nodes.filter((n) => n.name.toLowerCase().includes(term) || (n.meta ?? '').toLowerCase().includes(term)) : []
  return (
    <div className="space-y-5">
      <details className="rounded-lg border border-border bg-white p-4">
        <summary className="cursor-pointer font-semibold text-ink">{addTitle}</summary>
        <div className="mt-4">
          <NodeForm mode={mode} parents={parents} allowRoot={allowRoot} />
        </div>
      </details>
      <div className="rounded-lg border border-border bg-white">
        <div className="border-b border-border p-3">
          <label className="sr-only" htmlFor={filterId}>
            Find
          </label>
          <Input id={filterId} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Find by name" className="h-10 max-w-sm" />
        </div>
        {term ? (
          matches.length ? (
            <ul>
              {matches.map((n) => (
                <Row key={n.id} mode={mode} node={n} all={[]} depth={0} parents={parents} mergeTargets={mergeTargets} />
              ))}
            </ul>
          ) : (
            <p className="p-6 text-center text-small text-muted">Nothing matches “{filter}”.</p>
          )
        ) : roots.length ? (
          <ul>
            {roots.map((n) => (
              <Row key={n.id} mode={mode} node={n} all={nodes} depth={0} parents={parents} mergeTargets={mergeTargets} />
            ))}
          </ul>
        ) : (
          <p className="p-6 text-center text-small text-muted">Nothing here yet. Add the first one above.</p>
        )}
      </div>
    </div>
  )
}
