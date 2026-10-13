'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { saveRatesAction } from '@/app/roodber8/actions/rates'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'

export function RatesForm({ rows }: { rows: { currency: string; name: string; value: string; updated: string }[] }) {
  const [values, setValues] = useState(Object.fromEntries(rows.map((r) => [r.currency, r.value])))
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const res = await saveRatesAction(values)
          toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
          if (res.ok) router.refresh()
        })
      }}
    >
      <table className="w-full text-left text-small">
        <thead className="text-caption uppercase tracking-wide text-muted">
          <tr>
            <th scope="col" className="py-2">Currency</th>
            <th scope="col" className="py-2">Birr for one unit</th>
            <th scope="col" className="py-2">Last updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.currency}>
              <td className="py-2 pr-3 font-semibold">
                {r.currency} <span className="font-normal text-muted">{r.name}</span>
              </td>
              <td className="py-2 pr-3">
                <label className="sr-only" htmlFor={`rate-${r.currency}`}>
                  Birr for one {r.currency}
                </label>
                <Input id={`rate-${r.currency}`} inputMode="decimal" value={values[r.currency] ?? ''} placeholder="Not set" onChange={(e) => setValues({ ...values, [r.currency]: e.target.value })} className="h-10 max-w-40" />
              </td>
              <td className="py-2 text-muted">{r.updated}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button type="submit" className="mt-4" disabled={pending}>
        Save rates
      </Button>
    </form>
  )
}
