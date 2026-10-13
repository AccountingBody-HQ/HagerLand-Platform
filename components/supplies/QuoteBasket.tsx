'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ClipboardList, Package, Plus, Trash2 } from 'lucide-react'
import { useQuoteList } from './quoteStore'
import { QuantityStepper } from './QuantityStepper'
import { QuoteRequestForm } from './QuoteRequestForm'
import { MediaImage } from '@/components/media/MediaImage'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/Layout'
import { UNITS } from '@/lib/units'

export function QuoteBasket() {
  const { items, ready, update, remove, add, clear } = useQuoteList()
  const [custom, setCustom] = useState({ name: '', quantity: 1, unit: 'piece' })

  if (!ready) return <div className="h-40 animate-pulse rounded-lg bg-stone-100" aria-hidden />

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
      <section aria-labelledby="items-heading">
        <h2 id="items-heading" className="hl-h3 mb-4">
          Items ({items.length})
        </h2>
        {items.length === 0 ? (
          <EmptyState
            icon={<ClipboardList />}
            title="Your quote list is empty"
            description="Add products from the catalogue, add your own items below, or upload a materials list."
            actions={
              <>
                <ButtonLink href="/supplies">Browse supplies</ButtonLink>
                <ButtonLink href="/supplies/materials-list" variant="secondary">
                  Upload a list
                </ButtonLink>
              </>
            }
          />
        ) : (
          <ul className="space-y-3">
            {items.map((i) => (
              <li key={i.key} className="flex flex-col gap-3 rounded-lg border border-border bg-white p-4 sm:flex-row sm:items-center">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-stone-50">
                  {i.imagePath ? <MediaImage path={i.imagePath} alt="" fill sizes="64px" className="object-contain" /> : <Package className="m-auto mt-5 size-6 text-stone-500" aria-hidden />}
                </div>
                <div className="min-w-0 flex-1">
                  {i.slug ? (
                    <Link href={`/supplies/product/${i.slug}`} className="font-semibold hover:underline">
                      {i.name}
                    </Link>
                  ) : (
                    <p className="font-semibold">{i.name} <span className="text-small font-normal text-muted">(custom item)</span></p>
                  )}
                  <input
                    aria-label={`Notes for ${i.name}`}
                    defaultValue={i.notes ?? ''}
                    placeholder="Notes (size, colour, grade…)"
                    maxLength={500}
                    onBlur={(e) => update(i.key, { notes: e.target.value || undefined })}
                    className="mt-2 h-10 w-full rounded-sm border border-border px-3 text-small"
                  />
                </div>
                <QuantityStepper id={`q-${i.key}`} value={i.quantity} onChange={(v) => update(i.key, { quantity: v })} unit={i.unit} />
                <button type="button" aria-label={`Remove ${i.name}`} onClick={() => remove(i.key)} className="inline-flex size-11 items-center justify-center self-end rounded-md text-error hover:bg-error/10 sm:self-auto">
                  <Trash2 className="size-5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <form
          className="mt-6 rounded-lg border border-dashed border-border-strong p-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!custom.name.trim()) return
            add({ name: custom.name.trim().slice(0, 300), quantity: custom.quantity || 1, unit: custom.unit })
            setCustom({ name: '', quantity: 1, unit: custom.unit })
          }}
        >
          <p className="mb-3 font-semibold">Can&apos;t find it? Add a custom item</p>
          <div className="grid gap-2 sm:grid-cols-[1fr_90px_140px_auto]">
            <Input aria-label="Item description" placeholder="e.g. Rebar Ø12 mm, 12 m" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
            <Input aria-label="Quantity" inputMode="decimal" value={custom.quantity} onChange={(e) => setCustom({ ...custom, quantity: Number(e.target.value) || 0 })} />
            <Select aria-label="Unit" value={custom.unit} onChange={(e) => setCustom({ ...custom, unit: e.target.value })}>
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="secondary">
              <Plus /> Add
            </Button>
          </div>
        </form>
      </section>

      <section aria-labelledby="send-heading" className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
          <h2 id="send-heading" className="hl-h3">
            Get your quote
          </h2>
          <p className="mb-5 mt-1 text-small text-muted">We reply with a clear price and delivery details. No payment now.</p>
          {items.length > 0 ? <QuoteRequestForm source="basket" items={items} onSent={clear} /> : <p className="text-small text-muted">Add items to your list first, or <Link href="/supplies/materials-list" className="font-semibold text-green underline">upload a materials list</Link>.</p>}
        </div>
      </section>
    </div>
  )
}
