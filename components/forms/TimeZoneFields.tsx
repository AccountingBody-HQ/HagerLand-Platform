'use client'

import { useEffect, useState } from 'react'
import { Field, Input } from '@/components/ui/Field'

/**
 * The visitor's time zone (read from their device, editable) and their preferred times to be called (spec 26.11),
 * so HagerLand can phone people abroad at a sensible hour.
 */
export function TimeZoneFields({ idPrefix, timesName = 'preferred_times', timesLabel = 'Best times to call you', required, error }: { idPrefix: string; timesName?: string; timesLabel?: string; required?: boolean; error?: string }) {
  const [tz, setTz] = useState('')
  useEffect(() => {
    try {
      setTz(Intl.DateTimeFormat().resolvedOptions().timeZone)
    } catch {
      setTz('')
    }
  }, [])
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Your time zone" htmlFor={`${idPrefix}-tz`} hint="Taken from your device. Change it if it is wrong." optional>
        <Input id={`${idPrefix}-tz`} name="time_zone" value={tz} maxLength={60} onChange={(e) => setTz(e.target.value)} />
      </Field>
      <Field label={timesLabel} htmlFor={`${idPrefix}-times`} error={error} required={required} optional={!required}>
        <Input id={`${idPrefix}-times`} name={timesName} maxLength={300} placeholder="e.g. weekday evenings, Saturday morning" invalid={Boolean(error)} />
      </Field>
    </div>
  )
}
