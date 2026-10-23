'use client'

import { useRouter } from 'next/navigation'
import { Fragment, useRef, useState, useTransition } from 'react'
import { FileText } from 'lucide-react'
import { confirmPasteAction, createOfferAction, previewPasteAction, withdrawOfferAction, type PastePreviewRow } from '@/app/roodber8/actions/supplier-offers'
import { addDays, defaultValidityDays, FRESHNESS_LABEL, OFFER_SOURCES, VAT_OPTIONS, type Freshness } from '@/lib/supply/offers'
import { CONFIDENCE_LEVELS } from '@/lib/supply/partners'
import { UNITS, unitLabel } from '@/lib/units'
import { formatDate, formatETBCents } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Field'
import { Combobox, type ComboOption } from '@/components/ui/Combobox'
import { useToast } from '@/components/ui/Toast'
import { FormAlert } from '@/components/forms/FormParts'
import { LocationMultiPicker } from '@/components/forms/LocationMultiPicker'
import { FileDrop } from '@/components/media/FileDrop'

type Result = { ok: true; data: { message: string } } | { ok: false; error: string }
export interface CategoryOption {
  id: string
  name: string
  slug: string
}
export interface ProductOption {
  id: string
  name: string
  categoryId: string
}

const FRESHNESS_TONE: Record<Freshness, 'green' | 'warning' | 'danger'> = { fresh: 'green', ageing: 'warning', expired: 'danger' }

export function FreshnessBadge({ value }: { value: Freshness }) {
  return <Badge tone={FRESHNESS_TONE[value]}>{FRESHNESS_LABEL[value]}</Badge>
}

