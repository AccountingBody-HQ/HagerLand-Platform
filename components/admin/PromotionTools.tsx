'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { createPromotionAction, findPromotableAction, updatePromotionEndAction } from '@/app/roodber8/actions/promotions'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select } from '@/components/ui/Field'
import { FormAlert } from '@/components/forms/FormParts'
import { useToast } from '@/components/ui/Toast'

const today = () => new Date().toISOString().slice(0, 10)
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10)

export function NewPromotion() {
  const [type, setType] = useState('property')
  const [term, setTerm] = useState('')
  const [options, setOptions] = useState<{ id: string; label: string }[]>([])
  const [entityId, setEntityId] = useState('')
  const [kind, setKind] = useState('featured')
  const [starts, setStarts] = useState(today())
  const [ends, setEnds] = useState(inDays(30))
  const [paid, setPaid] = useState(false)
  const [price, setPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()

  useEffect(() => {
    const t = setTimeout(async () => {
      const res = await findPromotableAction(type, term)
      if (res.ok) {
        setOptions(res.data.options)
        setEntityId((cur) => (res.data.options.some((o) => o.id === cur) ? cur : res.data.options[0]?.id ?? ''))
      }
    }, 300)
    return () => clearTimeout(t)
  }, [type, term])

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {error && <FormAlert className="sm:col-span-2">{error}</FormAlert>}
      <Field label="What to promote" htmlFor="pm-type">
        <Select id="pm-type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="property">Property</option>
          <option value="development">Development</option>
          <option value="organisation">Company</option>
          <option value="product">Product</option>
        </Select>
      </Field>
      <Field label="Find by name, reference or id" htmlFor="pm-term">
        <Input id="pm-term" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Type at least 2 characters" />
      </Field>
      <Field label="Record" htmlFor="pm-entity" className="sm:col-span-2">
        <Select id="pm-entity" value={entityId} onChange={(e) => setEntityId(e.target.value)} disabled={!options.length}>
          {options.length ? options.map((o) => <option key={o.id} value={o.id}>{o.label}</option>) : <option value="">{term.trim().length < 2 ? 'Search above first' : 'Nothing found'}</option>}
        </Select>
      </Field>
      <Field label="Placement" htmlFor="pm-kind">
        <Select id="pm-kind" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="featured">Featured (badge + top of results)</option>
          <option value="spotlight">Spotlight carousel</option>
          <option value="top_of_search">Top of search</option>
          <option value="homepage">Homepage</option>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Starts" htmlFor="pm-start">
          <Input id="pm-start" type="date" value={starts} onChange={(e) => setStarts(e.target.value)} />
        </Field>
        <Field label="Ends" htmlFor="pm-end">
          <Input id="pm-end" type="date" value={ends} onChange={(e) => setEnds(e.target.value)} />
        </Field>
      </div>
      <label className="flex min-h-11 items-center gap-2 text-small">
        <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="size-5 accent-green" /> Paid placement
      </label>
      <Field label="Price (ETB)" htmlFor="pm-price" optional>
        <Input id="pm-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
      </Field>
      <Field label="Notes" htmlFor="pm-notes" optional className="sm:col-span-2">
        <Input id="pm-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
      </Field>
      <div className="sm:col-span-2">
        <Button
          disabled={pending || !entityId}
          onClick={() =>
            start(async () => {
              const res = await createPromotionAction({ entity_type: type, entity_id: entityId, kind, starts, ends, paid, price_etb: price, notes })
              if (!res.ok) return setError(res.error)
              setError(null)
              toast(res.data.message, 'success')
              setTerm('')
              router.refresh()
            })
          }
        >
          Create promotion
        </Button>
      </div>
    </div>
  )
}

export function PromotionEndTool({ id, active }: { id: string; active: boolean }) {
  const [date, setDate] = useState('')
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  const run = (ends: string | null) =>
    start(async () => {
      const res = await updatePromotionEndAction(id, ends)
      toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
      if (res.ok) router.refresh()
    })
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input type="date" aria-label="New end date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-40" />
      <Button size="sm" variant="secondary" disabled={pending || !date} onClick={() => run(date)}>
        {active ? 'Change end' : 'Restart until'}
      </Button>
      {active && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(null)}>
          End now
        </Button>
      )}
    </div>
  )
}
