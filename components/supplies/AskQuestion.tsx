'use client'

import { useState } from 'react'
import { MessageCircleQuestion } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { EnquiryForm, type IntentOption } from '@/components/enquiry/EnquiryForm'
import { brand } from '@/lib/brand'

export function AskQuestion({ productId, productName, intents }: { productId: string; productName: string; intents: IntentOption[] }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="secondary" size="lg" fullWidth onClick={() => setOpen(true)}>
        <MessageCircleQuestion /> Ask a question
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Ask about ${productName}`} variant="sheet">
        <EnquiryForm target={{ type: 'product', id: productId, recipientLabel: brand.divisions.supply }} intents={intents} idPrefix="ask" />
      </Dialog>
    </>
  )
}
