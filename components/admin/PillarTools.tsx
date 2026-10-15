'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { savePillarAction, setPillarModeAction, type GateInput } from '@/app/roodber8/actions/pillars'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Checkbox, Field, Input, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'

type Result = { ok: true; data: { message: string } } | { ok: false; error: string }
type Mode = 'direct' | 'aggregate' | 'interest'

const MODE_NAMES: Record<Mode, { name: string; customer: string }> = {
  direct: { name: 'Direct', customer: 'Provided by HagerLand' },
  aggregate: { name: 'Aggregate', customer: 'Trusted partners' },
  interest: { name: 'Interest capture', customer: 'Register your interest' },
}

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

/**
 * One mode switch (spec 26.3). Turning Direct or Aggregate on opens the stage-gate checklist; turning anything off
 * is immediate.
 */
export function ModeSwitch({
  pillar,
  service,
  mode,
  on,
  label,
  providersActive,
  providersRequired,
  regulatoryNote,
  ownerDefault,
}: {
  pillar: string
  service: string | null
  mode: Mode
  on: boolean
  label: string
  providersActive: number
  providersRequired: number
  regulatoryNote: string
  ownerDefault: string
}) {
  const { pending, run } = useRun()
  const [open, setOpen] = useState(false)
  const [g, setG] = useState<GateInput>({
    capability_confirmed: false as unknown as true,
    owner_name: ownerDefault,
    regulatory_confirmed: true,
    regulatory_note: regulatoryNote,
    regulatory_date: '2026-10-15',
    terms_pricing_set: false,
    terms_note: '',
  })
  const id = (n: string) => `gate-${pillar}-${service ?? 'p'}-${mode}-${n}`
  const short = mode === 'aggregate' && providersActive < providersRequired
  const toggle = () => {
    if (on || mode === 'interest') run(() => setPillarModeAction({ pillar, service, mode, on: !on }, null))
    else setOpen(true)
  }
  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`${MODE_NAMES[mode].name} for ${label}`}
        disabled={pending}
        onClick={toggle}
        className={cn('flex min-h-11 w-full items-center justify-between gap-3 rounded-md border px-3 text-left text-small', on ? 'border-green bg-green-tint' : 'border-border-strong bg-white')}
      >
        <span>
          <span className="block font-semibold text-ink">{MODE_NAMES[mode].name}</span>
          <span className="block text-caption text-muted">Shown as “{MODE_NAMES[mode].customer}”</span>
        </span>
        <span className={cn('rounded-full px-2 py-0.5 text-caption font-bold', on ? 'bg-green text-white' : 'bg-stone-200 text-ink')}>{on ? 'On' : 'Off'}</span>
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Stage gate: switch ${MODE_NAMES[mode].name} on for ${label}`}
        footer={
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="flex-1" disabled={pending || short} onClick={() => run(() => setPillarModeAction({ pillar, service, mode, on: true }, g), () => setOpen(false))}>
              Switch on
            </Button>
          </div>
        }
      >
        <div className="space-y-4 text-small">
          <p className="text-muted">Answer each point. Your answers, your name and the time are recorded in the audit log.</p>
          <Checkbox
            id={id('cap')}
            label={mode === 'direct' ? 'HagerLand has the people and capacity to deliver this itself' : 'Vetted providers or partners can deliver this'}
            checked={g.capability_confirmed === true}
            onChange={(e) => setG({ ...g, capability_confirmed: e.target.checked as true })}
          />
          <Field label="Named owner (responsible person)" htmlFor={id('owner')}>
            <Input id={id('owner')} value={g.owner_name} maxLength={120} onChange={(e) => setG({ ...g, owner_name: e.target.value })} />
          </Field>
          {mode === 'aggregate' && (
            <p className={cn('rounded-md p-3', short ? 'bg-gold-soft text-ink' : 'bg-green-tint text-ink')} role="status">
              Verified, live providers or partners for this pillar: <strong>{providersActive}</strong> (needed: {providersRequired}).
              {short && ' Add and verify more before switching Aggregate on.'}
            </p>
          )}
          <Checkbox id={id('reg')} label="Regulatory clearance confirmed" checked={g.regulatory_confirmed === true} onChange={(e) => setG({ ...g, regulatory_confirmed: e.target.checked as true })} />
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Field label="Clearance note" htmlFor={id('regnote')}>
              <Input id={id('regnote')} value={g.regulatory_note} maxLength={500} onChange={(e) => setG({ ...g, regulatory_note: e.target.value })} />
            </Field>
            <Field label="Date" htmlFor={id('regdate')}>
              <Input id={id('regdate')} type="date" value={g.regulatory_date} onChange={(e) => setG({ ...g, regulatory_date: e.target.value })} />
            </Field>
          </div>
          <Checkbox id={id('terms')} label="Terms and pricing are set (where they apply)" checked={g.terms_pricing_set} onChange={(e) => setG({ ...g, terms_pricing_set: e.target.checked })} />
          <Field label="Terms and pricing note" htmlFor={id('termsnote')} optional>
            <Textarea id={id('termsnote')} rows={2} maxLength={500} value={g.terms_note} onChange={(e) => setG({ ...g, terms_note: e.target.value })} />
          </Field>
        </div>
      </Dialog>
    </>
  )
}

export interface PillarRow {
  key: string
  name: string
  nav_label: string
  tagline: string
  description: string
  direct_owner: string | null
  seo_title: string | null
  seo_description: string | null
}

export function PillarEditor({ p }: { p: PillarRow }) {
  const { pending, run } = useRun()
  const [d, setD] = useState({ ...p, direct_owner: p.direct_owner ?? '', seo_title: p.seo_title ?? '', seo_description: p.seo_description ?? '' })
  const id = (n: string) => `p-${p.key}-${n}`
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault()
        run(() => savePillarAction({ ...d, key: p.key as 'buy' }))
      }}
    >
      <Field label="Name" htmlFor={id('name')}>
        <Input id={id('name')} value={d.name} maxLength={60} onChange={(e) => setD({ ...d, name: e.target.value })} />
      </Field>
      <Field label="Menu label" htmlFor={id('nav')}>
        <Input id={id('nav')} value={d.nav_label} maxLength={40} onChange={(e) => setD({ ...d, nav_label: e.target.value })} />
      </Field>
      <Field label="One line (ecosystem diagram)" htmlFor={id('tag')}>
        <Input id={id('tag')} value={d.tagline} maxLength={120} onChange={(e) => setD({ ...d, tagline: e.target.value })} />
      </Field>
      <Field label="Direct owner (shown to admin only)" htmlFor={id('owner')} optional>
        <Input id={id('owner')} value={d.direct_owner} maxLength={120} onChange={(e) => setD({ ...d, direct_owner: e.target.value })} />
      </Field>
      <Field label="What this pillar does (top of its page)" htmlFor={id('desc')} className="sm:col-span-2">
        <Textarea id={id('desc')} rows={3} value={d.description} maxLength={1200} onChange={(e) => setD({ ...d, description: e.target.value })} />
      </Field>
      <Field label="Search title" htmlFor={id('seot')} optional>
        <Input id={id('seot')} value={d.seo_title} maxLength={70} onChange={(e) => setD({ ...d, seo_title: e.target.value })} />
      </Field>
      <Field label="Search description" htmlFor={id('seod')} optional>
        <Input id={id('seod')} value={d.seo_description} maxLength={170} onChange={(e) => setD({ ...d, seo_description: e.target.value })} />
      </Field>
      <div className="sm:col-span-2">
        <Button type="submit" size="sm" disabled={pending}>
          Save {p.name}
        </Button>
      </div>
    </form>
  )
}
