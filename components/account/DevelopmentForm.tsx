'use client'

import { useState, useTransition } from 'react'
import { useFormState } from 'react-dom'
import { useRouter } from 'next/navigation'
import { FileCheck2, Plus, Trash2 } from 'lucide-react'
import { saveDevelopmentAction, submitDevelopmentAction } from '@/app/(account)/account/developments/actions'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Combobox, type ComboOption } from '@/components/ui/Combobox'
import { Button } from '@/components/ui/Button'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'
import { FileDrop } from '@/components/media/FileDrop'
import { useToast } from '@/components/ui/Toast'
import { COMPLETION, FINISHING, TENURE } from '@/lib/labels'
import type { UnitType } from '@/lib/data/developments'

export interface DevelopmentDefaults {
  id?: string
  status?: string
  name?: string
  kind?: string
  summary?: string | null
  description?: string | null
  location?: ComboOption | null
  address_line?: string | null
  completion_status?: string | null
  expected_completion?: string | null
  completed_year?: number | null
  total_units?: number | null
  floors_label?: string | null
  price_from_etb?: number | null
  price_to_etb?: number | null
  payment_plan?: string | null
  amenities?: string[]
  finishing_status?: string | null
  tenure?: string | null
  video_url?: string | null
  unit_types?: UnitType[]
  brochure_path?: string | null
}

const n = (v: string): number | null => (v.trim() === '' ? null : Number(v.replace(/[,\s]/g, '')))

