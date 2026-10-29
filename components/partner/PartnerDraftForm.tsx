'use client'

import { useActionState, useRef, useState } from 'react'
import { savePartnerDraftAction } from '@/app/actions/partner-portal-actions'
import { Field, Input, Select, Textarea, describedBy } from '@/components/ui/Field'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'
import { NoResetForm } from '@/components/forms/NoResetForm'
import { FileDrop } from '@/components/media/FileDrop'
import { UNITS } from '@/lib/units'
import { PORTAL_TEXT } from '@/lib/supply/partner-rules'

export interface DraftDefaults {
  name?: string
  brand_name?: string | null
  category_id?: string | null
  unit?: string
  pack_size?: string | null
  description?: string | null
  specs?: string
  partner_sku?: string | null
  proposed_price_cents?: number | null
  stock_note?: string | null
  lead_time_days?: number | null
  min_order_qty?: number | null
  updated_at?: string
}

/** S6-1 partner portal: one product draft (AB's approved labels). Photos go to the draft's private folder. */
export function PartnerDraftForm({
  draftId,
  defaults,
  categories,
  photos,
}: {
  draftId: string
  defaults: DraftDefaults
  categories: { id: string; name: string }[]
  photos: { path: string; url: string | null }[]
}) {
  const [state, action] = useActionState(savePartnerDraftAction, null)
  const [paths, setPaths] = useState<string[]>(photos.map((p) => p.path))
  const [added, setAdded] = useState<string[]>([])
  // Which button was tapped: set on the hidden field before the form is sent (NoResetForm does not pass the button on).
  const intent = useRef<HTMLInputElement>(null)
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {}
  const v = (x: string | number | null | undefined) => (x === null || x === undefined ? '' : String(x))
  return (
    <NoResetForm action={action} className="space-y-5" noValidate>
      <input type="hidden" name="id" value={draftId} />
      <input ref={intent} type="hidden" name="intent" defaultValue="save" />
      {defaults.updated_at && <input type="hidden" name="expected_updated_at" value={defaults.updated_at} />}
      {paths.map((p) => (
        <input key={p} type="hidden" name="photo_paths" value={p} />
      ))}
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      <Field label="Product name" htmlFor="pd-name" error={errors.name} required>
        <Input id="pd-name" name="name" defaultValue={v(defaults.name)} invalid={Boolean(errors.name)} aria-describedby={describedBy('pd-name', errors.name)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Brand (as printed on the product)" htmlFor="pd-brand" error={errors.brand_name}>
          <Input id="pd-brand" name="brand_name" defaultValue={v(defaults.brand_name)} invalid={Boolean(errors.brand_name)} />
        </Field>
        <Field label="Category" htmlFor="pd-cat" error={errors.category_id}>
          <Select id="pd-cat" name="category_id" defaultValue={v(defaults.category_id)} invalid={Boolean(errors.category_id)}>
            <option value="" />
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Unit" htmlFor="pd-unit" error={errors.unit}>
          <Select id="pd-unit" name="unit" defaultValue={defaults.unit ?? 'piece'}>
            {UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Pack size" htmlFor="pd-pack" error={errors.pack_size}>
          <Input id="pd-pack" name="pack_size" defaultValue={v(defaults.pack_size)} invalid={Boolean(errors.pack_size)} />
        </Field>
      </div>
      <Field label="Description" htmlFor="pd-desc" error={errors.description}>
        <Textarea id="pd-desc" name="description" rows={4} maxLength={8000} defaultValue={v(defaults.description)} invalid={Boolean(errors.description)} />
      </Field>
      <Field label="Specifications" htmlFor="pd-specs" error={errors.specs}>
        <Textarea id="pd-specs" name="specs" rows={4} maxLength={6000} defaultValue={v(defaults.specs)} invalid={Boolean(errors.specs)} />
      </Field>
      <p className="rounded-md bg-stone-50 p-3 text-small text-muted">{PORTAL_TEXT.note}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your product code (private)" htmlFor="pd-sku" error={errors.partner_sku}>
          <Input id="pd-sku" name="partner_sku" defaultValue={v(defaults.partner_sku)} invalid={Boolean(errors.partner_sku)} />
        </Field>
        <Field label="Your price to HagerLand in ETB (private)" htmlFor="pd-price" error={errors.proposed_price}>
          <Input id="pd-price" name="proposed_price" inputMode="decimal" defaultValue={defaults.proposed_price_cents ? (defaults.proposed_price_cents / 100).toFixed(2) : ''} invalid={Boolean(errors.proposed_price)} />
        </Field>
        <Field label="Typical lead time in days" htmlFor="pd-lead" error={errors.lead_time_days}>
          <Input id="pd-lead" name="lead_time_days" inputMode="numeric" defaultValue={v(defaults.lead_time_days)} invalid={Boolean(errors.lead_time_days)} />
        </Field>
        <Field label="Minimum order" htmlFor="pd-min" error={errors.min_order_qty}>
          <Input id="pd-min" name="min_order_qty" inputMode="decimal" defaultValue={v(defaults.min_order_qty)} invalid={Boolean(errors.min_order_qty)} />
        </Field>
      </div>
      <Field label="Stock and availability" htmlFor="pd-stock" error={errors.stock_note}>
        <Textarea id="pd-stock" name="stock_note" rows={2} maxLength={500} defaultValue={v(defaults.stock_note)} invalid={Boolean(errors.stock_note)} />
      </Field>
      <div>
        <p className="mb-1.5 font-semibold text-ink">Photos</p>
        {photos.length > 0 && (
          <ul className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((p) =>
              p.url ? (
                <li key={p.path}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- a short-lived private link, not an optimisable public image */}
                  <img src={p.url} alt="" className="aspect-square w-full rounded-md border border-border object-cover" />
                </li>
              ) : null,
            )}
          </ul>
        )}
        {added.length > 0 && (
          <ul className="mb-3 space-y-1 text-small text-muted">
            {added.map((name, i) => (
              <li key={`${name}-${i}`}>{name}</li>
            ))}
          </ul>
        )}
        {paths.length < 8 && (
          <FileDrop
            target={{ purpose: 'private', area: 'partner', id: draftId }}
            accept="image/jpeg,image/png,image/webp"
            maxFiles={8 - paths.length}
            label="Photos"
            onDocUploaded={(doc) => {
              setPaths((all) => (all.length < 8 ? [...all, doc.path] : all))
              setAdded((all) => [...all, doc.name])
            }}
          />
        )}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <SubmitButton variant="secondary" size="lg" className="w-full sm:flex-1" onClick={() => { if (intent.current) intent.current.value = 'save' }}>
          {PORTAL_TEXT.save}
        </SubmitButton>
        <SubmitButton size="lg" className="w-full sm:flex-1" onClick={() => { if (intent.current) intent.current.value = 'send' }}>
          {PORTAL_TEXT.send}
        </SubmitButton>
      </div>
    </NoResetForm>
  )
}
