'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { createPaymentMethodAction, movePaymentMethodAction, setPaymentMethodActiveAction, updatePaymentMethodAction } from '@/app/roodber8/actions/payment-methods'
import { Button } from '@/components/ui/Button'
import { Checkbox, Field, Input, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { PAYMENT_METHODS_TEXT as T, type PaymentMethod } from '@/lib/supply/payment-methods'

type Result = { ok: true; data: { message: string } } | { ok: false; error: string }

function useRun() {
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  return {
    pending,
    run: (fn: () => Promise<Result>, after?: () => void) =>
      start(async () => {
        const res = await fn()
        toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
        if (res.ok) {
          after?.()
          router.refresh()
        }
      }),
  }
}

function MethodFields({ prefix, name, instructions, onName, onInstructions }: { prefix: string; name: string; instructions: string; onName: (v: string) => void; onInstructions: (v: string) => void }) {
  return (
    <>
      <Field label={T.name} htmlFor={`${prefix}-name`} required>
        <Input id={`${prefix}-name`} value={name} maxLength={80} onChange={(e) => onName(e.target.value)} />
      </Field>
      <Field label={T.instructions} htmlFor={`${prefix}-instructions`} required>
        <Textarea id={`${prefix}-instructions`} value={instructions} maxLength={1000} rows={4} onChange={(e) => onInstructions(e.target.value)} />
      </Field>
    </>
  )
}

/** QC-2: the owner's payment methods: add, edit, show or hide, and order. */
export function PaymentMethodsTools({ methods }: { methods: PaymentMethod[] }) {
  const { pending, run } = useRun()
  const [name, setName] = useState('')
  const [instructions, setInstructions] = useState('')
  return (
    <div className="space-y-6">
      {methods.length === 0 && <p className="text-muted">{T.empty}</p>}
      <ul className="space-y-4">
        {methods.map((m, i) => (
          <MethodRow key={m.id} method={m} first={i === 0} last={i === methods.length - 1} />
        ))}
      </ul>
      <section aria-labelledby="pm-add" className="space-y-3 rounded-md border border-border p-4">
        <h2 id="pm-add" className="font-semibold">
          {T.add}
        </h2>
        <MethodFields prefix="pm-new" name={name} instructions={instructions} onName={setName} onInstructions={setInstructions} />
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            run(
              () => createPaymentMethodAction({ name, instructions }),
              () => {
                setName('')
                setInstructions('')
              },
            )
          }
        >
          {T.save}
        </Button>
      </section>
    </div>
  )
}

function MethodRow({ method, first, last }: { method: PaymentMethod; first: boolean; last: boolean }) {
  const { pending, run } = useRun()
  const [name, setName] = useState(method.name)
  const [instructions, setInstructions] = useState(method.instructions)
  const [active, setActive] = useState(method.active)
  const prefix = `pm-${method.id.slice(0, 8)}`
  return (
    <li className="space-y-3 rounded-md border border-border p-4" data-testid="payment-method">
      <MethodFields prefix={prefix} name={name} instructions={instructions} onName={setName} onInstructions={setInstructions} />
      <Checkbox
        id={`${prefix}-active`}
        label={T.active}
        checked={active}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked
          setActive(next)
          run(() => setPaymentMethodActiveAction(method.id, next))
        }}
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={() => run(() => updatePaymentMethodAction(method.id, { name, instructions }))}>
          {T.save}
        </Button>
        <Button size="sm" variant="secondary" disabled={pending || first} onClick={() => run(() => movePaymentMethodAction(method.id, 'up'))}>
          {T.up}
        </Button>
        <Button size="sm" variant="secondary" disabled={pending || last} onClick={() => run(() => movePaymentMethodAction(method.id, 'down'))}>
          {T.down}
        </Button>
      </div>
    </li>
  )
}
