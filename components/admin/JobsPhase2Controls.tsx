'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { runJobsDryRunAction, setJobsCleanupModeAction, setJobsSwitchAction, setRetentionMonthsAction } from '@/app/roodber8/actions/jobs-phase-2'
import { Button } from '@/components/ui/Button'
import { Checkbox, Field, Input, Select } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'

type Result = { ok: true; data: { message: string } } | { ok: false; error: string }

function useRun() {
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  return {
    pending,
    run: (fn: () => Promise<Result>) =>
      start(async () => {
        const res = await fn()
        toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
        if (res.ok) router.refresh()
      }),
  }
}

const LAWYER_POINTS = {
  phone_apply: 'The lawyer has confirmed the consent wording, the 18+ rule, sharing phone numbers with employers, keeping data outside Ethiopia and calling workers on the register',
  worker_register: 'The lawyer has confirmed the consent wording, the 18+ rule, sharing phone numbers with employers, keeping data outside Ethiopia and calling workers on the register',
  recruitment_desk: 'The lawyer has confirmed the points listed: consent recorded by staff after a call, sharing workers’ contact details with employers, the fee terms (VAT and licence conditions) and keeping data outside Ethiopia',
} as const

/** Owner: one website switch ("Apply by phone", the worker register or the recruitment desk). Switching on needs the lawyer tick. */
export function JobsSwitchControl({ which, on, label }: { which: 'phone_apply' | 'worker_register' | 'recruitment_desk'; on: boolean; label: string }) {
  const [confirmed, setConfirmed] = useState(false)
  const { pending, run } = useRun()
  const id = `js-${which}`
  return (
    <div className="space-y-2 rounded-md border border-border p-4">
      <p className="font-semibold">
        {label}: <span className={on ? 'text-green' : 'text-muted'}>{on ? 'On' : 'Off'}</span>
      </p>
      {!on && (
        <Checkbox
          id={`${id}-lawyer`}
          label={LAWYER_POINTS[which]}
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
      )}
      <Button size="sm" variant={on ? 'secondary' : 'primary'} disabled={pending} onClick={() => run(() => setJobsSwitchAction(which, !on, confirmed))}>
        {on ? 'Switch off' : 'Switch on'}
      </Button>
    </div>
  )
}

/** Owner: "Dry run — report only" (default) or "Live — delete personal details after 12 months". */
export function JobsCleanupModeControl({ mode }: { mode: 'dry_run' | 'live' }) {
  const [value, setValue] = useState(mode)
  const [read, setRead] = useState(false)
  const { pending, run } = useRun()
  return (
    <div className="space-y-3">
      <Field label="Deletion mode" htmlFor="jc-mode" hint="Live deletes the personal details of applications and register entries older than 12 months at the next daily run. The rows, references and counts stay.">
        <Select id="jc-mode" value={value} onChange={(e) => setValue(e.target.value === 'live' ? 'live' : 'dry_run')}>
          <option value="dry_run">Dry run — report only</option>
          <option value="live">Live — delete personal details after 12 months</option>
        </Select>
      </Field>
      {value === 'live' && mode !== 'live' && <Checkbox id="jc-read" label="I have read the latest dry run below" checked={read} onChange={(e) => setRead(e.target.checked)} />}
      <Button size="sm" variant="secondary" disabled={pending || value === mode} onClick={() => run(() => setJobsCleanupModeAction(value, read))}>
        Save mode
      </Button>
    </div>
  )
}

/** Owner: months hired people's details are kept after the guarantee or last fee entry (empty until the lawyer confirms). */
export function RetentionMonthsControl({ months }: { months: number | null }) {
  const [value, setValue] = useState(months === null ? '' : String(months))
  const [confirmed, setConfirmed] = useState(false)
  const { pending, run } = useRun()
  return (
    <div className="space-y-3">
      <Field label="Keeping period for hired people (months)" htmlFor="jr-months" hint="Counted from the end of the replacement guarantee or the last fee entry, whichever is later. Leave empty until the lawyer confirms the period: until then nothing held for a placement is deleted.">
        <Input id="jr-months" inputMode="numeric" className="max-w-40" value={value} onChange={(e) => setValue(e.target.value)} />
      </Field>
      {value.trim() !== '' && <Checkbox id="jr-lawyer" label="The lawyer has confirmed this period" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />}
      <Button size="sm" variant="secondary" disabled={pending || value.trim() === (months === null ? '' : String(months))} onClick={() => run(() => setRetentionMonthsAction(value, confirmed))}>
        Save keeping period
      </Button>
    </div>
  )
}

export function JobsDryRunButton() {
  const { pending, run } = useRun()
  return (
    <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(runJobsDryRunAction)}>
      Run a dry run now
    </Button>
  )
}
