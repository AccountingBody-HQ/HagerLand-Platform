'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition, type ReactNode } from 'react'
import { addAgencyNoteAction, addAgencyTaskAction, attachAgencyDocumentAction, completeAgencyTaskAction, emailMatchesAction, setRequirementActiveAction, setValuationReportAction, toggleProgressItemAction } from '@/app/roodber8/actions/agency'
import { ActionForm } from '@/components/forms/ActionForm'
import { FileDrop } from '@/components/media/FileDrop'
import { Button } from '@/components/ui/Button'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'

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

export function RunButton({ label, fn, variant = 'secondary' }: { label: ReactNode; fn: () => Promise<Result>; variant?: 'primary' | 'secondary' | 'ghost' }) {
  const { pending, run } = useRun()
  return (
    <Button type="button" size="sm" variant={variant} disabled={pending} onClick={() => run(fn)}>
      {label}
    </Button>
  )
}

export function NoteForm({ entity, id }: { entity: string; id: string }) {
  return (
    <ActionForm action={addAgencyNoteAction.bind(null, entity, id)} submitLabel="Add note" className="grid gap-3">
      <Textarea aria-label="Note" name="text" rows={2} maxLength={2000} />
    </ActionForm>
  )
}

export function TaskForm({ entity, id }: { entity: string; id: string }) {
  return (
    <ActionForm action={addAgencyTaskAction.bind(null, entity, id)} submitLabel="Add task" className="grid gap-3">
      <Field label="Task" htmlFor={`task-${id}`}>
        <Input id={`task-${id}`} name="title" maxLength={200} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Due" htmlFor={`task-due-${id}`} optional>
          <Input id={`task-due-${id}`} name="due_on" type="date" />
        </Field>
        <Field label="For" htmlFor={`task-for-${id}`} optional>
          <Input id={`task-for-${id}`} name="assigned_to" maxLength={120} />
        </Field>
      </div>
    </ActionForm>
  )
}

export function TaskDone({ id }: { id: string }) {
  return <RunButton label="Done" fn={() => completeAgencyTaskAction(id)} variant="ghost" />
}

/** Uploads a private document (agency area) and links it to the record. */
export function DocumentUpload({ entity, id, folder }: { entity: string; id: string; folder: string }) {
  const { run } = useRun()
  const [label, setLabel] = useState('')
  return (
    <div className="space-y-3">
      <Field label="Document name" htmlFor={`doc-label-${id}`} hint="For example: Signed agency agreement">
        <Input id={`doc-label-${id}`} value={label} maxLength={160} onChange={(e) => setLabel(e.target.value)} />
      </Field>
      <FileDrop
        target={{ purpose: 'private', area: 'agency', id: folder }}
        accept="application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        maxFiles={1}
        disabled={label.trim().length < 2}
        label="Upload a document"
        hint="Private: only HagerLand staff can open it, through a 10-minute link."
        onDocUploaded={(d) => run(() => attachAgencyDocumentAction(entity, id, d.path, label.trim()))}
      />
    </div>
  )
}

export function ReportUpload({ id, folder }: { id: string; folder: string }) {
  const { run } = useRun()
  return <FileDrop target={{ purpose: 'private', area: 'agency', id: folder }} accept="application/pdf" maxFiles={1} label="Upload the valuation report (PDF)" onDocUploaded={(d) => run(() => setValuationReportAction(id, d.path))} />
}

export function ProgressItem({ id, label, done: initial }: { id: string; label: string; done: boolean }) {
  const { pending, run } = useRun()
  const [done, setDone] = useState(initial)
  return (
    <label className="flex min-h-11 items-start gap-3 text-small">
      <input
        type="checkbox"
        className="mt-1 size-5 accent-green"
        checked={done}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked
          setDone(next)
          run(() => toggleProgressItemAction(id, next))
        }}
      />
      <span className={done ? 'text-muted line-through' : 'text-ink'}>{label}</span>
    </label>
  )
}

export function RequirementTools({ id, active, canEmail }: { id: string; active: boolean; canEmail: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {canEmail && <RunButton label="Email matches" fn={() => emailMatchesAction(id)} variant="primary" />}
      <RunButton label={active ? 'Pause' : 'Switch on'} fn={() => setRequirementActiveAction(id, !active)} />
    </div>
  )
}
