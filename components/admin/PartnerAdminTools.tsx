'use client'

import { useRouter } from 'next/navigation'
import { useActionState, useState, useTransition } from 'react'
import { setRegistrationStatusAction, sendPartnerInvitationAction, addStaffRegistrationAction } from '@/app/roodber8/actions/partner-registrations'
import { approveDraftAction, rejectDraftAction, requestDraftChangesAction } from '@/app/roodber8/actions/partner-drafts'
import { setSupplySwitchAction } from '@/app/roodber8/actions/supply-switches'
import { Button } from '@/components/ui/Button'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Combobox } from '@/components/ui/Combobox'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'
import { NoResetForm } from '@/components/forms/NoResetForm'
import { useToast } from '@/components/ui/Toast'
import { UNITS } from '@/lib/units'
import { PARTNER_ROLES, REGISTRATION_STATUS_LABEL, ROLE_LABEL, SETTLEMENT_TIMINGS, type RegistrationStatus } from '@/lib/supply/partner-rules'

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

/** Registration decisions. Operations see only "Start review"; the owner sees every allowed move. */
export function RegistrationStatusTools({ id, moves, updatedAt }: { id: string; moves: RegistrationStatus[]; updatedAt: string }) {
  const [note, setNote] = useState('')
  const { pending, run } = useRun()
  if (!moves.length) return <p className="text-small text-muted">No decisions available here.</p>
  const verb: Record<RegistrationStatus, string> = {
    submitted: 'New',
    in_review: 'Start review',
    approved: 'Approve as partner',
    changes_requested: 'Ask for changes',
    declined: 'Decline',
    suspended: 'Suspend',
  }
  return (
    <div className="space-y-3">
      <Field label="Note (kept in admin; not sent to the business)" htmlFor="reg-note" optional>
        <Textarea id="reg-note" rows={2} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-2">
        {moves.map((to) => (
          <Button key={to} size="sm" variant={to === 'approved' ? 'primary' : 'secondary'} disabled={pending} onClick={() => run(() => setRegistrationStatusAction(id, to, note, updatedAt))}>
            {verb[to] ?? REGISTRATION_STATUS_LABEL[to]}
          </Button>
        ))}
      </div>
    </div>
  )
}

/** Owner: email the partner a link to their private partner area. */
export function InvitePartnerForm({ registrationId, email, name }: { registrationId: string; email: string; name: string }) {
  const [to, setTo] = useState(email)
  const [who, setWho] = useState(name)
  const { pending, run } = useRun()
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Email" htmlFor="inv-email">
        <Input id="inv-email" type="email" value={to} onChange={(e) => setTo(e.target.value)} />
      </Field>
      <Field label="Name" htmlFor="inv-name">
        <Input id="inv-name" value={who} onChange={(e) => setWho(e.target.value)} />
      </Field>
      <div className="sm:col-span-2">
        <Button size="sm" disabled={pending} onClick={() => run(() => sendPartnerInvitationAction(registrationId, to, who))}>
          Send partner-area invitation
        </Button>
      </div>
    </div>
  )
}