function useSave() {
  const [pending, start] = useTransition()
  const [error, setError] = useState('')
  const toast = useToast()
  const router = useRouter()
  return {
    pending,
    error,
    save: (fn: () => Promise<Result>, after?: () => void) =>
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

/** Details shared by one price or a whole pasted list: date, validity, delivery, VAT, source and evidence. */
function SharedFields({ orgId, prefix, branches, validHint, onDateChange, onFxChange, validUntil, setValidUntil }: {
  orgId: string
  prefix: string
  branches: { id: string; name: string }[]
  validHint: string
  onDateChange: (v: string) => void
  onFxChange: (v: boolean) => void
  validUntil: string
  setValidUntil: (v: string) => void
}) {
  const [docs, setDocs] = useState<{ path: string; name: string }[]>([])
  const id = (k: string) => `${prefix}-${k}`
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Price date" htmlFor={id('date')} required>
          <Input id={id('date')} name="price_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} onChange={(e) => onDateChange(e.target.value)} />
        </Field>
        <Field label="Valid until" htmlFor={id('valid')} hint={validHint}>
          <Input id={id('valid')} name="valid_until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </Field>
        {branches.length > 0 && (
          <Field label="Branch" htmlFor={id('branch')}>
            <Select id={id('branch')} name="branch_id" defaultValue="">
              <option value="">Whole business</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Minimum order" htmlFor={id('min')} hint="In the unit of the price">
          <Input id={id('min')} name="min_order_qty" inputMode="decimal" />
        </Field>
        <Field label="Delivers to" htmlFor={id('areas')} hint="Leave empty if not known" className="sm:col-span-2">
          <LocationMultiPicker id={id('areas')} name="delivery_area_ids" />
        </Field>
        <Field label="Delivery charge (ETB)" htmlFor={id('charge')}>
          <Input id={id('charge')} name="delivery_charge" inputMode="decimal" />
        </Field>
        <Field label="Lead time (days)" htmlFor={id('lead')}>
          <Input id={id('lead')} name="lead_time_days" inputMode="numeric" />
        </Field>
        <Field label="Delivery note" htmlFor={id('dnote')} className="sm:col-span-2" hint="For example: “Free delivery in Addis Ababa over 50 bags”">
          <Input id={id('dnote')} name="delivery_note" maxLength={500} />
        </Field>
        <Field label="VAT included?" htmlFor={id('vat')}>
          <Select id={id('vat')} name="vat_included" defaultValue="unknown">
            {VAT_OPTIONS.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-end">
          <Checkbox id={id('fx')} name="fx_linked" label="Imported or priced in foreign currency" onChange={(e) => onFxChange(e.target.checked)} />
        </div>
        <Field label="Where this price came from" htmlFor={id('source')} required>
          <Select id={id('source')} name="source" defaultValue="">
            <option value="" disabled>
              Choose…
            </option>
            {OFFER_SOURCES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Confidence" htmlFor={id('conf')}>
          <Select id={id('conf')} name="confidence" defaultValue="">
            <option value="">Not recorded</option>
            {CONFIDENCE_LEVELS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Source note" htmlFor={id('snote')} className="sm:col-span-2" hint="For example: “Telegram photo from the sales desk”">
          <Input id={id('snote')} name="source_note" maxLength={500} />
        </Field>
      </div>
      {docs.map((d) => (
        <input key={d.path} type="hidden" name="evidence_paths" value={d.path} />
      ))}
      {docs.length > 0 && <p className="text-small text-muted">Attached: {docs.map((d) => d.name).join(', ')}</p>}
      <FileDrop
        target={{ purpose: 'private', area: 'supply', id: orgId }}
        accept="image/jpeg,image/png,image/webp,application/pdf"
        label="Attach the price list (photo or PDF)"
        hint="Optional. Private: never shown on the site."
        onDocUploaded={(doc) => setDocs((all) => [...all, { path: doc.path, name: doc.name }].slice(0, 10))}
      />
    </>
  )
}

function validityHint(days: number) {
  return `Prefilled: ${days} days (7 for cement and reinforcement steel, 14 if imported or priced in foreign currency, 30 otherwise). Change it if the partner said otherwise.`
}

export function AddOfferForm({ orgId, categories, products, branches, onDone }: { orgId: string; categories: CategoryOption[]; products: ProductOption[]; branches: { id: string; name: string }[]; onDone: () => void }) {
  const form = useRef<HTMLFormElement>(null)
  const [product, setProduct] = useState<ComboOption | null>(null)
  const [categoryId, setCategoryId] = useState('')
  const [itemName, setItemName] = useState('')
  const [priceDate, setPriceDate] = useState(new Date().toISOString().slice(0, 10))
  const [fx, setFx] = useState(false)
  const [validEdited, setValidEdited] = useState<string | null>(null)
  const { pending, error, save } = useSave()
  const category = categories.find((c) => c.id === (product ? products.find((p) => p.id === product.value)?.categoryId : categoryId))
  const days = defaultValidityDays({ categorySlug: category?.slug, itemName: product?.label ?? itemName, fxLinked: fx })
  const validUntil = validEdited ?? (priceDate ? addDays(priceDate, days) : '')
  return (
    <form ref={form} className="space-y-4" onSubmit={(e) => {
      e.preventDefault()
      if (form.current) save(() => createOfferAction(orgId, new FormData(form.current as HTMLFormElement)), onDone)
    }}>
      {error && <FormAlert>{error}</FormAlert>}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Catalogue product" htmlFor="of-product" hint="Pick one if HagerLand already lists it, or leave empty and type the item below." className="sm:col-span-2">
          <Combobox id="of-product" name="product_id" options={products.map((p) => ({ value: p.id, label: p.name }))} onChange={setProduct} placeholder="Search catalogue products…" />
        </Field>
        {!product && (
          <>
            <Field label="Category" htmlFor="of-category" required>
              <Select id="of-category" name="category_id" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Choose…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Item" htmlFor="of-item" required hint="As the partner names it, e.g. “Dangote OPC 42.5 cement 50 kg”">
              <Input id="of-item" name="item_name" value={itemName} onChange={(e) => setItemName(e.target.value)} maxLength={200} />
            </Field>
          </>
        )}
        <Field label="Unit" htmlFor="of-unit" required>
          <Select id="of-unit" name="unit" defaultValue="">
            <option value="" disabled>
              Choose…
            </option>
            {UNITS.map((u) => (
              <option key={u.value} value={u.value}>
                {u.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Pack size" htmlFor="of-pack" hint="Optional, e.g. 50 for a 50 kg bag">
          <Input id="of-pack" name="pack_size" inputMode="decimal" />
        </Field>
        <Field label="Price (ETB)" htmlFor="of-price" required hint="Per unit, e.g. 1250 or 1,250.50">
          <Input id="of-price" name="price" inputMode="decimal" />
        </Field>
      </div>
      <SharedFields orgId={orgId} prefix="of" branches={branches} validHint={validityHint(days)} onDateChange={setPriceDate} onFxChange={setFx} validUntil={validUntil} setValidUntil={setValidEdited} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" className="flex-1" disabled={pending}>
          Save price
        </Button>
        <Button type="button" variant="secondary" className="flex-1" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

export function PastePriceList({ orgId, categories, branches, onDone }: { orgId: string; categories: CategoryOption[]; branches: { id: string; name: string }[]; onDone: () => void }) {
  const form = useRef<HTMLFormElement>(null)
  const [text, setText] = useState('')
  const [rows, setRows] = useState<PastePreviewRow[] | null>(null)
  const [chosen, setChosen] = useState<Record<string, string>>({})
  const [priceDate, setPriceDate] = useState(new Date().toISOString().slice(0, 10))
  const [fx, setFx] = useState(false)
  const [validUntil, setValidUntil] = useState('')
  const { pending, error, save } = useSave()
  const [previewError, setPreviewError] = useState('')
  const [previewing, startPreview] = useTransition()
  const preview = () =>
    startPreview(async () => {
      setPreviewError('')
      const res = await previewPasteAction(orgId, text, priceDate, fx)
      if (res.ok) setRows(res.data.rows)
      else {
        setRows(null)
        setPreviewError(res.error)
      }
    })
  const ready = rows !== null && rows.length > 0 && rows.every((r) => r.errors.length === 0 && (r.match?.categoryId || chosen[String(r.line)]))
  return (
    <form ref={form} className="space-y-4" onSubmit={(e) => {
      e.preventDefault()
      if (form.current && ready) save(() => confirmPasteAction(orgId, text, chosen, new FormData(form.current as HTMLFormElement)), onDone)
    }}>
      <Field label="Price list" htmlFor="pl-text" hint="One price per line: item, unit, price, and optionally pack size. Commas, semicolons or tabs between them (copying from a spreadsheet works). Write 1,250 without a space after the comma.">
        <Textarea id="pl-text" rows={6} value={text} onChange={(e) => {
          setText(e.target.value)
          setRows(null)
        }} placeholder={'Dangote cement 50kg, bag, 1250\nRebar 12mm, piece, 980\nHollow block 20cm, piece, 38.5'} className="font-mono text-small" />
      </Field>
      <Button type="button" variant="secondary" onClick={preview} loading={previewing} disabled={!text.trim()}>
        Check the list
      </Button>
      {previewError && <FormAlert>{previewError}</FormAlert>}
      {rows && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-small">
            <thead className="text-caption uppercase text-muted">
              <tr>
                <th scope="col" className="py-2 pr-3">Line</th>
                <th scope="col" className="py-2 pr-3">Item</th>
                <th scope="col" className="py-2 pr-3">Unit</th>
                <th scope="col" className="py-2 pr-3">Price</th>
                <th scope="col" className="py-2 pr-3">Item already known?</th>
                <th scope="col" className="py-2">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => (
                <tr key={r.line} className={r.errors.length ? 'bg-error/5' : ''}>
                  <td className="py-2 pr-3 tabular-nums">{r.line}</td>
                  <td className="py-2 pr-3">
                    {r.item}
                    {r.packSize && <span className="text-muted"> · pack {r.packSize}</span>}
                    {r.errors.map((e) => (
                      <p key={e} className="font-semibold text-error">
                        {e}
                      </p>
                    ))}
                  </td>
                  <td className="py-2 pr-3">{r.unit ? unitLabel(r.unit) : ''}</td>
                  <td className="py-2 pr-3 tabular-nums">{formatETBCents(r.priceCents)}</td>
                  <td className="py-2 pr-3">
                    {r.match ? (r.match.currentCents !== null ? `Yes: replaces ${formatETBCents(r.match.currentCents)}` : 'Yes: earlier price on file') : 'New item'}
                  </td>
                  <td className="py-2">
                    {r.match?.categoryId ? (
                      r.match.categoryName
                    ) : (
                      <Select aria-label={`Category for line ${r.line}`} value={chosen[String(r.line)] ?? ''} onChange={(e) => setChosen({ ...chosen, [String(r.line)]: e.target.value })} className="h-9">
                        <option value="">Choose…</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </Select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows && (
        <>
          <p className="text-small font-semibold">Details for every line in this list</p>
          <SharedFields
            orgId={orgId}
            prefix="pl"
            branches={branches}
            validHint="Leave empty to use each item’s default: 7 days for cement and reinforcement steel, 14 if imported or priced in foreign currency, 30 otherwise."
            onDateChange={setPriceDate}
            onFxChange={setFx}
            validUntil={validUntil}
            setValidUntil={setValidUntil}
          />
          {error && <FormAlert>{error}</FormAlert>}
          {!ready && <p className="text-small text-muted">Fix the lines in red and choose a category for each new item. Nothing is saved until every line is ready.</p>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" className="flex-1" disabled={pending || !ready}>
              Save {rows.length === 1 ? '1 price' : `${rows.length} prices`}
            </Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={onDone}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </form>
  )
}

export interface OfferView {
  id: string
  item: string
  categoryName: string | null
  unit: string
  packSize: number | null
  priceCents: number
  priceDate: string
  validUntil: string
  status: string
  freshness: Freshness
  delivery: string
  leadTimeDays: number | null
  source: string
  confidence: string | null
  evidence: { url: string | null }[]
  updatedAt: string
  history: { id: string; priceCents: number; priceDate: string; validUntil: string; status: string }[]
}

export function OffersTable({ orgId, offers }: { orgId: string; offers: OfferView[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const { pending, error, save } = useSave()
  if (!offers.length) return <p className="text-small text-muted">No prices match these filters.</p>
  return (
    <div className="space-y-2">
      {error && <FormAlert>{error}</FormAlert>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-small">
          <thead className="text-caption uppercase text-muted">
            <tr>
              <th scope="col" className="py-2 pr-3">Item</th>
              <th scope="col" className="py-2 pr-3">Price</th>
              <th scope="col" className="py-2 pr-3">Delivery</th>
              <th scope="col" className="py-2 pr-3">Dated</th>
              <th scope="col" className="py-2 pr-3">Valid until</th>
              <th scope="col" className="py-2 pr-3">Source</th>
              <th scope="col" className="py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {offers.map((o) => (
              <Fragment key={o.id}>
                <tr className={o.status !== 'current' ? 'text-muted' : ''}>
                  <td className="py-2 pr-3">
                    <p className="font-semibold">{o.item}</p>
                    <p className="text-caption text-muted">
                      {[o.categoryName, `per ${unitLabel(o.unit)}`, o.packSize ? `pack ${o.packSize}` : null].filter(Boolean).join(' · ')}
                    </p>
                  </td>
                  <td className="py-2 pr-3 font-semibold tabular-nums">{formatETBCents(o.priceCents)}</td>
                  <td className="py-2 pr-3">
                    {o.delivery}
                    {o.leadTimeDays !== null && <p className="text-caption text-muted">{o.leadTimeDays === 1 ? '1 day' : `${o.leadTimeDays} days`} lead time</p>}
                  </td>
                  <td className="py-2 pr-3">{formatDate(o.priceDate)}</td>
                  <td className="py-2 pr-3">
                    <p>{formatDate(o.validUntil)}</p>
                    {o.status === 'current' ? <FreshnessBadge value={o.freshness} /> : <Badge tone="neutral">{o.status}</Badge>}
                  </td>
                  <td className="py-2 pr-3">
                    <p>{OFFER_SOURCES.find((s) => s.value === o.source)?.label ?? o.source}</p>
                    {o.confidence && <p className="text-caption text-muted">Confidence: {o.confidence}</p>}
                    {o.evidence.map((e, i) =>
                      e.url ? (
                        <a key={i} href={e.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1 font-semibold text-green underline">
                          <FileText className="size-4" aria-hidden /> Price list {o.evidence.length > 1 ? i + 1 : ''}
                        </a>
                      ) : null,
                    )}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-col items-start gap-1">
                      {o.history.length > 0 && (
                        <button type="button" className="min-h-9 font-semibold text-green" aria-expanded={open === o.id} onClick={() => setOpen(open === o.id ? null : o.id)}>
                          History ({o.history.length})
                        </button>
                      )}
                      {o.status === 'current' && (
                        <button type="button" className="min-h-9 font-semibold text-error" disabled={pending} onClick={() => window.confirm(`Mark “${o.item}” as withdrawn? Use this when the partner no longer sells it.`) && save(() => withdrawOfferAction(orgId, o.id, o.updatedAt))}>
                          Withdraw
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {open === o.id && (
                  <tr>
                    <td colSpan={7} className="bg-stone-50 px-3 py-2">
                      <p className="mb-1 text-caption font-semibold uppercase text-muted">Earlier prices for {o.item}</p>
                      <ul className="space-y-1">
                        {o.history.map((h) => (
                          <li key={h.id} className="tabular-nums">
                            {formatETBCents(h.priceCents)} · dated {formatDate(h.priceDate)} · valid until {formatDate(h.validUntil)} · {h.status}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/** "Add price" and "Paste a price list" buttons that open their forms in place. */
export function OfferActions({ orgId, categories, products, branches }: { orgId: string; categories: CategoryOption[]; products: ProductOption[]; branches: { id: string; name: string }[] }) {
  const [mode, setMode] = useState<'none' | 'add' | 'paste'>('none')
  if (mode === 'add') return <AddOfferForm orgId={orgId} categories={categories} products={products} branches={branches} onDone={() => setMode('none')} />
  if (mode === 'paste') return <PastePriceList orgId={orgId} categories={categories} branches={branches} onDone={() => setMode('none')} />
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Button className="flex-1" onClick={() => setMode('add')}>
        Add price
      </Button>
      <Button className="flex-1" variant="secondary" onClick={() => setMode('paste')}>
        Paste a price list
      </Button>
    </div>
  )
}
