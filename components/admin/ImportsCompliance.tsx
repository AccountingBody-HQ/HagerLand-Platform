'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { makePrivateAndClearAction, runDryRunAction, setCleanupModeAction } from '@/app/roodber8/actions/imports-compliance'
import { Button } from '@/components/ui/Button'
import { Checkbox, Field, Select } from '@/components/ui/Field'
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

/** Owner: "Dry run — report only" (default) or "Live — clear expired Google data". */
export function CleanupModeControl({ mode }: { mode: 'dry_run' | 'live' }) {
  const [value, setValue] = useState(mode)
  const [read, setRead] = useState(false)
  const { pending, run } = useRun()
  return (
    <div className="space-y-3">
      <Field label="Imports clean-up mode" htmlFor="ic-mode" hint="Live clears expired Google data of private businesses at the next daily run. Public businesses are never cleared automatically.">
        <Select id="ic-mode" value={value} onChange={(e) => setValue(e.target.value === 'live' ? 'live' : 'dry_run')}>
          <option value="dry_run">Dry run — report only</option>
          <option value="live">Live — clear expired Google data</option>
        </Select>
      </Field>
      {value === 'live' && mode !== 'live' && <Checkbox id="ic-read" label="I have read the dry-run list below, including “Public — needs your decision”" checked={read} onChange={(e) => setRead(e.target.checked)} />}
      <Button size="sm" variant="secondary" disabled={pending || value === mode} onClick={() => run(() => setCleanupModeAction(value, read))}>
        Save mode
      </Button>
    </div>
  )
}

export function DryRunButton() {
  const { pending, run } = useRun()
  return (
    <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(runDryRunAction)}>
      Run a dry run now
    </Button>
  )
}

/** Owner decision for a public (or claimed) business with Google data. */
export function MakePrivateButton({ orgId }: { orgId: string }) {
  const { pending, run } = useRun()
  return (
    <button
      type="button"
      className="inline-flex min-h-11 items-center font-semibold text-error"
      disabled={pending}
      onClick={() => window.confirm('Make this business private (off the public site) and clear all of its Google data? The place ID is kept.') && run(() => makePrivateAndClearAction(orgId))}
    >
      Make private and clear
    </button>
  )
}
