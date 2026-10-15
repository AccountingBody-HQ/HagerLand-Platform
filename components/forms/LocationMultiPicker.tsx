'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Combobox, type ComboOption } from '@/components/ui/Combobox'

/** Pick several locations (e.g. areas served). Submits each id as `name`. */
export function LocationMultiPicker({ id, name, defaultValue = [], max = 30 }: { id: string; name: string; defaultValue?: ComboOption[]; max?: number }) {
  const [items, setItems] = useState<ComboOption[]>(defaultValue)
  const [pickerKey, setPickerKey] = useState(0)
  return (
    <div className="space-y-2">
      {items.map((i) => (
        <input key={i.value} type="hidden" name={name} value={i.value} />
      ))}
      {items.length < max && (
        <Combobox
          key={pickerKey}
          id={id}
          endpoint="/api/locations?scope=all"
          placeholder="Add an area, sub-city or city"
          onChange={(o) => {
            if (o && !items.some((x) => x.value === o.value)) setItems([...items, o])
            setPickerKey((k) => k + 1)
          }}
        />
      )}
      {items.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {items.map((i) => (
            <li key={i.value}>
              <button
                type="button"
                onClick={() => setItems(items.filter((x) => x.value !== i.value))}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-green-soft px-3 text-small font-medium text-green-darker"
                aria-label={`Remove ${i.label}`}
              >
                {i.label}
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
