'use client'

import { useRouter } from 'next/navigation'
import { useTransition, type ReactNode } from 'react'
import { Button, type ButtonProps } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

type Result = { ok: true; data: { message: string } } | { ok: false; error: string }

/** A button that runs a (bound) server action, shows the result as a toast and refreshes the page. */
export function ActionButton({ action, children, confirm, ...rest }: Omit<ButtonProps, 'onClick' | 'action'> & { action: () => Promise<Result>; children: ReactNode; confirm?: string }) {
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  return (
    <Button
      {...rest}
      disabled={pending || rest.disabled}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return
        start(async () => {
          const res = await action()
          toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
          if (res.ok) router.refresh()
        })
      }}
    >
      {children}
    </Button>
  )
}
