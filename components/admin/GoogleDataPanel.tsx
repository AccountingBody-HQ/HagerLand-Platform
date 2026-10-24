'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { confirmWithBusinessAction, googleDetailsAction, makePrivateAndClearAction, type GoogleDetails } from '@/app/roodber8/actions/imports-compliance'
import { CONFIRM_METHODS } from '@/lib/imports/compliance'
import { Button } from '@/components/ui/Button'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Combobox } from '@/components/ui/Combobox'
import { useToast } from '@/components/ui/Toast'
import { FormAlert } from '@/components/forms/FormParts'
import { formatDate, formatPhone } from '@/lib/format'
import { GoogleMapsAttribution } from './GoogleMapsAttribution'

export interface GoogleFieldView {
  field: string
  label: string
  source: string
  sourceLabel: string
  date: string | null
  cleared: string | null
  by: string | null
}

type Result = { ok: true; data: { message: string } } | { ok: false; error: string }

/**
 * Admin "Google data" panel for a business imported from Google: where each detail came from, the 30-day deadline,
 * Google's current details shown live (never saved) and "Confirm with the business".
 */
export function GoogleDataPanel(p: {
  orgId: string
  placeId: string | null
  version: string
  stateLabel: string
  deadline: string
  urgent: boolean
  fetchedOn: string | null
  fields: GoogleFieldView[]
  publishBlock: string | null
  /** Owner, and the business is public or claimed with Google data: the two decision buttons. */
  ownerDecision: boolean
  defaultConfirmedBy: string
  today: string
}) {
  const [details, setDetails] = useState<GoogleDetails | null>(null)
  const [detailsError, setDetailsError] = useState('')
  const [confirming, setConfirming] = useState(false)
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
  return (
    <div className="space-y-4 text-small">
      <p className="text-muted">Google’s terms allow keeping only the place ID. Details from Google must be confirmed with the business (or are cleared); only what the business tells you becomes HagerLand’s own data.</p>
      <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="w-32 shrink-0 text-muted">State</dt>
          <dd className="font-semibold">{p.stateLabel}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-32 shrink-0 text-muted">Deadline</dt>
          <dd className={p.urgent ? 'font-semibold text-error' : ''}>{p.deadline}</dd>
        </div>
        {p.fetchedOn && (
          <div className="flex gap-2">
            <dt className="w-32 shrink-0 text-muted">Fetched from Google</dt>
            <dd>{formatDate(p.fetchedOn)}</dd>
          </div>
        )}
        <div className="flex min-w-0 gap-2">
          <dt className="w-32 shrink-0 text-muted">Google place ID</dt>
          <dd className="min-w-0 break-all font-mono text-caption">{p.placeId ?? 'none'}</dd>
        </div>
      </dl>
      {p.fields.length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border">
          {p.fields.map((f) => (
            <li key={f.field} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <span className="font-semibold">{f.label}</span>
              <span className={f.source === 'google_places' && !f.cleared ? 'text-gold-dark' : 'text-muted'}>
                {f.cleared ? `From Google, cleared ${formatDate(f.cleared)}` : `${f.sourceLabel}${f.date ? ` · ${formatDate(f.date)}` : ''}${f.by && f.source !== 'google_places' ? ` · ${f.by}` : ''}`}
              </span>
            </li>
          ))}
        </ul>
      )}
      {p.publishBlock && <p className="text-muted">Before publishing: {p.publishBlock}</p>}

      {p.placeId && (
        <div className="space-y-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setDetailsError('')
                const res = await googleDetailsAction(p.orgId)
                if (res.ok) setDetails(res.data)
                else setDetailsError(res.error)
              })
            }
          >
            {details ? 'Show Google’s details again' : 'Show Google’s details (live, not saved)'}
          </Button>
          {detailsError && <FormAlert>{detailsError}</FormAlert>}
          {details && (
            <section aria-label="Google’s details" className="space-y-1 rounded-md border-2 border-border-strong bg-stone-50 p-3">
              <p className="text-caption text-muted">Live from Google, not saved. Use it to find and call the business; type only what the business confirms.</p>
              <p className="font-semibold">{details.name}</p>
              {details.address && <p>{details.address}</p>}
              {details.phone && <p>{formatPhone(details.phone)}</p>}
              {details.website && <p className="break-all">{details.website}</p>}
              {details.businessStatus && details.businessStatus !== 'OPERATIONAL' && <p className="font-semibold text-error">Google says: {details.businessStatus.replace(/_/g, ' ').toLowerCase()}</p>}
              {details.mapsUrl && (
                <a href={details.mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold text-green underline">
                  Open in Google Maps
                </a>
              )}
              <GoogleMapsAttribution />
            </section>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {!confirming && (
          <Button className="sm:flex-1" onClick={() => setConfirming(true)}>
            {p.ownerDecision ? 'Confirmed with business' : 'Confirm with the business'}
          </Button>
        )}
        {p.ownerDecision && !confirming && (
          <Button
            className="sm:flex-1"
            variant="secondary"
            disabled={pending}
            onClick={() => window.confirm('Make this business private (off the public site) and clear all of its Google data? The place ID is kept.') && run(() => makePrivateAndClearAction(p.orgId))}
          >
            Make private and clear
          </Button>
        )}
      </div>
      {confirming && <ConfirmForm orgId={p.orgId} version={p.version} defaultConfirmedBy={p.defaultConfirmedBy} today={p.today} onDone={() => setConfirming(false)} />}
    </div>
  )
}

function ConfirmForm({ orgId, version, defaultConfirmedBy, today, onDone }: { orgId: string; version: string; defaultConfirmedBy: string; today: string; onDone: () => void }) {
  const [v, setV] = useState({ method: '', date: today, confirmedBy: defaultConfirmedBy, note: '', name: '', phone: '', address_line: '', website: '', description: '' })
  const [none, setNone] = useState<string[]>([])
  const [locationId, setLocationId] = useState<string | undefined>(undefined)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value })
  const hasNone = (k: string) => none.includes(k)
  const toggleNone = (k: string, on: boolean) => setNone(on ? [...none, k] : none.filter((x) => x !== k))
  const save = () =>
    start(async () => {
      setError('')
      const res = await confirmWithBusinessAction(orgId, { ...v, clear: none as ('phone' | 'address_line' | 'website' | 'description')[], location_id: locationId }, version)
      if (!res.ok) return setError(res.error)
      toast(res.data.message, 'success')
      onDone()
      router.refresh()
    })
  return (
    <div role="group" aria-label="Confirm with the business" className="space-y-3 rounded-md border border-border p-3">
      <p className="text-muted">Type what the business itself told you (do not copy from Google). Leave a box empty if they did not confirm it: that detail keeps its 30-day deadline.</p>
      {error && <FormAlert>{error}</FormAlert>}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="How you confirmed it" htmlFor="gc-method" required>
          <Select id="gc-method" value={v.method} onChange={set('method')}>
            <option value="">Choose…</option>
            {CONFIRM_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Date" htmlFor="gc-date" required>
          <Input id="gc-date" type="date" value={v.date} max={today} onChange={set('date')} />
        </Field>
        <Field label="Confirmed by" htmlFor="gc-by" required>
          <Input id="gc-by" value={v.confirmedBy} onChange={set('confirmedBy')} maxLength={120} />
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Business name" htmlFor="gc-name" hint="As the business gave it">
          <Input id="gc-name" value={v.name} onChange={set('name')} maxLength={160} />
        </Field>
        <div className="space-y-1">
          <Field label="Phone" htmlFor="gc-phone" hint="09…, 011… or +251…">
            <Input id="gc-phone" type="tel" value={v.phone} disabled={hasNone('phone')} onChange={set('phone')} maxLength={32} />
          </Field>
          <Checkbox id="gc-none-phone" label="The business has none" checked={hasNone('phone')} onChange={(e) => toggleNone('phone', e.target.checked)} />
        </div>
        <div className="space-y-1">
          <Field label="Address" htmlFor="gc-address">
            <Input id="gc-address" value={v.address_line} disabled={hasNone('address_line')} onChange={set('address_line')} maxLength={200} />
          </Field>
          <Checkbox id="gc-none-address" label="The business has none" checked={hasNone('address_line')} onChange={(e) => toggleNone('address_line', e.target.checked)} />
        </div>
        <div className="space-y-1">
          <Field label="Website" htmlFor="gc-website" hint="https://…">
            <Input id="gc-website" type="url" value={v.website} disabled={hasNone('website')} onChange={set('website')} maxLength={300} />
          </Field>
          <Checkbox id="gc-none-website" label="The business has none" checked={hasNone('website')} onChange={(e) => toggleNone('website', e.target.checked)} />
        </div>
        <Field label="Area (sub-city)" htmlFor="gc-location" hint="Where the business is, chosen by you" className="sm:col-span-2">
          <Combobox id="gc-location" endpoint="/api/locations?scope=all" placeholder="Search areas" onChange={(o) => setLocationId(o?.value)} />
        </Field>
        <div className="space-y-1 sm:col-span-2">
          <Field label="Description" htmlFor="gc-description" hint="2–3 factual sentences from what the business told you (replaces any AI text written from Google data)">
            <Textarea id="gc-description" rows={3} value={v.description} disabled={hasNone('description')} onChange={set('description')} maxLength={5000} />
          </Field>
          <Checkbox id="gc-none-description" label="Remove the description for now" checked={hasNone('description')} onChange={(e) => toggleNone('description', e.target.checked)} />
        </div>
        <Field label="Note" htmlFor="gc-note" className="sm:col-span-2">
          <Input id="gc-note" value={v.note} onChange={set('note')} maxLength={500} />
        </Field>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1" disabled={pending} onClick={save}>
          Save confirmed details
        </Button>
        <Button className="flex-1" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
