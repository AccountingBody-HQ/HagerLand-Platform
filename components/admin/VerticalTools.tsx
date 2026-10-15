'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { saveVerticalAction, setVerticalStatusAction, updateLeadAction } from '@/app/roodber8/actions/verticals'
import { Button } from '@/components/ui/Button'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'

type Result = { ok: true; data: { message: string } } | { ok: false; error: string }

function useRun() {
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const res = await fn()
      toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
      if (res.ok) router.refresh()
    })
  return { pending, run }
}

const STATUSES = [
  { value: 'live', label: 'Live' },
  { value: 'coming_soon', label: 'Coming soon' },
  { value: 'hidden', label: 'Hidden' },
] as const

/** Live / Coming soon / Hidden in one click (spec 24.2). */
export function VerticalStatusSwitch({ verticalKey, name, status }: { verticalKey: string; name: string; status: string }) {
  const { pending, run } = useRun()
  return (
    <div role="group" aria-label={`Status of ${name}`} className="inline-flex overflow-hidden rounded-md border border-border-strong">
      {STATUSES.map((s) => (
        <button
          key={s.value}
          type="button"
          aria-pressed={status === s.value}
          disabled={pending || status === s.value}
          onClick={() => run(() => setVerticalStatusAction(verticalKey, s.value))}
          className={cn('min-h-10 px-3 text-small font-semibold', status === s.value ? (s.value === 'live' ? 'bg-green text-white' : s.value === 'hidden' ? 'bg-ink text-white' : 'bg-gold-dark text-white') : 'bg-white text-ink hover:bg-stone-100')}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}

export interface VerticalRow {
  key: string
  name: string
  nav_label: string
  short_description: string
  intro: string
  seo_title: string | null
  seo_description: string | null
  interest_enabled: boolean
  partner_signup_enabled: boolean
}

export function VerticalEditor({ v }: { v: VerticalRow }) {
  const { pending, run } = useRun()
  const [d, setD] = useState({ ...v, seo_title: v.seo_title ?? '', seo_description: v.seo_description ?? '' })
  const id = (n: string) => `v-${v.key}-${n}`
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault()
        run(() => saveVerticalAction(d))
      }}
    >
      <Field label="Name" htmlFor={id('name')}>
        <Input id={id('name')} value={d.name} maxLength={60} onChange={(e) => setD({ ...d, name: e.target.value })} />
      </Field>
      <Field label="Menu label" htmlFor={id('nav')}>
        <Input id={id('nav')} value={d.nav_label} maxLength={60} onChange={(e) => setD({ ...d, nav_label: e.target.value })} />
      </Field>
      <Field label="Short description (tiles and menus)" htmlFor={id('short')} className="sm:col-span-2">
        <Input id={id('short')} value={d.short_description} maxLength={200} onChange={(e) => setD({ ...d, short_description: e.target.value })} />
      </Field>
      <Field label="Intro (top of the page)" htmlFor={id('intro')} className="sm:col-span-2">
        <Textarea id={id('intro')} rows={3} value={d.intro} maxLength={1200} onChange={(e) => setD({ ...d, intro: e.target.value })} />
      </Field>
      <Field label="Search title" htmlFor={id('seot')} optional>
        <Input id={id('seot')} value={d.seo_title} maxLength={70} onChange={(e) => setD({ ...d, seo_title: e.target.value })} />
      </Field>
      <Field label="Search description" htmlFor={id('seod')} optional>
        <Input id={id('seod')} value={d.seo_description} maxLength={170} onChange={(e) => setD({ ...d, seo_description: e.target.value })} />
      </Field>
      <Checkbox id={id('int')} label="Show the “Register your interest” form" checked={d.interest_enabled} onChange={(e) => setD({ ...d, interest_enabled: e.target.checked })} />
      <Checkbox id={id('par')} label="Show the “Become a partner” form (where the page has one)" checked={d.partner_signup_enabled} onChange={(e) => setD({ ...d, partner_signup_enabled: e.target.checked })} />
      <div className="sm:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>
          Save {v.name}
        </Button>
      </div>
    </form>
  )
}

/** Status and private notes on an interest registration or partner application. */
export function LeadTool({ kind, id, status, notes, statuses }: { kind: 'interest' | 'partner'; id: string; status: string; notes: string | null; statuses: string[] }) {
  const { pending, run } = useRun()
  const [s, setS] = useState(status)
  const [n, setN] = useState(notes ?? '')
  return (
    <div className="flex min-w-56 flex-col gap-2">
      <Select aria-label="Status" value={s} onChange={(e) => setS(e.target.value)} className="h-9 text-small">
        {statuses.map((x) => (
          <option key={x} value={x}>
            {x}
          </option>
        ))}
      </Select>
      <Textarea aria-label="Private notes" rows={2} value={n} maxLength={4000} onChange={(e) => setN(e.target.value)} className="text-small" />
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => updateLeadAction(kind, id, { status: s, admin_notes: n }))}>
        Save
      </Button>
    </div>
  )
}
