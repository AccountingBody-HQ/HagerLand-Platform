'use client'

import { useActionState } from 'react'
import { saveGuideAction } from '@/app/roodber8/actions/guides'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'
import { checkNotesMessage, GUIDE_TOPICS } from '@/lib/guides'
import { Panel } from './AdminUi'
import { NoResetForm } from '@/components/forms/NoResetForm'

export interface GuideDefaults {
  id?: string
  title?: string
  slug?: string
  topic?: string
  summary?: string
  body?: string
  faq_text?: string
  seo_title?: string | null
  seo_description?: string | null
  status?: string
  needs_review?: boolean
}

/** Guide editor (spec 25.2g). */
export function GuideForm({ defaults, checkNotes = 0 }: { defaults: GuideDefaults; checkNotes?: number }) {
  const [state, action] = useActionState(saveGuideAction, null)
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  return (
    <NoResetForm action={action} className="space-y-5" noValidate>
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      {state && !state.ok && <FormAlert>{[state.error, ...Object.values(state.fieldErrors ?? {})].join(' ')}</FormAlert>}
      {state?.ok && <FormAlert tone="success">{state.message}</FormAlert>}
      {defaults.needs_review && <FormAlert tone="info">Needs AB review: this draft was prepared for you. Check every statement before publishing.</FormAlert>}
      <Panel title="Guide">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" htmlFor="g-title" required error={errors.title} className="sm:col-span-2">
            <Input id="g-title" name="title" defaultValue={defaults.title} maxLength={160} />
          </Field>
          <Field label="Web address" htmlFor="g-slug" required hint="/guides/your-address" error={errors.slug}>
            <Input id="g-slug" name="slug" defaultValue={defaults.slug} maxLength={80} />
          </Field>
          <Field label="Topic" htmlFor="g-topic" required>
            <Select id="g-topic" name="topic" defaultValue={defaults.topic ?? 'property'}>
              {GUIDE_TOPICS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Summary" htmlFor="g-summary" required error={errors.summary} className="sm:col-span-2">
            <Textarea id="g-summary" name="summary" rows={2} maxLength={400} defaultValue={defaults.summary} />
          </Field>
          <Field label="Text" htmlFor="g-body" required hint='Start a line with "## " for a heading and "- " for a bullet. Leave a blank line between paragraphs.' error={errors.body} className="sm:col-span-2">
            <Textarea id="g-body" name="body" rows={18} defaultValue={defaults.body} className="font-mono text-small" />
          </Field>
          <Field label="Questions and answers" htmlFor="g-faq" optional hint='Write "Q: …" then "A: …" on the next line; leave a blank line between pairs. Shown at the end and as FAQ data for search engines.' className="sm:col-span-2">
            <Textarea id="g-faq" name="faq_text" rows={6} defaultValue={defaults.faq_text} />
          </Field>
        </div>
      </Panel>
      <Panel title="Search engines">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SEO title" htmlFor="g-seo-title" optional hint="Up to 70 characters. Defaults to the title." error={errors.seo_title}>
            <Input id="g-seo-title" name="seo_title" defaultValue={defaults.seo_title ?? ''} maxLength={70} />
          </Field>
          <Field label="SEO description" htmlFor="g-seo-desc" optional hint="Up to 170 characters. Defaults to the summary." error={errors.seo_description}>
            <Input id="g-seo-desc" name="seo_description" defaultValue={defaults.seo_description ?? ''} maxLength={170} />
          </Field>
        </div>
      </Panel>
      <Panel title="Publishing">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Status" htmlFor="g-status">
            <Select id="g-status" name="status" defaultValue={defaults.status ?? 'draft'}>
              <option value="draft">Draft (not public)</option>
              <option value="published">Published</option>
              <option value="archived">Archived (not public)</option>
            </Select>
          </Field>
          <label className="flex min-h-11 items-center gap-2 self-end">
            <input type="checkbox" name="reviewed" defaultChecked={defaults.needs_review === false && checkNotes === 0} disabled={checkNotes > 0} className="size-5 accent-green" /> Content checked: no unverified legal or regulatory statements
          </label>
        </div>
        {checkNotes > 0 && <p className="mt-2 text-small text-warning-dark">{checkNotesMessage(checkNotes)}</p>}
        {errors.reviewed && <p className="mt-2 text-small text-error">{errors.reviewed}</p>}
      </Panel>
      <SubmitButton size="lg" pendingText="Saving…">
        {defaults.id ? 'Save guide' : 'Create guide'}
      </SubmitButton>
    </NoResetForm>
  )
}
