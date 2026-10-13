'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { Tabs } from '@/components/ui/Tabs'
import { Combobox } from '@/components/ui/Combobox'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { PriceInput } from '@/components/ui/PriceInput'
import { Switch } from '@/components/ui/Switch'
import { Field } from '@/components/ui/Field'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import { useToast } from '@/components/ui/Toast'

const SAMPLE = [
  { value: 'bole', label: 'Bole', description: 'Addis Ababa' },
  { value: 'yeka', label: 'Yeka', description: 'Addis Ababa' },
  { value: 'adama', label: 'Adama', description: 'Oromia' },
  { value: 'hawassa', label: 'Hawassa', description: 'Sidama' },
]

export function StyleguideDemos() {
  const [dialog, setDialog] = useState(false)
  const [sheet, setSheet] = useState(false)
  const toast = useToast()
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setDialog(true)}>Open dialog</Button>
        <Button variant="secondary" onClick={() => setSheet(true)}>
          Open filter sheet
        </Button>
        <Button variant="ghost" onClick={() => toast('Enquiry sent. The agent will contact you soon.')}>
          Show toast
        </Button>
        <Button variant="ghost" onClick={() => toast('Enter a phone number starting with +251 or 09', 'error')}>
          Show error toast
        </Button>
        <DropdownMenu trigger={({ toggle, open, id }) => <Button variant="secondary" onClick={toggle} aria-expanded={open} aria-controls={id}>Dropdown</Button>}>
          {(close) => (
            <ul>
              {['Newest', 'Price low to high', 'Price high to low'].map((s) => (
                <li key={s}>
                  <button type="button" onClick={close} className="flex min-h-11 w-full items-center rounded-md px-3 text-left hover:bg-stone-100">
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </DropdownMenu>
      </div>
      <Tabs
        items={[
          { id: 'sale', label: 'For sale', content: <p className="text-muted">Tab panel content for sale listings.</p> },
          { id: 'rent', label: 'To rent', content: <p className="text-muted">Tab panel content for rentals.</p> },
          { id: 'dev', label: 'Developments', content: <p className="text-muted">Tab panel content for developments.</p> },
        ]}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Location" htmlFor="sg-location" hint="Searchable list">
          <Combobox id="sg-location" options={SAMPLE} placeholder="Choose an area" />
        </Field>
        <Field label="Phone" htmlFor="sg-phone" required>
          <PhoneInput id="sg-phone" name="phone" />
        </Field>
        <Field label="Price" htmlFor="sg-price">
          <PriceInput id="sg-price" name="price" placeholder="4,500,000" />
        </Field>
        <div>
          <Switch id="sg-switch" label="Show exact location" />
        </div>
      </div>
      <Dialog open={dialog} onClose={() => setDialog(false)} title="Send enquiry" footer={<Button fullWidth onClick={() => setDialog(false)}>Send enquiry</Button>}>
        <p className="text-muted">Dialogs trap focus, close with Escape and on backdrop tap.</p>
      </Dialog>
      <Dialog
        open={sheet}
        onClose={() => setSheet(false)}
        title="Filters"
        variant="sheet"
        footer={
          <Button fullWidth onClick={() => setSheet(false)}>
            Show 24 results
          </Button>
        }
      >
        <p className="text-muted">On phones this slides up from the bottom; on larger screens it is centred.</p>
      </Dialog>
    </div>
  )
}
