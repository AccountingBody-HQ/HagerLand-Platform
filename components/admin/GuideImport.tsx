'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { checkGuideJsonAction, importGuideJsonAction } from '@/app/roodber8/actions/guide-studio'
import type { GuideJsonCheck } from '@/lib/guides/studio-import'
import { Button } from '@/components/ui/Button'
import { Field, Textarea } from '@/components/ui/Field'
import { FormAlert } from '@/components/forms/FormParts'
import { GuideArticle } from '@/components/guides/GuideArticle'
import { Panel } from './AdminUi'

/** Guide studio import: validate the JSON from Claude, preview it, then import it as a draft marked "Needs AB review". */
export function GuideImport() {
  const [raw, setRaw] = useState('')
  const [check, setCheck] = useState<GuideJsonCheck | null>(null)
  const [error, setError] = useState('')
  const [anyway, setAnyway] = useState(false)
  const [imported, setImported] = useState<{ id: string; message: string } | null>(null)
  const [pending, start] = useTransition()

  function validate() {
    setError('')
    setImported(null)
    start(async () => {
      const res = await checkGuideJsonAction(raw)
      if (res.ok) setCheck(res.data)
      else setError(res.error)
    })
  }

  function runImport() {
    setError('')
    start(async () => {
      const res = await importGuideJsonAction(raw, anyway)
      if (res.ok) {
        setImported({ id: res.data.id, message: res.message ?? 'Imported.' })
        setCheck(null)
        setRaw('')
        setAnyway(false)
      } else setError(res.error)
    })
  }

  const canImport = Boolean(check?.ok && check.guide && (!check.duplicateTitle || anyway))

  return (
    <div className="space-y-5">
      {imported && (
        <FormAlert tone="success">
          {imported.message}{' '}
          <Link href={`/roodber8/guides/${imported.id}`} className="font-semibold underline">
            Open the guide to review it
          </Link>
        </FormAlert>
      )}
      <Panel title="Paste the JSON from Claude">
        <div className="space-y-4">
          <Field label="Guide JSON" htmlFor="gi-json" hint="Code fences (```) and any text around the JSON are removed automatically.">
            <Textarea
              id="gi-json"
              value={raw}
              onChange={(e) => {
                setRaw(e.target.value)
                setCheck(null)
                setAnyway(false)
              }}
              rows={14}
              className="font-mono text-small"
            />
          </Field>
          {error && <FormAlert>{error}</FormAlert>}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={validate} variant="secondary" size="lg" loading={pending} disabled={!raw.trim()} className="flex-1">
              Validate
            </Button>
            <Button onClick={runImport} size="lg" loading={pending} disabled={!canImport} className="flex-1">
              Import as draft
            </Button>
          </div>
          <p className="text-small text-muted">Imported guides are drafts marked “Needs AB review”. Nothing is published.</p>
        </div>
      </Panel>

      {check && (
        <Panel title="Check result">
          <div className="space-y-4">
            {check.ok ? <FormAlert tone="success">The JSON is valid and ready to import.</FormAlert> : <FormAlert>Fix these before importing:</FormAlert>}
            {check.errors.length > 0 && (
              <ul className="list-disc space-y-1 pl-6 text-small text-error">
                {check.errors.map((e, i) => (
                  <li key={i}>
                    <strong>{e.field}:</strong> {e.message}
                  </li>
                ))}
              </ul>
            )}
            {check.slugChanged && check.guide && <FormAlert tone="info">That web address is taken, so this guide will use /guides/{check.guide.slug}.</FormAlert>}
            {check.notes.length > 0 && (
              <div>
                <p className="text-small font-semibold">Changes made automatically</p>
                <ul className="mt-1 list-disc space-y-1 pl-6 text-small text-muted">
                  {check.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
            )}
            {check.duplicateTitle && (
              <div className="rounded-md border border-gold/40 bg-gold-soft px-4 py-3 text-small text-ink">
                <p>A guide called “{check.duplicateTitle}” already exists.</p>
                <label className="mt-2 flex min-h-11 items-center gap-2">
                  <input type="checkbox" checked={anyway} onChange={(e) => setAnyway(e.target.checked)} className="size-5 accent-green" /> Import anyway
                </label>
              </div>
            )}
            {check.ok && (
              <div className="rounded-md border border-gold/40 bg-gold-soft px-4 py-3 text-small text-ink">
                <p className="font-semibold">
                  {check.markers.length === 1 ? '1 CHECK note' : `${check.markers.length} CHECK notes`} to resolve before this guide can be published
                </p>
                {check.markers.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-6">
                    {check.markers.map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </Panel>
      )}

      {check?.guide && (
        <Panel title="Preview (as visitors will see it once published)">
          <div className="max-w-3xl">
            <GuideArticle guide={{ ...check.guide, updated_at: new Date().toISOString() }} faq={check.guide.faq} />
          </div>
        </Panel>
      )}
    </div>
  )
}
