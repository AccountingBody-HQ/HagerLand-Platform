import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Field'
import { COUNTRIES, CURRENCIES } from '@/lib/countries'
import { CARE_PROPERTY_TYPES, CARE_SERVICES, MANAGED_STATUSES } from '@/lib/property-care'

export interface ManagedDefaults {
  id?: string
  owner_name?: string
  owner_email?: string | null
  owner_phone?: string | null
  owner_country_code?: string | null
  title?: string
  location_id?: string | null
  address_line?: string | null
  property_type?: string | null
  status?: string
  currency?: string
  monthly_fee?: string
  start_date?: string | null
  notes?: string | null
  services?: string[]
}

/** Fields of a managed-property record (used inside ActionForm). */
export function ManagedPropertyFields({ d, locations }: { d: ManagedDefaults; locations: { id: string; label: string }[] }) {
  return (
    <>
      {d.id && <input type="hidden" name="id" value={d.id} />}
      <Field label="Property name" htmlFor="mp-title" required>
        <Input id="mp-title" name="title" defaultValue={d.title ?? ''} maxLength={160} />
      </Field>
      <Field label="Status" htmlFor="mp-status">
        <Select id="mp-status" name="status" defaultValue={d.status ?? 'onboarding'}>
          {MANAGED_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </Field>
      <Field label="Owner name" htmlFor="mp-owner" required>
        <Input id="mp-owner" name="owner_name" defaultValue={d.owner_name ?? ''} />
      </Field>
      <Field label="Owner email" htmlFor="mp-email" optional>
        <Input id="mp-email" name="owner_email" type="email" defaultValue={d.owner_email ?? ''} />
      </Field>
      <Field label="Owner phone" htmlFor="mp-phone" optional>
        <Input id="mp-phone" name="owner_phone" defaultValue={d.owner_phone ?? ''} />
      </Field>
      <Field label="Owner lives in" htmlFor="mp-country" optional>
        <Select id="mp-country" name="owner_country_code" defaultValue={d.owner_country_code ?? ''}>
          <option value="">Not set</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Location" htmlFor="mp-loc" optional>
        <Select id="mp-loc" name="location_id" defaultValue={d.location_id ?? ''}>
          <option value="">Not set</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Address (private)" htmlFor="mp-addr" optional>
        <Input id="mp-addr" name="address_line" defaultValue={d.address_line ?? ''} maxLength={300} />
      </Field>
      <Field label="Type" htmlFor="mp-type">
        <Select id="mp-type" name="property_type" defaultValue={d.property_type ?? 'house'}>
          {CARE_PROPERTY_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Start date" htmlFor="mp-start" optional>
        <Input id="mp-start" name="start_date" type="date" defaultValue={d.start_date ?? ''} />
      </Field>
      <Field label="Currency" htmlFor="mp-cur">
        <Select id="mp-cur" name="currency" defaultValue={d.currency ?? 'ETB'}>
          {CURRENCIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
      </Field>
      <Field label="Monthly fee" htmlFor="mp-fee" optional>
        <Input id="mp-fee" name="monthly_fee" inputMode="decimal" defaultValue={d.monthly_fee ?? ''} />
      </Field>
      <fieldset className="sm:col-span-2">
        <legend className="text-small font-semibold text-ink">Services</legend>
        <div className="grid sm:grid-cols-2">
          {CARE_SERVICES.map((s) => (
            <Checkbox key={s.value} id={`mp-svc-${s.value}`} name="services" value={s.value} label={s.label} defaultChecked={d.services?.includes(s.value)} />
          ))}
        </div>
      </fieldset>
      <Field label="Notes" htmlFor="mp-notes" optional className="sm:col-span-2">
        <Textarea id="mp-notes" name="notes" rows={3} defaultValue={d.notes ?? ''} />
      </Field>
    </>
  )
}
