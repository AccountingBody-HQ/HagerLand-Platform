'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { addTradePriceAction, endTradePriceAction } from '@/app/roodber8/actions/trade-prices'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'

type Result = { ok: true; data: { message: string } } | { ok: false; error: string }

function useRun() {
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  return {
    pending,
    run: (fn: () => Promise<Result>, after?: () => void) =>
      start(async () => {
        const res = await fn()
        toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
        if (res.ok) {
          after?.()
          router.refresh()
        }
      }),
  }
}

export interface Choice {
  id: string
  label: string
}

/** Owner: add a trade price (a product's agreed price, or a category's price or discount) for one trade account. */
export function AddTradePriceForm({ accountId, products, categories, today }: { accountId: string; products: Choice[]; categories: Choice[]; today: string }) {
  const empty = { target: 'product', product_id: '', category_id: '', kind: 'price', price_etb: '', discount_percent: '', valid_from: today, valid_until: '', note: '' }
  const [v, setV] = useState(empty)
  const { pending, run } = useRun()
  const set = (k: keyof typeof empty) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value })
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Applies to" htmlFor="tp-target">
        <Select id="tp-target" value={v.target} onChange={(e) => setV({ ...v, target: e.target.value, kind: e.target.value === 'product' ? 'price' : v.kind })} className="h-10">
          <option value="product">One product</option>
          <option value="category">A product category</option>
        </Select>
      </Field>
      {v.target === 'product' ? (
        <Field label="Product" htmlFor="tp-product">
          <Select id="tp-product" value={v.product_id} onChange={set('product_id')} className="h-10">
            <option value="">Choose…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <Field label="Category" htmlFor="tp-category">
          <Select id="tp-category" value={v.category_id} onChange={set('category_id')} className="h-10">
            <option value="">Choose…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Price or discount" htmlFor="tp-kind">
        <Select id="tp-kind" value={v.kind} onChange={set('kind')} className="h-10" disabled={v.target === 'product'}>
          <option value="price">Agreed price per unit</option>
          {v.target === 'category' && <option value="discount">Discount on the suggested price</option>}
        </Select>
      </Field>
      {v.kind === 'price' ? (
        <Field label="Price per unit (ETB)" htmlFor="tp-price">
          <Input id="tp-price" inputMode="decimal" value={v.price_etb} onChange={set('price_etb')} className="h-10" />
        </Field>
      ) : (
        <Field label="Discount (%)" htmlFor="tp-discount" hint="Between 0.01% and 90%.">
          <Input id="tp-discount" inputMode="decimal" value={v.discount_percent} onChange={set('discount_percent')} className="h-10" />
        </Field>
      )}
      <Field label="Valid from" htmlFor="tp-from">
        <Input id="tp-from" type="date" value={v.valid_from} onChange={set('valid_from')} className="h-10" />
      </Field>
      <Field label="Valid until" htmlFor="tp-until" optional hint="Leave empty for no end date.">
        <Input id="tp-until" type="date" value={v.valid_until} onChange={set('valid_until')} className="h-10" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Note (kept in admin)" htmlFor="tp-note" optional>
          <Textarea id="tp-note" rows={2} maxLength={500} value={v.note} onChange={set('note')} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Button size="sm" disabled={pending} onClick={() => run(() => addTradePriceAction(accountId, v), () => setV(empty))}>
          Add trade price
        </Button>
      </div>
    </div>
  )
}

/** Owner: end an agreement, with the reason (kept in admin). */
export function EndTradePriceStep({ id, updatedAt }: { id: string; updatedAt: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const { pending, run } = useRun()
  if (!open)
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        End
      </Button>
    )
  return (
    <div className="w-full min-w-56 space-y-2 rounded-md border border-border p-3">
      <Field label="Reason (kept in admin)" htmlFor={`te-${id}`}>
        <Textarea id={`te-${id}`} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Button size="sm" className="flex-1" disabled={pending} onClick={() => run(() => endTradePriceAction(id, { reason, expectedUpdatedAt: updatedAt }), () => setOpen(false))}>
          End trade price
        </Button>
        <Button size="sm" variant="ghost" className="flex-1" onClick={() => setOpen(false)}>
          Back
        </Button>
      </div>
    </div>
  )
}
