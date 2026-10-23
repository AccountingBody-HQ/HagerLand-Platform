'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Fragment, useId, useState, useTransition } from 'react'
import {
  addQuoteItemAction,
  addSupplierManuallyAction,
  chooseLineAction,
  editQuoteItemAction,
  enterReplyAction,
  markAskedAction,
  rejectLineAction,
  removeQuoteItemAction,
  undoChooseAction,
  type AskEntry,
} from '@/app/roodber8/actions/quote-suppliers'
import { basket, formatEtbExact, type Candidate, type ItemShortlist } from '@/lib/supply/shortlist'
import { UNITS, unitLabel } from '@/lib/units'
import { formatDate, formatPhone } from '@/lib/format'
import { productPrice } from '@/lib/product-price'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Checkbox, Field, Input, Select } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { FormAlert } from '@/components/forms/FormParts'
import { FreshnessBadge } from './SupplierOffers'
import type { PartnerContact, QuoteItemView, QuoteLineRow } from '@/lib/supply/quote-supply-data'

type Result = { ok: true; data: { message: string } } | { ok: false; error: string }
interface PartnerView {
  orgId: string
  name: string
  status: string
  doNotContact: boolean
  contact: PartnerContact | null
}

function useRun() {
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  const toast = useToast()
  const router = useRouter()
  return {
    pending,
    error,
    run: (fn: () => Promise<Result>, after?: () => void) =>
      start(async () => {
        setError('')
        const res = await fn()
        if (res.ok) {
          toast(res.data.message, 'success')
          after?.()
          router.refresh()
        } else setError(res.error)
      }),
  }
}

const qty = (n: number, unit: string) => `${Number.isInteger(n) ? n : n.toFixed(2)} ${unitLabel(unit, n)}`

/* ------------------------------------------------------------------ Items ------------------------------------------------------------------ */

const emptyItem = { name: '', categoryId: '', quantity: '', unit: 'bag', note: '' }

