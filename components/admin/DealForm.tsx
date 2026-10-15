'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { saveDealAction } from '@/app/roodber8/actions/deals'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { CURRENCIES } from '@/lib/countries'

export interface DealValues {
  id?: string
  source_reference?: string
  title: string
  currency: string
  value: string
  commission: string
  lead_fee: string
  status: string
  notes: string
}

export function DealForm({ initial, compact }: { initial?: DealValues; compact?: boolean }) {
  const blank: DealValues = { title: '', currency: 'ETB', value: '', commission: '', lead_fee: '', status: 'open', notes: '', source_reference: '' }
  const [v, setV] = useState<DealValues>(initial ?? blank)
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  const id = (n: string) => `deal-${initial?.id ?? 'new'}-${n}`
  return (
    <form
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const res = await saveDealAction({ ...v, id: initial?.id ?? '' } as Record<string, string>)
          toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
          if (res.ok) {
            if (!initial) setV(blank)
            router.refresh()
          }
        })
      }}
    >
      {!compact && (
        <>
          <Field label="Title" htmlFor={id('title')} className="sm:col-span-2">
            <Input id={id('title')} value={v.title} maxLength={200} onChange={(e) => setV({ ...v, title: e.target.value })} />
          </Field>
          <Field label="Lead reference" htmlFor={id('ref')} optional hint="HLE-, HLS- or HLQ-…">
            <Input id={id('ref')} value={v.source_reference ?? ''} onChange={(e) => setV({ ...v, source_reference: e.target.value })} />
          </Field>
        </>
      )}
      <Field label="Status" htmlFor={id('status')}>
        <Select id={id('status')} value={v.status} onChange={(e) => setV({ ...v, status: e.target.value })} className="h-10">
          {['open', 'won', 'lost', 'invoiced', 'paid'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Select>
      </Field>
      <Field label="Currency" htmlFor={id('cur')}>
        <Select id={id('cur')} value={v.currency} onChange={(e) => setV({ ...v, currency: e.target.value })} className="h-10">
          {CURRENCIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </Select>
      </Field>
      <Field label="Deal value" htmlFor={id('val')}>
        <Input id={id('val')} inputMode="decimal" className="h-10" value={v.value} onChange={(e) => setV({ ...v, value: e.target.value })} />
      </Field>
      <Field label="Commission" htmlFor={id('com')}>
        <Input id={id('com')} inputMode="decimal" className="h-10" value={v.commission} onChange={(e) => setV({ ...v, commission: e.target.value })} />
      </Field>
      <Field label="Lead fee" htmlFor={id('fee')}>
        <Input id={id('fee')} inputMode="decimal" className="h-10" value={v.lead_fee} onChange={(e) => setV({ ...v, lead_fee: e.target.value })} />
      </Field>
      {!compact && (
        <Field label="Notes" htmlFor={id('notes')} className="sm:col-span-2 lg:col-span-4">
          <Textarea id={id('notes')} rows={2} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />
        </Field>
      )}
      <div className="flex items-end">
        <Button type="submit" size="sm" disabled={pending}>
          {initial ? 'Save' : 'Add deal'}
        </Button>
      </div>
    </form>
  )
}
