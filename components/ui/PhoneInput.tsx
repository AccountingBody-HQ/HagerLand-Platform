'use client'

import { useState } from 'react'
import { cn } from '@/lib/cn'
import { controlClasses } from './Field'

const CODES = [
  { code: '+251', label: 'Ethiopia +251' },
  { code: '+1', label: 'USA / Canada +1' },
  { code: '+44', label: 'UK +44' },
  { code: '+971', label: 'UAE +971' },
  { code: '+966', label: 'Saudi Arabia +966' },
  { code: '+49', label: 'Germany +49' },
  { code: '+46', label: 'Sweden +46' },
  { code: '+31', label: 'Netherlands +31' },
  { code: '+61', label: 'Australia +61' },
  { code: '+254', label: 'Kenya +254' },
  { code: '+972', label: 'Israel +972' },
  { code: '+47', label: 'Norway +47' },
  { code: '+27', label: 'South Africa +27' },
]

/** Phone number with country code (+251 by default). Submits the combined value as `name`. */
export function PhoneInput({
  id,
  name,
  defaultValue,
  invalid,
  required,
  describedById,
}: {
  id: string
  name: string
  defaultValue?: string | null
  invalid?: boolean
  required?: boolean
  describedById?: string
}) {
  const initialCode = CODES.find((c) => defaultValue?.startsWith(c.code))?.code ?? '+251'
  const [code, setCode] = useState(initialCode)
  const [local, setLocal] = useState(defaultValue ? defaultValue.slice(initialCode.length) : '')
  const trimmed = local.trim()
  // A leading 0 is the national trunk prefix (09…, 07…) and is dropped after a country code.
  const combined = !trimmed ? '' : trimmed.startsWith('+') || trimmed.startsWith('00') ? trimmed : `${code}${trimmed.replace(/^0/, '')}`

  return (
    <div className="flex gap-2">
      <input type="hidden" name={name} value={combined} />
      <select
        aria-label="Country code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className={cn(controlClasses, 'h-11 w-28 shrink-0 px-2')}
      >
        {CODES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.label}
          </option>
        ))}
      </select>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={local}
        required={required}
        aria-invalid={invalid || undefined}
        aria-describedby={describedById}
        placeholder={code === '+251' ? '9X XXX XXXX' : 'Phone number'}
        onChange={(e) => setLocal(e.target.value)}
        className={cn(controlClasses, 'h-11')}
      />
    </div>
  )
}
