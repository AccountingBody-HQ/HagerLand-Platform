'use client'

import { useState } from 'react'
import { cn } from '@/lib/cn'
import { controlClasses } from './Field'

const fmt = new Intl.NumberFormat('en-ET')

/** Whole-birr amount with thousands separators while typing. Submits plain digits as `name`. */
export function PriceInput({
  id,
  name,
  defaultValue,
  placeholder,
  invalid,
  describedById,
  suffix,
}: {
  id: string
  name: string
  defaultValue?: number | null
  placeholder?: string
  invalid?: boolean
  describedById?: string
  suffix?: string
}) {
  const [digits, setDigits] = useState(defaultValue ? String(defaultValue) : '')
  return (
    <div className="relative">
      <input type="hidden" name={name} value={digits} />
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-small font-semibold text-muted">ETB</span>
      <input
        id={id}
        inputMode="numeric"
        value={digits ? fmt.format(Number(digits)) : ''}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={describedById}
        onChange={(e) => setDigits(e.target.value.replace(/\D/g, '').slice(0, 13))}
        className={cn(controlClasses, 'h-11 pl-12 tabular-nums', suffix && 'pr-20')}
      />
      {suffix && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-small text-muted">{suffix}</span>}
    </div>
  )
}