function ItemForm({ initial, categories, onSave, onCancel, saveLabel, groupLabel }: { initial: typeof emptyItem; categories: { id: string; name: string }[]; onSave: (v: typeof emptyItem) => void; onCancel?: () => void; saveLabel: string; groupLabel: string }) {
  const [v, setV] = useState(initial)
  const uid = useId()
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value })
  return (
    <div role="group" aria-label={groupLabel} className="grid gap-3 rounded-md border border-border p-3 sm:grid-cols-[2fr_1.5fr_0.7fr_0.8fr_1.5fr_auto] sm:items-end">
      <Field label="Item" htmlFor={`${uid}-name`}>
        <Input id={`${uid}-name`} value={v.name} onChange={set('name')} maxLength={300} placeholder="e.g. Dangote cement 50 kg" />
      </Field>
      <Field label="Category" htmlFor={`${uid}-cat`}>
        <Select id={`${uid}-cat`} value={v.categoryId} onChange={set('categoryId')}>
          <option value="">Not chosen</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Quantity" htmlFor={`${uid}-qty`}>
        <Input id={`${uid}-qty`} value={v.quantity} onChange={set('quantity')} inputMode="decimal" />
      </Field>
      <Field label="Unit" htmlFor={`${uid}-unit`}>
        <Select id={`${uid}-unit`} value={v.unit} onChange={set('unit')}>
          {UNITS.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Note" htmlFor={`${uid}-note`}>
        <Input id={`${uid}-note`} value={v.note} onChange={set('note')} maxLength={500} />
      </Field>
      <div className="flex gap-2">
        <Button size="md" onClick={() => onSave(v)} disabled={!v.name.trim() || !v.quantity}>
          {saveLabel}
        </Button>
        {onCancel && (
          <Button size="md" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  )
}

/** The quote's items: what the customer sent, plus items HagerLand added (customers never see those). */
export function QuoteItemsPanel({ quoteId, items, removedCount, categories, readOnly, canEdit }: { quoteId: string; items: QuoteItemView[]; removedCount: number; categories: { id: string; name: string }[]; readOnly: boolean; canEdit: boolean }) {
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(0)
  const { pending, error, run } = useRun()
  const save = (v: typeof emptyItem, itemId?: string) =>
    run(() => (itemId ? editQuoteItemAction(quoteId, itemId, v) : addQuoteItemAction(quoteId, v)), () => (itemId ? setEditing(null) : setAdding((n) => n + 1)))
  return (
    <div className="space-y-3">
      {error && <FormAlert>{error}</FormAlert>}
      {items.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-small">
            <thead className="text-caption uppercase text-muted">
              <tr>
                <th scope="col" className="py-2 pr-3">Item</th>
                <th scope="col" className="py-2 pr-3">Quantity</th>
                <th scope="col" className="py-2 pr-3">Catalogue price</th>
                <th scope="col" className="py-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((it) =>
                editing === it.id ? (
                  <tr key={it.id}>
                    <td colSpan={4} className="py-2">
                      <ItemForm initial={{ name: it.name, categoryId: it.categoryId ?? '', quantity: String(it.quantity), unit: it.unit, note: it.notes ?? '' }} categories={categories} onSave={(v) => save(v, it.id)} onCancel={() => setEditing(null)} saveLabel="Save" groupLabel={`Edit ${it.name}`} />
                    </td>
                  </tr>
                ) : (
                  <tr key={it.id}>
                    <td className="py-2 pr-3">
                      {it.productId ? (
                        <Link href={`/roodber8/products/${it.productId}`} className="font-semibold hover:underline">
                          {it.productName}
                        </Link>
                      ) : (
                        it.name
                      )}
                      {it.productSku && <span className="block font-mono text-caption text-muted">{it.productSku}</span>}
                      {it.addedByAdmin && (
                        <span className="mt-0.5 block">
                          <Badge tone="info">Added by HagerLand</Badge>
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 tabular-nums">{qty(it.quantity, it.unit)}</td>
                    <td className="py-2 pr-3 tabular-nums">{it.productPrice ? productPrice(it.productPrice) : ''}</td>
                    <td className="py-2">
                      {it.notes}
                      {it.addedByAdmin && canEdit && !readOnly && (
                        <span className="flex gap-3">
                          <button type="button" className="min-h-9 font-semibold text-green" onClick={() => setEditing(it.id)}>
                            Edit
                          </button>
                          <button type="button" className="min-h-9 font-semibold text-error" disabled={pending} onClick={() => window.confirm(`Remove “${it.name}”?`) && run(() => removeQuoteItemAction(quoteId, it.id))}>
                            Remove
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-small text-muted">No catalogue items: see the materials list.</p>
      )}
      {removedCount > 0 && <p className="text-caption text-muted">{removedCount === 1 ? '1 item added by HagerLand was removed.' : `${removedCount} items added by HagerLand were removed.`}</p>}
      {canEdit && !readOnly && (
        <div>
          <p className="mb-1 text-small font-semibold">Add item</p>
          <p className="mb-2 text-caption text-muted">Type in items from the customer’s list so suppliers can be found for them. The customer never sees these.</p>
          <ItemForm key={adding} initial={emptyItem} categories={categories} onSave={(v) => save(v)} saveLabel="Add" groupLabel="Add item" />
        </div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------- Suppliers ---------------------------------------------------------------- */

const STATUS_TONE: Record<string, 'neutral' | 'info' | 'gold' | 'green' | 'danger'> = { shortlisted: 'neutral', asked: 'info', received: 'gold', chosen: 'green', rejected: 'danger' }

function lineTotal(l: QuoteLineRow): number | null {
  return l.unit_price_cents === null || l.quantity === null ? null : Math.round(l.unit_price_cents * Number(l.quantity)) + (l.delivery_charge_cents ?? 0)
}

function ContactLine({ partner }: { partner: PartnerView | undefined }) {
  if (!partner) return null
  if (partner.doNotContact) return <span className="font-semibold uppercase text-error">Do not contact</span>
  if (!partner.contact) return <span className="text-muted">No contact recorded</span>
  const c = partner.contact
  return (
    <span className="text-muted">
      {[c.name, c.phone ? formatPhone(c.phone) : null, c.whatsapp ? `WhatsApp ${formatPhone(c.whatsapp)}` : null, c.telegram ? `Telegram ${c.telegram}` : null].filter(Boolean).join(' · ')}
    </span>
  )
}

function ReplyForm({ quoteId, line, onDone }: { quoteId: string; line: QuoteLineRow; onDone: () => void }) {
  const [v, setV] = useState({ unitPrice: line.unit_price_cents ? (line.unit_price_cents / 100).toFixed(2) : '', quantity: line.quantity ? String(line.quantity) : '', deliveryCharge: line.delivery_charge_cents ? (line.delivery_charge_cents / 100).toFixed(2) : '', validUntil: line.valid_until ?? '', note: line.note ?? '', saveAsOffer: true })
  const { pending, error, run } = useRun()
  const id = (k: string) => `rp-${line.id}-${k}`
  return (
    <div className="space-y-3 rounded-md bg-stone-50 p-3">
      {error && <FormAlert>{error}</FormAlert>}
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label={`Unit price (ETB per ${unitLabel(line.unit ?? '')})`} htmlFor={id('price')}>
          <Input id={id('price')} value={v.unitPrice} onChange={(e) => setV({ ...v, unitPrice: e.target.value })} inputMode="decimal" />
        </Field>
        <Field label="Quantity" htmlFor={id('qty')}>
          <Input id={id('qty')} value={v.quantity} onChange={(e) => setV({ ...v, quantity: e.target.value })} inputMode="decimal" />
        </Field>
        <Field label="Delivery charge (ETB)" htmlFor={id('delivery')}>
          <Input id={id('delivery')} value={v.deliveryCharge} onChange={(e) => setV({ ...v, deliveryCharge: e.target.value })} inputMode="decimal" />
        </Field>
        <Field label="Valid until" htmlFor={id('valid')}>
          <Input id={id('valid')} type="date" value={v.validUntil} onChange={(e) => setV({ ...v, validUntil: e.target.value })} />
        </Field>
        <Field label="Note" htmlFor={id('note')} className="sm:col-span-4">
          <Input id={id('note')} value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} maxLength={1000} />
        </Field>
      </div>
      <Checkbox id={id('save')} label="Also save as this supplier’s current price" checked={v.saveAsOffer} onChange={(e) => setV({ ...v, saveAsOffer: e.target.checked })} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button className="flex-1" disabled={pending || !v.unitPrice || !v.quantity} onClick={() => run(() => enterReplyAction(quoteId, line.id, v), onDone)}>
          Save reply
        </Button>
        <Button className="flex-1" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

interface Selection {
  key: string
  entry: AskEntry
}

function ItemSuppliers({ quoteId, item, list, lines, partners, offerPrices, readOnly, selected, toggle }: {
  quoteId: string
  item: QuoteItemView
  list: ItemShortlist
  lines: QuoteLineRow[]
  partners: Map<string, PartnerView>
  offerPrices: Record<string, number>
  readOnly: boolean
  selected: Set<string>
  toggle: (s: Selection, on: boolean) => void
}) {
  const [replying, setReplying] = useState<string | null>(null)
  const [manual, setManual] = useState('')
  const [showExcluded, setShowExcluded] = useState(false)
  const { pending, error, run } = useRun()
  const listed = new Set(lines.map((l) => l.org_id))
  const suggestions = list.candidates.filter((c) => !listed.has(c.orgId))
  const sortedLines = [...lines].sort((a, b) => (lineTotal(a) ?? Number.MAX_SAFE_INTEGER) - (lineTotal(b) ?? Number.MAX_SAFE_INTEGER) || a.created_at.localeCompare(b.created_at))
  const replies = sortedLines.filter((l) => ['received', 'chosen'].includes(l.status))
  const cheapest = replies[0]?.id
  const manualChoices = Array.from(partners.values()).filter((p) => ['active', 'terms_agreed'].includes(p.status) && !p.doNotContact && !listed.has(p.orgId)).sort((a, b) => a.name.localeCompare(b.name))
  const candidateEntry = (c: Candidate): Selection => ({ key: `${item.id}|${c.orgId}`, entry: { itemId: item.id, orgId: c.orgId, offerId: c.offerId, unit: c.unit, quantity: c.quantity, reason: c.reason } })

  return (
    <section aria-label={`Suppliers for ${item.name}`} className="space-y-3 rounded-lg border border-border p-3">
      <p className="font-semibold">
        {item.name} <span className="font-normal text-muted">· {qty(item.quantity, item.unit)}</span>
      </p>
      {error && <FormAlert>{error}</FormAlert>}

      {sortedLines.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-small">
            <thead className="text-caption uppercase text-muted">
              <tr>
                <th scope="col" className="w-8 py-2" />
                <th scope="col" className="py-2 pr-3">Supplier</th>
                <th scope="col" className="py-2 pr-3">Status</th>
                <th scope="col" className="py-2 pr-3">Reply</th>
                <th scope="col" className="py-2 pr-3">Delivered total</th>
                <th scope="col" className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedLines.map((l) => {
                const p = partners.get(l.org_id)
                const total = lineTotal(l)
                const listPrice = offerPrices[`${l.org_id}|${item.id}`]
                const diff = l.unit_price_cents !== null && listPrice !== undefined ? l.unit_price_cents - listPrice : null
                return (
                  <Fragment key={l.id}>
                    <tr className={l.id === cheapest ? 'bg-green-soft/60' : ''}>
                      <td className="py-2">
                        {l.status === 'shortlisted' && !readOnly && (
                          <input type="checkbox" aria-label={`Select ${p?.name ?? 'supplier'}`} className="size-5 accent-green" disabled={p?.doNotContact} checked={selected.has(`${item.id}|${l.org_id}`)} onChange={(e) => toggle({ key: `${item.id}|${l.org_id}`, entry: { itemId: item.id, orgId: l.org_id } }, e.target.checked)} />
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <p className="font-semibold">
                          {p?.name}
                          {p?.status === 'terms_agreed' && (
                            <span className="ml-1">
                              <Badge tone="gold">Trial</Badge>
                            </span>
                          )}
                        </p>
                        <ContactLine partner={p} />
                        {l.reason && <p className="text-caption text-muted">{l.reason}</p>}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge tone={STATUS_TONE[l.status] ?? 'neutral'}>{l.status}</Badge>
                        {l.asked_at && <p className="text-caption text-muted">asked {formatDate(l.asked_at)}</p>}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {l.unit_price_cents !== null && l.quantity !== null ? (
                          <>
                            <p>
                              {formatEtbExact(l.unit_price_cents)} × {qty(Number(l.quantity), l.unit ?? item.unit)}
                            </p>
                            {l.delivery_charge_cents ? <p className="text-caption text-muted">+ {formatEtbExact(l.delivery_charge_cents)} delivery</p> : null}
                            {diff !== null && <p className="text-caption text-muted">{diff === 0 ? 'Same as their price list' : `${diff > 0 ? '+' : '−'}${formatEtbExact(Math.abs(diff))} vs their price list`}</p>}
                            {l.valid_until && <p className="text-caption text-muted">valid until {formatDate(l.valid_until)}</p>}
                          </>
                        ) : (
                          <span className="text-muted">No reply yet</span>
                        )}
                        {l.note && <p className="text-caption text-muted">{l.note}</p>}
                      </td>
                      <td className="py-2 pr-3 font-semibold tabular-nums">
                        {total !== null ? formatEtbExact(total) : ''}
                        {l.id === cheapest && replies.length > 1 && <p className="text-caption font-normal text-green">Cheapest</p>}
                      </td>
                      <td className="py-2">
                        {!readOnly && (
                          <div className="flex flex-col items-start gap-1">
                            {['asked', 'received', 'shortlisted'].includes(l.status) && (
                              <button type="button" className="min-h-9 font-semibold text-green" onClick={() => setReplying(replying === l.id ? null : l.id)}>
                                Enter reply
                              </button>
                            )}
                            {l.status === 'received' && (
                              <button type="button" className="min-h-9 font-semibold text-green" disabled={pending} onClick={() => run(() => chooseLineAction(quoteId, l.id))}>
                                Choose
                              </button>
                            )}
                            {l.status === 'chosen' && (
                              <button type="button" className="min-h-9 font-semibold text-green" disabled={pending} onClick={() => run(() => undoChooseAction(quoteId, l.id))}>
                                Undo choice
                              </button>
                            )}
                            {!['chosen', 'rejected'].includes(l.status) && (
                              <button
                                type="button"
                                className="min-h-9 font-semibold text-error"
                                disabled={pending}
                                onClick={() => {
                                  const reason = window.prompt(`Why reject ${p?.name ?? 'this supplier'} for this item?`)
                                  if (reason) run(() => rejectLineAction(quoteId, l.id, reason))
                                }}
                              >
                                Reject
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                    {replying === l.id && (
                      <tr>
                        <td colSpan={6} className="py-2">
                          <ReplyForm quoteId={quoteId} line={l} onDone={() => setReplying(null)} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {suggestions.length > 0 && (
        <div>
          <p className="mb-1 text-caption font-semibold uppercase text-muted">Suggested suppliers</p>
          <ul className="space-y-2">
            {suggestions.map((c) => {
              const p = partners.get(c.orgId)
              const sel = candidateEntry(c)
              return (
                <li key={c.orgId} className="flex gap-3 rounded-md bg-stone-50 p-2 text-small">
                  {!readOnly && <input type="checkbox" aria-label={`Select ${c.partnerName}`} className="mt-1 size-5 shrink-0 accent-green" disabled={c.doNotContact} checked={selected.has(sel.key)} onChange={(e) => toggle(sel, e.target.checked)} />}
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{c.partnerName}</span>
                      {c.trial && <Badge tone="gold">Trial</Badge>}
                      <FreshnessBadge value={c.freshness} />
                      <span className="tabular-nums">
                        {formatEtbExact(c.unitPriceCents)} per {unitLabel(c.unit)} · delivered total <strong>{formatEtbExact(c.deliveredTotalCents)}</strong>
                      </span>
                      {c.leadTimeDays !== null && <span className="text-muted">{c.leadTimeDays === 1 ? '1 day' : `${c.leadTimeDays} days`} lead time</span>}
                    </p>
                    <p className="text-muted">{c.reason}</p>
                    {c.flags.length > 0 && <p className="text-caption font-semibold text-gold-dark">{c.flags.join(' · ')}</p>}
                    <ContactLine partner={p} />
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
      {suggestions.length === 0 && sortedLines.length === 0 && <p className="text-small text-muted">No supplier price matches this item yet. Add one by hand below, or add prices to a partner’s price list.</p>}

      {list.excluded.length > 0 && (
        <div>
          <button type="button" className="min-h-9 text-small font-semibold text-green" aria-expanded={showExcluded} onClick={() => setShowExcluded(!showExcluded)}>
            Not suggested ({list.excluded.length})
          </button>
          {showExcluded && (
            <ul className="mt-1 space-y-1 text-small text-muted">
              {list.excluded.map((e) => (
                <li key={e.orgId}>
                  <span className="font-semibold text-ink">{e.partnerName}</span>: {e.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!readOnly && manualChoices.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <Field label="Add supplier manually" htmlFor={`man-${item.id}`} className="flex-1">
            <Select id={`man-${item.id}`} value={manual} onChange={(e) => setManual(e.target.value)}>
              <option value="">Choose an active or trial partner…</option>
              {manualChoices.map((p) => (
                <option key={p.orgId} value={p.orgId}>
                  {p.name}
                  {p.status === 'terms_agreed' ? ' (trial)' : ''}
                </option>
              ))}
            </Select>
          </Field>
          <Button variant="secondary" disabled={!manual || pending} onClick={() => run(() => addSupplierManuallyAction(quoteId, item.id, manual), () => setManual(''))}>
            Add
          </Button>
        </div>
      )}
    </section>
  )
}

/** Suppliers for each item: suggestions with reasons, who was asked, their replies, the choice, and a total. */
export function QuoteSuppliersPanel({ quoteId, items, shortlists, lines, partners, offerPrices, place, readOnly, isOwner }: {
  quoteId: string
  items: QuoteItemView[]
  shortlists: ItemShortlist[]
  lines: QuoteLineRow[]
  partners: PartnerView[]
  offerPrices: Record<string, number>
  place: string | null
  readOnly: boolean
  isOwner: boolean
}) {
  const [selected, setSelected] = useState<Map<string, AskEntry>>(new Map())
  const [margin, setMargin] = useState('')
  const [commission, setCommission] = useState('')
  const { pending, error, run } = useRun()
  const partnerMap = new Map(partners.map((p) => [p.orgId, p]))
  const toggle = (s: Selection, on: boolean) =>
    setSelected((prev) => {
      const next = new Map(prev)
      if (on) next.set(s.key, s.entry)
      else next.delete(s.key)
      return next
    })

  if (!items.length) return <p className="text-small text-muted">Add the items first (above): suppliers are found for each item.</p>

  // Best known price per partner and item: their reply if they sent one, else their price list.
  const basketItems = items.map((item) => {
    const options = new Map<string, { orgId: string; partnerName: string; totalCents: number }>()
    for (const c of shortlists.find((s) => s.itemId === item.id)?.candidates ?? []) options.set(c.orgId, { orgId: c.orgId, partnerName: c.partnerName, totalCents: c.deliveredTotalCents })
    for (const l of lines.filter((x) => x.quote_item_id === item.id && ['received', 'chosen'].includes(x.status))) {
      const total = lineTotal(l)
      if (total !== null) options.set(l.org_id, { orgId: l.org_id, partnerName: partnerMap.get(l.org_id)?.name ?? '', totalCents: total })
    }
    return { itemId: item.id, options: Array.from(options.values()) }
  })
  const b = basket(basketItems)
  const chosen = lines.filter((l) => l.status === 'chosen')
  const subtotal = chosen.reduce((sum, l) => sum + (lineTotal(l) ?? 0), 0)
  const marginPct = Number(margin)
  const commissionPct = Number(commission)
  const itemName = new Map(items.map((i) => [i.id, i.name]))

  return (
    <div className="space-y-5">
      <p className="text-small text-muted">
        Private to HagerLand. Suggestions use partners’ current prices{place ? ` and delivery to ${place}` : ''}. You contact suppliers yourself: nothing is sent automatically.
      </p>
      {error && <FormAlert>{error}</FormAlert>}
      {items.map((item) => (
        <ItemSuppliers
          key={item.id}
          quoteId={quoteId}
          item={item}
          list={shortlists.find((s) => s.itemId === item.id) ?? { itemId: item.id, candidates: [], excluded: [] }}
          lines={lines.filter((l) => l.quote_item_id === item.id)}
          partners={partnerMap}
          offerPrices={offerPrices}
          readOnly={readOnly}
          selected={new Set(selected.keys())}
          toggle={toggle}
        />
      ))}
      {!readOnly && (
        <div className="sticky bottom-2 flex flex-col gap-2 rounded-lg border border-border bg-white p-3 shadow-sm sm:flex-row sm:items-center">
          <p className="flex-1 text-small">{selected.size === 0 ? 'Tick the suppliers you are going to contact.' : `${selected.size} selected. Contact them yourself (phone, WhatsApp or Telegram), then mark them as asked.`}</p>
          <Button disabled={!selected.size || pending} onClick={() => run(() => markAskedAction(quoteId, Array.from(selected.values())), () => setSelected(new Map()))}>
            Mark as asked
          </Button>
        </div>
      )}

      <div className="rounded-lg border border-border p-3">
        <p className="font-semibold">Basket: one supplier or several?</p>
        <p className="mt-1 text-small">{b.explanation}</p>
        {b.partners.length > 0 && (
          <table className="mt-2 w-full text-left text-small">
            <thead className="text-caption uppercase text-muted">
              <tr>
                <th scope="col" className="py-1 pr-3">Supplier</th>
                <th scope="col" className="py-1 pr-3">Items covered</th>
                <th scope="col" className="py-1">Total for those items</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {b.partners.map((p) => (
                <tr key={p.orgId} className={b.recommendation.kind === 'single' && b.recommendation.orgId === p.orgId ? 'bg-green-soft/60' : ''}>
                  <td className="py-1 pr-3">{p.partnerName}</td>
                  <td className="py-1 pr-3">
                    {p.itemsCovered} of {items.length}
                  </td>
                  <td className="py-1 tabular-nums">{formatEtbExact(p.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {b.recommendation.kind === 'split' && b.split.picks.length > 0 && (
          <ul className="mt-2 list-disc pl-6 text-small text-muted">
            {b.split.picks.map((pick) => (
              <li key={pick.itemId}>
                {itemName.get(pick.itemId)}: {pick.partnerName}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-border p-3">
        <p className="font-semibold">Suggested total</p>
        <p className="mt-1 text-small text-muted">
          {chosen.length} of {items.length} items have a chosen supplier.
        </p>
        <p className="mt-2 font-display text-h3 font-bold tabular-nums">Cost: {formatEtbExact(subtotal)}</p>
        <p className="text-caption text-muted">Chosen suppliers’ price × quantity, plus their delivery charges.</p>
        {isOwner && (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Field label="Margin % (HagerLand sells to the customer)" htmlFor="qs-margin">
                <Input id="qs-margin" value={margin} onChange={(e) => setMargin(e.target.value)} inputMode="decimal" placeholder="e.g. 8" />
              </Field>
              {margin && Number.isFinite(marginPct) && marginPct >= 0 && (
                <p className="text-small tabular-nums">
                  Cost {formatEtbExact(subtotal)} + margin {formatEtbExact(Math.round((subtotal * marginPct) / 100))} = <strong>{formatEtbExact(subtotal + Math.round((subtotal * marginPct) / 100))}</strong> to the customer
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Field label="Commission % (customer pays the suppliers)" htmlFor="qs-commission">
                <Input id="qs-commission" value={commission} onChange={(e) => setCommission(e.target.value)} inputMode="decimal" placeholder="e.g. 5" />
              </Field>
              {commission && Number.isFinite(commissionPct) && commissionPct >= 0 && (
                <p className="text-small tabular-nums">
                  Customer pays suppliers {formatEtbExact(subtotal)}; HagerLand would earn <strong>{formatEtbExact(Math.round((subtotal * commissionPct) / 100))}</strong>
                </p>
              )}
            </div>
            <p className="text-caption text-muted sm:col-span-2">Worked out on screen only: margins and commission are not saved yet.</p>
          </div>
        )}
        <p className="mt-3 text-small font-semibold">Copy the price into “Issue the quote” on this page. Nothing is sent automatically.</p>
      </div>
    </div>
  )
}