/** Staff "Add registration" for a business met in the field. */
export function StaffRegistrationForm({ categories }: { categories: { id: string; name: string }[] }) {
  const [state, action] = useActionState(addStaffRegistrationAction, null)
  const errors = state && !state.ok ? ((state as { fieldErrors?: Record<string, string> }).fieldErrors ?? {}) : {}
  return (
    <NoResetForm action={action} className="space-y-4" noValidate>
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business name" htmlFor="sr-business" error={errors.business_name} required>
          <Input id="sr-business" name="business_name" invalid={Boolean(errors.business_name)} />
        </Field>
        <Field label="Other names" htmlFor="sr-other" optional>
          <Input id="sr-other" name="other_names" />
        </Field>
      </div>
      <fieldset>
        <legend className="mb-1.5 font-semibold">What they do</legend>
        <div className="flex flex-wrap gap-x-6">
          {PARTNER_ROLES.map((r) => (
            <Checkbox key={r} id={`sr-role-${r}`} name="roles" value={r} label={ROLE_LABEL[r]} />
          ))}
        </div>
        {errors.roles && <p className="mt-1 text-small text-error">{errors.roles}</p>}
      </fieldset>
      <fieldset>
        <legend className="mb-1.5 font-semibold">Product categories</legend>
        <div className="grid gap-x-4 sm:grid-cols-3">
          {categories.map((c) => (
            <Checkbox key={c.id} id={`sr-cat-${c.id}`} name="category_ids" value={c.id} label={c.name} />
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="City" htmlFor="sr-city" error={errors.city_id} optional>
          <Combobox id="sr-city" name="city_id" endpoint="/api/locations" />
        </Field>
        <Field label="Sub-city" htmlFor="sr-subcity" error={errors.subcity_id} optional>
          <Combobox id="sr-subcity" name="subcity_id" endpoint="/api/locations" />
        </Field>
        <Field label="Woreda" htmlFor="sr-woreda" error={errors.woreda_id} optional>
          <Combobox id="sr-woreda" name="woreda_id" endpoint="/api/locations" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contact name" htmlFor="sr-contact" error={errors.contact_name} required>
          <Input id="sr-contact" name="contact_name" invalid={Boolean(errors.contact_name)} />
        </Field>
        <Field label="Phone" htmlFor="sr-phone" error={errors.phone} required>
          <PhoneInput id="sr-phone" name="phone" invalid={Boolean(errors.phone)} />
        </Field>
        <Field label="Email" htmlFor="sr-email" error={errors.email} optional>
          <Input id="sr-email" name="email" type="email" invalid={Boolean(errors.email)} />
        </Field>
        <Field label="TIN" htmlFor="sr-tin" optional>
          <Input id="sr-tin" name="tin" />
        </Field>
      </div>
      <Field label="Notes from the visit or call" htmlFor="sr-message" optional>
        <Textarea id="sr-message" name="message" rows={3} maxLength={2000} />
      </Field>
      <SubmitButton size="sm" pendingText="Saving…">
        Add registration
      </SubmitButton>
    </NoResetForm>
  )
}

/** Review of a draft that was sent: Operations may ask for changes; the owner may also decline. */
export function DraftReviewTools({ id, owner }: { id: string; owner: boolean }) {
  const [note, setNote] = useState('')
  const { pending, run } = useRun()
  return (
    <div className="space-y-3">
      <Field label="Note to the partner (shown in their partner area)" htmlFor="dr-note">
        <Textarea id="dr-note" rows={3} maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => requestDraftChangesAction(id, note))}>
          Ask for changes
        </Button>
        {owner && (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => rejectDraftAction(id, note))}>
            Decline
          </Button>
        )}
      </div>
    </div>
  )
}

export interface ApproveDefaults {
  name: string
  category_id: string | null
  brand_name: string | null
  unit: string
  pack_size: string | null
  min_order_qty: number | null
  lead_time_days: number | null
  description: string | null
  specs: string
  cost_price: string
  hasPhotos: boolean
}

