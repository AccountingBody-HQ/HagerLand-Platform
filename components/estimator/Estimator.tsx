'use client'

import { useMemo, useState } from 'react'
import { Calculator } from 'lucide-react'
import { FINISHES, FLOOR_OPTIONS, estimateCost, pickRate, type Rate } from '@/lib/estimator'
import { formatDate, formatETB } from '@/lib/format'
import { Field, Input, Select } from '@/components/ui/Field'

/** "How much to build a G+1?" — an estimate only, from HagerLand's indicative rates (spec 25.2h). */
export function Estimator({ rates }: { rates: Rate[] }) {
  const places = useMemo(() => {
    const named = Array.from(new Map(rates.filter((r) => r.location_id).map((r) => [r.location_id as string, r.location_name ?? ''])).entries())
    return [...named.map(([id, name]) => ({ id, name })), ...(rates.some((r) => r.location_id === null) ? [{ id: '', name: 'Elsewhere in Ethiopia' }] : [])]
  }, [rates])
  const [place, setPlace] = useState(places[0]?.id ?? '')
  const finishes = FINISHES.filter((f) => pickRate(rates, place || null, f.value))
  const [finish, setFinish] = useState<string>(finishes[0]?.value ?? 'standard')
  const [floors, setFloors] = useState(2)
  const [footprint, setFootprint] = useState('120')
  const rate = pickRate(rates, place || null, finish) ?? pickRate(rates, place || null, finishes[0]?.value ?? '')
  const result = rate ? estimateCost(Number(footprint), floors, rate.rate_etb_per_m2) : null
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Where will you build?" htmlFor="est-place">
          <Select id="est-place" value={place} onChange={(e) => setPlace(e.target.value)}>
            {places.map((p) => (
              <option key={p.id || 'all'} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="How many floors?" htmlFor="est-floors">
          <Select id="est-floors" value={floors} onChange={(e) => setFloors(Number(e.target.value))}>
            {FLOOR_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Floor area of each storey (m²)" htmlFor="est-area" hint="The built area of one floor, e.g. 120 m².">
          <Input id="est-area" type="number" inputMode="numeric" min={10} max={100000} value={footprint} onChange={(e) => setFootprint(e.target.value)} />
        </Field>
        <Field label="Finish" htmlFor="est-finish">
          <Select id="est-finish" value={rate?.finish ?? finish} onChange={(e) => setFinish(e.target.value)}>
            {finishes.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="rounded-xl border border-gold/40 bg-gold-soft/40 p-6" aria-live="polite">
        <p className="flex items-center gap-2 text-small font-semibold uppercase tracking-wide text-muted">
          <Calculator className="size-4" aria-hidden /> Estimate only
        </p>
        {result && rate ? (
          <>
            <p className="mt-2 font-display text-h1 font-extrabold tabular-nums text-ink">{formatETB(result.total)}</p>
            <p className="mt-2 text-small text-muted">
              {result.areaM2.toLocaleString('en')} m² in total × {formatETB(rate.rate_etb_per_m2)} per m² ({FINISHES.find((f) => f.value === rate.finish)?.label.toLowerCase()}, {rate.location_name ?? 'Ethiopia'}). Rate updated {formatDate(rate.updated_at)}.
            </p>
          </>
        ) : (
          <p className="mt-2 text-muted">Enter the floor area to see an estimate.</p>
        )}
        <p className="mt-4 text-small text-muted">This is a rough guide from HagerLand&apos;s indicative rates, not a quote. Real costs depend on your design, site, materials and contractor. Get quotes before you decide.</p>
      </div>
    </div>
  )
}
