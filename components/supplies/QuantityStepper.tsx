'use client'

import { Minus, Plus } from 'lucide-react'
import { unitLabel } from '@/lib/units'

export function QuantityStepper({ value, onChange, unit, min = 1, id }: { value: number; onChange: (v: number) => void; unit: string; min?: number; id: string }) {
  const step = (d: number) => onChange(Math.max(min, Math.round((value + d) * 100) / 100))
  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex items-center rounded-md border border-border-strong">
        <button type="button" onClick={() => step(-1)} disabled={value <= min} aria-label="Decrease quantity" className="inline-flex size-11 items-center justify-center disabled:opacity-40">
          <Minus className="size-4" />
        </button>
        <label htmlFor={id} className="sr-only">
          Quantity
        </label>
        <input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(e) => {
            const n = Number(e.target.value.replace(',', '.'))
            if (Number.isFinite(n) && n >= 0) onChange(n)
          }}
          onBlur={() => value < min && onChange(min)}
          className="h-11 w-16 border-x border-border-strong text-center text-body tabular-nums outline-none"
        />
        <button type="button" onClick={() => step(1)} aria-label="Increase quantity" className="inline-flex size-11 items-center justify-center">
          <Plus className="size-4" />
        </button>
      </div>
      <span className="text-small text-muted">{unitLabel(unit, value)}</span>
    </div>
  )
}
