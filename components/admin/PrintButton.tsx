'use client'

import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/Button'

/** Opens the browser's print dialog; "Save as PDF" is one of its printers. Hidden on the printed page. */
export function PrintButton({ label = 'Print or save as PDF' }: { label?: string }) {
  return (
    <Button size="sm" variant="secondary" className="hl-no-print" onClick={() => window.print()}>
      <Printer className="size-4" aria-hidden /> {label}
    </Button>
  )
}
