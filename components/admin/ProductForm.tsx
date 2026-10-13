'use client'

import { useState } from 'react'
import { useFormState } from 'react-dom'
import { Plus, Trash2 } from 'lucide-react'
import { saveProductAction } from '@/app/roodber8/actions/products'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'
import { UNITS } from '@/lib/units'
import { Panel } from './AdminUi'

interface Spec {
  label: string
  value: string
  unit?: string
}

export interface ProductDefaults {
  id?: string
  name?: string
  category_id?: string
  brand_id?: string | null
  seller_org_id?: string
  sku?: string | null
  model_number?: string | null
  summary?: string | null
  description?: string | null
  specs?: Spec[]
  unit?: string
  pack_size?: string | null
  min_order_qty?: number | null
  price_type?: string
  price_etb_cents?: number | null
  stock_status?: string
  lead_time_days?: number | null
  country_of_origin?: string | null
  warranty?: string | null
  delivery_available?: boolean
}

export function ProductForm({ defaults, categories, brands, sellers }: { defaults: ProductDefaults; categories: { id: string; label: string }[]; brands: { id: string; name: string }[]; sellers: { id: string; label: string }[] }) {
  const [state, action] = useFormState(saveProductAction, null)
  const [specs, setSpecs] = useState<Spec[]>(defaults.specs ?? [])
  const [priceType, setPriceType] = useState(defaults.price_type ?? 'on_request')
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  const v = (x: string | number | null | undefined) => (x === null || x === undefined ? '' : String(x))
  return (
    <form action={action} className="space-y-5" noValidate>
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      <input type="hidden" name="specs" value={JSON.stringify(specs.filter((s) => s.label.trim() && s.value.trim()))} />
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      {state?.ok && <FormAlert tone="success">{state.message}</FormAlert>}
      <Panel title="Product">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="pr-name" error={errors.name} required className="sm:col-span-2">
            <Input id="pr-name" name="name" defaultValue={defaults.name} invalid={Boolean(errors.name)} />
          </Field>
          <Field label="Category" htmlFor="pr-cat" error={errors.category_id} required>
            <Select id="pr-cat" name="category_id" defaultValue={defaults.category_id ?? ''}>
              <option value="">Choose</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Seller" htmlFor="pr-seller" error={errors.seller_org_id} required>
            <Select id="pr-seller" name="seller_org_id" defaultValue={defaults.seller_org_id ?? sellers[0]?.id ?? ''}>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Brand" htmlFor="pr-brand">
            <Select id="pr-brand" name="brand_id" defaultValue={defaults.brand_id ?? ''}>
              <option value="">No brand / new brand</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="New brand name" htmlFor="pr-newbrand" optional hint="Used only if no brand is chosen above.">
            <Input id="pr-newbrand" name="new_brand" />
          </Field>
          <Field label="SKU" htmlFor="pr-sku" optional error={errors.sku}>
            <Input id="pr-sku" name="sku" defaultValue={defaults.sku ?? ''} />
          </Field>
          <Field label="Model number" htmlFor="pr-model" optional>
            <Input id="pr-model" name="model_number" defaultValue={defaults.model_number ?? ''} />
          </Field>
          <Field label="Summary" htmlFor="pr-sum" optional className="sm:col-span-2">
            <Input id="pr-sum" name="summary" defaultValue={defaults.summary ?? ''} maxLength={300} />
          </Field>
          <Field label="Description" htmlFor="pr-desc" optional className="sm:col-span-2">
            <Textarea id="pr-desc" name="description" defaultValue={defaults.description ?? ''} rows={6} />
          </Field>
        </div>
      </Panel>
      <Panel title="Specifications">
        <ul className="space-y-2">
          {specs.map((s, i) => (
            <li key={i} className="grid grid-cols-[1fr_1fr_90px_auto] gap-2">
              <Input aria-label="Label" placeholder="e.g. Diameter" value={s.label} onChange={(e) => setSpecs(specs.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <Input aria-label="Value" placeholder="e.g. 12" value={s.value} onChange={(e) => setSpecs(specs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
              <Input aria-label="Unit" placeholder="mm" value={s.unit ?? ''} onChange={(e) => setSpecs(specs.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x)))} />
              <button type="button" aria-label="Remove spec" onClick={() => setSpecs(specs.filter((_x, j) => j !== i))} className="inline-flex size-11 items-center justify-center rounded-md text-error hover:bg-error/10">
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
        <Button size="sm" variant="ghost" className="mt-2" onClick={() => setSpecs([...specs, { label: '', value: '' }])}>
          <Plus /> Add specification
        </Button>
      </Panel>
      <Panel title="Price and stock">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Sold per" htmlFor="pr-unit">
            <Select id="pr-unit" name="unit" defaultValue={defaults.unit ?? 'piece'}>
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Pack size" htmlFor="pr-pack" optional>
            <Input id="pr-pack" name="pack_size" defaultValue={defaults.pack_size ?? ''} placeholder="e.g. 50 kg bag" />
          </Field>
          <Field label="Minimum order" htmlFor="pr-min">
            <Input id="pr-min" name="min_order_qty" inputMode="decimal" defaultValue={v(defaults.min_order_qty ?? 1)} />
          </Field>
          <Field label="Price type" htmlFor="pr-ptype">
            <Select id="pr-ptype" name="price_type" value={priceType} onChange={(e) => setPriceType(e.target.value)}>
              <option value="fixed">Fixed price</option>
              <option value="from">From price</option>
              <option value="on_request">Price on request</option>
            </Select>
          </Field>
          {priceType !== 'on_request' && (
            <Field label="Price (ETB per unit)" htmlFor="pr-price" error={errors.price_etb}>
              <Input id="pr-price" name="price_etb" inputMode="decimal" defaultValue={defaults.price_etb_cents ? (defaults.price_etb_cents / 100).toFixed(2) : ''} invalid={Boolean(errors.price_etb)} />
            </Field>
          )}
          <Field label="Stock" htmlFor="pr-stock">
            <Select id="pr-stock" name="stock_status" defaultValue={defaults.stock_status ?? 'available_on_request'}>
              <option value="in_stock">In stock</option>
              <option value="low_stock">Low stock</option>
              <option value="out_of_stock">Out of stock</option>
              <option value="made_to_order">Made to order</option>
              <option value="available_on_request">Available on request</option>
            </Select>
          </Field>
          <Field label="Lead time (days)" htmlFor="pr-lead" optional>
            <Input id="pr-lead" name="lead_time_days" inputMode="numeric" defaultValue={v(defaults.lead_time_days)} />
          </Field>
          <Field label="Country of origin" htmlFor="pr-country" optional>
            <Input id="pr-country" name="country_of_origin" defaultValue={defaults.country_of_origin ?? ''} />
          </Field>
          <Field label="Warranty" htmlFor="pr-warranty" optional>
            <Input id="pr-warranty" name="warranty" defaultValue={defaults.warranty ?? ''} />
          </Field>
        </div>
        <label className="mt-3 flex min-h-11 items-center gap-2">
          <input type="checkbox" name="delivery_available" value="true" defaultChecked={defaults.delivery_available ?? true} className="size-5 accent-green" /> Delivery available
        </label>
      </Panel>
      <SubmitButton size="lg" pendingText="Saving…">
        {defaults.id ? 'Save product' : 'Create product'}
      </SubmitButton>
    </form>
  )
}
