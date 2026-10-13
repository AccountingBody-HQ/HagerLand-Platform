'use client'

import { useState, type ReactNode } from 'react'
import { useFormState } from 'react-dom'
import { Plus, Trash2 } from 'lucide-react'
import { saveSettingsAction } from '../actions/settings'
import type { SettingsSection } from '@/lib/validation/settings'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'

export interface FieldSpec {
  name: string
  label: string
  value: string
  hint?: string
  type?: 'text' | 'email' | 'url' | 'number' | 'date' | 'checkbox' | 'textarea'
  placeholder?: string
}

/** One settings section: a list of fields saved together. */
export function SettingsForm({ section, fields, children, submitLabel = 'Save' }: { section: SettingsSection; fields: FieldSpec[]; children?: ReactNode; submitLabel?: string }) {
  const [state, action] = useFormState(saveSettingsAction.bind(null, section), null)
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  return (
    <form action={action} className="space-y-4" noValidate>
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      {state?.ok && <FormAlert tone="success">{state.data.message}</FormAlert>}
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => {
          const id = `set-${section}-${f.name}`
          if (f.type === 'checkbox')
            return (
              <label key={f.name} className="flex min-h-11 items-start gap-2 text-small sm:col-span-2">
                <input type="checkbox" name={f.name} value="true" defaultChecked={f.value === 'true'} className="mt-0.5 size-5 accent-green" />
                <span>
                  <span className="font-semibold text-ink">{f.label}</span>
                  {f.hint && <span className="block text-muted">{f.hint}</span>}
                </span>
              </label>
            )
          return (
            <Field key={f.name} label={f.label} htmlFor={id} hint={f.hint} error={errors[f.name]} className={f.type === 'textarea' ? 'sm:col-span-2' : undefined}>
              {f.type === 'textarea' ? (
                <Textarea id={id} name={f.name} defaultValue={f.value} rows={4} placeholder={f.placeholder} invalid={Boolean(errors[f.name])} />
              ) : (
                <Input id={id} name={f.name} type={f.type === 'number' ? 'text' : f.type ?? 'text'} inputMode={f.type === 'number' ? 'numeric' : undefined} defaultValue={f.value} placeholder={f.placeholder} invalid={Boolean(errors[f.name])} />
              )}
            </Field>
          )
        })}
      </div>
      {children}
      <SubmitButton size="sm" pendingText="Saving…">
        {submitLabel}
      </SubmitButton>
    </form>
  )
}

/** Editable list of "Why buy from HagerLand" points (title + short text). */
export function ClaimsEditor({ initial }: { initial: { title: string; text: string }[] }) {
  const [rows, setRows] = useState(initial.length ? initial : [])
  return (
    <fieldset className="space-y-3">
      <legend className="text-small font-semibold text-ink">“Why buy from HagerLand Developments” points</legend>
      <p className="text-caption text-muted">Shown on the HagerLand Developments page only when at least one point is filled in. Only write things you can stand behind.</p>
      {rows.map((r, i) => (
        <div key={i} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_2fr_auto]">
          <Input aria-label={`Point ${i + 1} title`} name={`claim_title_${i}`} defaultValue={r.title} placeholder="Title, e.g. Fixed handover dates" maxLength={80} />
          <Input aria-label={`Point ${i + 1} text`} name={`claim_text_${i}`} defaultValue={r.text} placeholder="One sentence" maxLength={400} />
          <button type="button" aria-label={`Remove point ${i + 1}`} onClick={() => setRows(rows.filter((_r, j) => j !== i))} className="inline-flex size-11 items-center justify-center rounded-md text-error hover:bg-error/10">
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      {rows.length < 8 && (
        <Button size="sm" variant="ghost" onClick={() => setRows([...rows, { title: '', text: '' }])}>
          <Plus /> Add a point
        </Button>
      )}
    </fieldset>
  )
}