export function DevelopmentForm({
  defaults,
  action = saveDevelopmentAction,
  developerOptions,
  currentDeveloper,
}: {
  defaults: DevelopmentDefaults
  action?: typeof saveDevelopmentAction
  /** Admin only: choose the developer (or HagerLand Developments). */
  developerOptions?: { id: string; label: string }[]
  currentDeveloper?: string | null
}) {
  const [state, formAction] = useFormState(action, null)
  const [units, setUnits] = useState<UnitType[]>(defaults.unit_types ?? [])
  const [brochure, setBrochure] = useState<string | null>(defaults.brochure_path ?? null)
  const [pending, start] = useTransition()
  const router = useRouter()
  const toast = useToast()
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  const v = (x: number | null | undefined) => (x === null || x === undefined ? '' : String(x))

  return (
    <form action={formAction} className="space-y-8" noValidate>
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      <input type="hidden" name="unit_types" value={JSON.stringify(units.filter((u) => u.type.trim()))} />
      <input type="hidden" name="brochure_path" value={brochure ?? ''} />
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      {state?.ok && state.message && <FormAlert tone="success">{state.message}</FormAlert>}

      <fieldset className="space-y-5">
        <legend className="hl-h3 mb-4">The development</legend>
        {developerOptions && (
          <Field label="Developer" htmlFor="dv-dev" hint="Choose HagerLand Developments for our own projects.">
            <Select id="dv-dev" name="developer_org_id" defaultValue={currentDeveloper ?? ''}>
              <option value="">Unknown developer</option>
              {developerOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" htmlFor="dv-name" error={errors.name} required>
            <Input id="dv-name" name="name" defaultValue={defaults.name} />
          </Field>
          <Field label="Type" htmlFor="dv-kind">
            <Select id="dv-kind" name="kind" defaultValue={defaults.kind ?? 'development'}>
              <option value="development">Development</option>
              <option value="condominium_site">Condominium site</option>
              <option value="building">Building</option>
              <option value="compound">Compound</option>
              <option value="mixed_use_project">Mixed-use project</option>
            </Select>
          </Field>
        </div>
        <Field label="Summary" htmlFor="dv-summary" optional hint="One or two sentences shown on cards.">
          <Input id="dv-summary" name="summary" defaultValue={defaults.summary ?? ''} maxLength={300} />
        </Field>
        <Field label="Description" htmlFor="dv-desc" optional>
          <Textarea id="dv-desc" name="description" defaultValue={defaults.description ?? ''} rows={7} maxLength={8000} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Location" htmlFor="dv-loc" error={errors.location_id} required>
            <Combobox id="dv-loc" name="location_id" endpoint="/api/locations" defaultValue={defaults.location} invalid={Boolean(errors.location_id)} />
          </Field>
          <Field label="Address or landmark" htmlFor="dv-addr" optional>
            <Input id="dv-addr" name="address_line" defaultValue={defaults.address_line ?? ''} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="hl-h3 mb-4">Status and size</legend>
        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="Status" htmlFor="dv-comp">
            <Select id="dv-comp" name="completion_status" defaultValue={defaults.completion_status ?? ''}>
              <option value="">Choose</option>
              {COMPLETION.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Expected completion" htmlFor="dv-exp" optional error={errors.expected_completion}>
            <Input id="dv-exp" name="expected_completion" type="date" defaultValue={defaults.expected_completion ?? ''} />
          </Field>
          <Field label="Year completed" htmlFor="dv-cy" optional>
            <Input id="dv-cy" name="completed_year" inputMode="numeric" defaultValue={v(defaults.completed_year)} />
          </Field>
          <Field label="Building height" htmlFor="dv-floors" optional error={errors.floors_label}>
            <Input id="dv-floors" name="floors_label" defaultValue={defaults.floors_label ?? ''} placeholder="G+12" />
          </Field>
          <Field label="Total units" htmlFor="dv-units" optional>
            <Input id="dv-units" name="total_units" inputMode="numeric" defaultValue={v(defaults.total_units)} />
          </Field>
          <Field label="Finishing" htmlFor="dv-fin">
            <Select id="dv-fin" name="finishing_status" defaultValue={defaults.finishing_status ?? ''}>
              <option value="">Choose</option>
              {FINISHING.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tenure" htmlFor="dv-ten">
            <Select id="dv-ten" name="tenure" defaultValue={defaults.tenure ?? ''}>
              <option value="">Choose</option>
              {TENURE.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="hl-h3 mb-4">Prices and payment</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Prices from (ETB)" htmlFor="dv-pf" optional>
            <Input id="dv-pf" name="price_from_etb" inputMode="numeric" defaultValue={v(defaults.price_from_etb)} />
          </Field>
          <Field label="Prices up to (ETB)" htmlFor="dv-pt" optional>
            <Input id="dv-pt" name="price_to_etb" inputMode="numeric" defaultValue={v(defaults.price_to_etb)} />
          </Field>
        </div>
        <Field label="Payment plan" htmlFor="dv-pay" optional hint="e.g. 30% on contract, 40% during construction, 30% on handover.">
          <Textarea id="dv-pay" name="payment_plan" defaultValue={defaults.payment_plan ?? ''} rows={3} maxLength={2000} />
        </Field>
        <div>
          <p className="mb-2 text-small font-semibold">Unit types</p>
          <ul className="space-y-2">
            {units.map((u, i) => (
              <li key={i} className="grid grid-cols-2 gap-2 rounded-md border border-border p-3 sm:grid-cols-[1.4fr_0.6fr_0.8fr_0.8fr_1fr_auto]">
                <Input aria-label="Unit type" placeholder="e.g. 2-bed apartment" value={u.type} onChange={(e) => setUnits(units.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)))} />
                <Input aria-label="Bedrooms" placeholder="Beds" inputMode="numeric" value={u.beds ?? ''} onChange={(e) => setUnits(units.map((x, j) => (j === i ? { ...x, beds: n(e.target.value) } : x)))} />
                <Input aria-label="Smallest size m²" placeholder="Min m²" inputMode="decimal" value={u.area_min ?? ''} onChange={(e) => setUnits(units.map((x, j) => (j === i ? { ...x, area_min: n(e.target.value) } : x)))} />
                <Input aria-label="Largest size m²" placeholder="Max m²" inputMode="decimal" value={u.area_max ?? ''} onChange={(e) => setUnits(units.map((x, j) => (j === i ? { ...x, area_max: n(e.target.value) } : x)))} />
                <Input aria-label="Price from ETB" placeholder="From ETB" inputMode="numeric" value={u.price_from_etb ?? ''} onChange={(e) => setUnits(units.map((x, j) => (j === i ? { ...x, price_from_etb: n(e.target.value) } : x)))} />
                <button type="button" aria-label="Remove unit type" onClick={() => setUnits(units.filter((_x, j) => j !== i))} className="inline-flex size-11 items-center justify-center rounded-md text-error hover:bg-error/10">
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setUnits([...units, { type: '' }])}>
            <Plus /> Add unit type
          </Button>
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="hl-h3 mb-4">Extras</legend>
        <Field label="Amenities" htmlFor="dv-amen" optional hint="Separate with commas, e.g. Lift, Generator, Gym, Parking">
          <Input id="dv-amen" name="amenities" defaultValue={(defaults.amenities ?? []).join(', ')} />
        </Field>
        <Field label="Video (YouTube link)" htmlFor="dv-video" optional error={errors.video_url}>
          <Input id="dv-video" name="video_url" type="url" defaultValue={defaults.video_url ?? ''} />
        </Field>
        {defaults.id && (
          <div>
            <p className="mb-2 text-small font-semibold">Brochure (PDF)</p>
            {brochure ? (
              <p className="flex min-h-11 items-center gap-2 rounded-md bg-green-tint px-3 text-small">
                <FileCheck2 className="size-4 text-green" aria-hidden /> Brochure uploaded
                <button type="button" className="ml-auto font-semibold text-green underline" onClick={() => setBrochure(null)}>
                  Replace
                </button>
              </p>
            ) : (
              <FileDrop target={{ purpose: 'private', area: 'brochure', id: defaults.id }} accept="application/pdf" multiple={false} label="Upload brochure" hint="PDF, up to 15 MB" onDocUploaded={(d) => setBrochure(d.path)} />
            )}
          </div>
        )}
      </fieldset>

      <div className="flex flex-col gap-3 sm:flex-row">
        <SubmitButton size="lg" pendingText="Saving…">
          {defaults.id ? 'Save' : 'Create development'}
        </SubmitButton>
        {defaults.id && (defaults.status === 'draft' || defaults.status === 'rejected') && (
          <Button
            size="lg"
            variant="secondary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await submitDevelopmentAction(defaults.id as string)
                toast(res.ok ? res.message ?? 'Submitted.' : res.error, res.ok ? 'success' : 'error')
                router.refresh()
              })
            }
          >
            Submit for review
          </Button>
        )}
      </div>
    </form>
  )
}