/** Owner: accept the draft as a HagerLand Supply product (draft, price on request) with its private source terms. */
export function ApproveDraftForm({ id, defaults, categories }: { id: string; defaults: ApproveDefaults; categories: { id: string; name: string }[] }) {
  const [state, action] = useActionState(approveDraftAction, null)
  const errors = state && !state.ok ? ((state as { fieldErrors?: Record<string, string> }).fieldErrors ?? {}) : {}
  const v = (x: string | number | null | undefined) => (x === null || x === undefined ? '' : String(x))
  return (
    <NoResetForm action={action} className="space-y-4" noValidate>
      <input type="hidden" name="id" value={id} />
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      <p className="text-small text-muted">
        Creates a HagerLand Supply product as a draft (price on request, without the partner&rsquo;s product code). Customers see HagerLand Supply only. Publish it from Products when it is ready.
      </p>
      <Field label="Link to an existing HagerLand Supply product instead (its ID)" htmlFor="ap-existing" error={errors.existing_product} optional>
        <Input id="ap-existing" name="existing_product" invalid={Boolean(errors.existing_product)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Product name (as customers will see it)" htmlFor="ap-name" error={errors.name} required>
          <Input id="ap-name" name="name" defaultValue={defaults.name} invalid={Boolean(errors.name)} />
        </Field>
        <Field label="Category" htmlFor="ap-cat" error={errors.category_id}>
          <Select id="ap-cat" name="category_id" defaultValue={v(defaults.category_id)} invalid={Boolean(errors.category_id)}>
            <option value="" />
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Brand (as printed on the product)" htmlFor="ap-brand" optional>
          <Input id="ap-brand" name="brand_name" defaultValue={v(defaults.brand_name)} />
        </Field>
        <Field label="Sold per" htmlFor="ap-unit">
          <Select id="ap-unit" name="unit" defaultValue={defaults.unit}>
            {UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Pack size" htmlFor="ap-pack" optional>
          <Input id="ap-pack" name="pack_size" defaultValue={v(defaults.pack_size)} />
        </Field>
        <Field label="Minimum order" htmlFor="ap-min" error={errors.min_order_qty} optional>
          <Input id="ap-min" name="min_order_qty" inputMode="decimal" defaultValue={v(defaults.min_order_qty)} />
        </Field>
        <Field label="Lead time (days)" htmlFor="ap-lead" error={errors.lead_time_days} optional>
          <Input id="ap-lead" name="lead_time_days" inputMode="numeric" defaultValue={v(defaults.lead_time_days)} />
        </Field>
      </div>
      <Field label="Description" htmlFor="ap-desc" optional>
        <Textarea id="ap-desc" name="description" rows={4} defaultValue={v(defaults.description)} />
      </Field>
      <Field label="Specifications (one per line, “Label: value”)" htmlFor="ap-specs" optional>
        <Textarea id="ap-specs" name="specs" rows={4} defaultValue={defaults.specs} />
      </Field>
      {defaults.hasPhotos && <Checkbox id="ap-photos" name="copy_photos" defaultChecked label="Copy the partner’s photos to the new product (re-encoded; check them for logos first)" />}
      <fieldset className="rounded-md border border-border p-4">
        <legend className="px-1 font-semibold">Private terms (owner only; never shown to customers or the partner)</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cost price to HagerLand (ETB per unit)" htmlFor="ap-cost" error={errors.cost_price} optional>
            <Input id="ap-cost" name="cost_price" inputMode="decimal" defaultValue={defaults.cost_price} />
          </Field>
          <Field label="Commission (%)" htmlFor="ap-comm" error={errors.commission} optional hint="Leave empty to use the agreement.">
            <Input id="ap-comm" name="commission" inputMode="decimal" />
          </Field>
          <Field label="Markup (%)" htmlFor="ap-markup" error={errors.markup} optional hint="Leave empty to use the agreement.">
            <Input id="ap-markup" name="markup" inputMode="decimal" />
          </Field>
          <Field label="Settlement" htmlFor="ap-settle" optional>
            <Select id="ap-settle" name="settlement_timing" defaultValue="">
              <option value="" />
              {SETTLEMENT_TIMINGS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Credit days" htmlFor="ap-credit" error={errors.credit_days} optional>
            <Input id="ap-credit" name="credit_days" inputMode="numeric" />
          </Field>
        </div>
      </fieldset>
      <SubmitButton size="sm" pendingText="Saving…">
        Approve and create the product draft
      </SubmitButton>
    </NoResetForm>
  )
}

/** Owner: one S6-1 switch. */
export function SupplySwitchControl({ which, on, label, locked }: { which: string; on: boolean; label: string; locked?: boolean }) {
  const { pending, run } = useRun()
  return (
    <div className="space-y-2 rounded-md border border-border p-4">
      <p className="font-semibold">
        {label}: <span className={on ? 'text-green' : 'text-muted'}>{on ? 'On' : 'Off'}</span>
      </p>
      {!locked && (
        <Button size="sm" variant={on ? 'secondary' : 'primary'} disabled={pending} onClick={() => run(() => setSupplySwitchAction(which, !on))}>
          {on ? 'Switch off' : 'Switch on'}
        </Button>
      )}
    </div>
  )
}
