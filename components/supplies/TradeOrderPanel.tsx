'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { submitTradeOrderAction, tradeBasketOpenAction } from '@/app/actions/trade-order-actions'
import { OrderRequestFields } from '@/components/supply/OrderRequestForm'
import { FormAlert, Honeypot, SubmitButton } from '@/components/forms/FormParts'
import { Turnstile } from '@/components/forms/Turnstile'
import { NoResetForm } from '@/components/forms/NoResetForm'
import { Button } from '@/components/ui/Button'
import { CUSTOMER_TEXT } from '@/lib/supply/order-requests'
import { TRADE_TEXT } from '@/lib/supply/trade-prices'
import type { QuoteItem } from './quoteStore'

/**
 * S6-4: an approved trade customer orders the whole basket as one order request (both owner switches on, every item a
 * catalogue product that can be ordered). For everyone else the server says no and nothing shows.
 */
export function TradeOrderPanel({ items, onSent }: { items: QuoteItem[]; onSent: () => void }) {
  const productIds = items.map((i) => i.productId ?? '')
  const allCatalogue = items.length > 0 && productIds.every(Boolean)
  const idsKey = productIds.join(',')
  const [open, setOpen] = useState(false)
  const [allowed, setAllowed] = useState(false)
  const [state, action] = useActionState(submitTradeOrderAction, null)
  const router = useRouter()
  const sent = useRef(false)
  useEffect(() => {
    let live = true
    if (!allCatalogue) {
      setAllowed(false)
      return
    }
    tradeBasketOpenAction(idsKey.split(','))
      .then((yes) => {
        if (live) setAllowed(yes)
      })
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [allCatalogue, idsKey])
  useEffect(() => {
    if (state?.ok && !sent.current) {
      sent.current = true
      onSent()
      router.push(`${state.data.path}?sent=1`)
    }
  }, [state, router, onSent])
  if (!allowed || !allCatalogue) return null
  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {}
  return (
    <div className="mb-6 space-y-2 border-b border-border pb-6">
      {!open ? (
        <Button size="lg" fullWidth onClick={() => setOpen(true)}>
          {TRADE_TEXT.basketButton}
        </Button>
      ) : (
        <NoResetForm action={action} className="space-y-5" noValidate>
          <input type="hidden" name="items" value={JSON.stringify(items.map((i) => ({ product_id: i.productId, quantity: i.quantity })))} />
          <Honeypot />
          {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
          <OrderRequestFields errors={errors} />
          <Turnstile action="order_request" />
          <SubmitButton fullWidth size="lg" pendingText="Sending…">
            {CUSTOMER_TEXT.submit}
          </SubmitButton>
        </NoResetForm>
      )}
      <p className="text-small text-muted">{TRADE_TEXT.basketNote}</p>
    </div>
  )
}
