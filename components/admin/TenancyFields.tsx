import { CURRENCIES } from '@/lib/countries'
import { TENANCY_STATUSES, STATUS_LABEL } from '@/lib/agency'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'

export interface TenancyDefaults {
  title?: string
  tenant_names?: string
  start_date?: string
  end_date?: string | null
  currency?: string
  rent_minor?: number
  rent_period?: string
  advance_months?: number | null
  deposit_minor?: number | null
  renewal_date?: string | null
  notice_date?: string | null
  managed_ref?: string | null
  status?: string
  notes?: string | null
}

/** The fields of a tenancy (spec 26.6), shared by the create and edit forms. */
export function TenancyFields({ p, v = {} }: { p: string; v?: TenancyDefaults }) {
  return (
    <>
      <Field label="Tenancy name" htmlFor={`${p}-title`} hint="Usually the property.">
        <Input id={`${p}-title`} name="title" defaultValue={v.title ?? ''} maxLength={160} />
      </Field>
      <Field label="Tenant names" htmlFor={`${p}-tenants`}>
        <Input id={`${p}-tenants`} name="tenant_names" defaultValue={v.tenant_names ?? ''} maxLength={300} />
      </Field>
      <Field label="Starts" htmlFor={`${p}-start`}>
        <Input id={`${p}-start`} name="start_date" type="date" defaultValue={v.start_date ?? ''} />
      </Field>
      <Field label="Ends" htmlFor={`${p}-end`} optional>
        <Input id={`${p}-end`} name="end_date" type="date" defaultValue={v.end_date ?? ''} />
      </Field>
      <Field label="Rent" htmlFor={`${p}-rent`}>
        <Input id={`${p}-rent`} name="rent" inputMode="decimal" defaultValue={v.rent_minor !== undefined ? v.rent_minor / 100 : ''} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Currency" htmlFor={`${p}-cur`}>
          <Select id={`${p}-cur`} name="currency" defaultValue={v.currency ?? 'ETB'}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Per" htmlFor={`${p}-per`}>
          <Select id={`${p}-per`} name="rent_period" defaultValue={v.rent_period ?? 'month'}>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </Select>
        </Field>
      </div>
      <Field label="Months paid in advance" htmlFor={`${p}-adv`} optional>
        <Input id={`${p}-adv`} name="advance_months" inputMode="numeric" defaultValue={v.advance_months ?? ''} />
      </Field>
      <Field label="Deposit" htmlFor={`${p}-dep`} optional>
        <Input id={`${p}-dep`} name="deposit" inputMode="decimal" defaultValue={v.deposit_minor !== undefined && v.deposit_minor !== null ? v.deposit_minor / 100 : ''} />
      </Field>
      <Field label="Renewal date" htmlFor={`${p}-ren`} optional hint="Agents are reminded 30 days before.">
        <Input id={`${p}-ren`} name="renewal_date" type="date" defaultValue={v.renewal_date ?? ''} />
      </Field>
      <Field label="Notice date" htmlFor={`${p}-not`} optional hint="Agents are reminded 14 days before.">
        <Input id={`${p}-not`} name="notice_date" type="date" defaultValue={v.notice_date ?? ''} />
      </Field>
      <Field label="Managed property (HLM-… reference)" htmlFor={`${p}-mp`} optional hint="For let-and-manage: links the tenancy to Property Care.">
        <Input id={`${p}-mp`} name="managed_property_ref" defaultValue={v.managed_ref ?? ''} maxLength={40} />
      </Field>
      <Field label="Status" htmlFor={`${p}-status`}>
        <Select id={`${p}-status`} name="status" defaultValue={v.status ?? 'active'}>
          {TENANCY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Notes" htmlFor={`${p}-notes`} optional className="sm:col-span-2">
        <Textarea id={`${p}-notes`} name="notes" rows={2} defaultValue={v.notes ?? ''} maxLength={4000} />
      </Field>
    </>
  )
}
