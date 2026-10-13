'use client'

import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { MAIN_NAV } from '@/lib/navigation'
import { Dialog } from '@/components/ui/Dialog'
import { ButtonLink } from '@/components/ui/Button'
import { AccountLink } from './AccountLink'

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Menu"
      variant="drawer"
      footer={
        <div className="flex flex-col gap-2">
          <ButtonLink href="/list-with-us" fullWidth>
            List with us
          </ButtonLink>
          <div className="flex gap-2 [&>*]:flex-1">
            <AccountLink className="justify-center border border-border-strong" />
            <ButtonLink href="/signup" variant="secondary">
              Create account
            </ButtonLink>
          </div>
        </div>
      }
    >
      <nav aria-label="Mobile">
        <ul className="-mx-2 divide-y divide-border">
          {MAIN_NAV.map((g) => (
            <li key={g.id}>
              <details className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-2 text-body font-semibold [&::-webkit-details-marker]:hidden">
                  {g.label}
                  <ChevronDown className="size-5 text-muted transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <ul className="pb-3">
                  {[...g.links, ...(g.featured ?? [])].map((l) => (
                    <li key={`${g.id}-${l.href}`}>
                      <Link href={l.href} onClick={onClose} className="flex min-h-11 items-center rounded-md px-4 text-ink hover:bg-stone-100">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link href={g.cta.href} onClick={onClose} className="flex min-h-11 items-center rounded-md px-4 font-semibold text-green">
                      {g.cta.label}
                    </Link>
                  </li>
                </ul>
              </details>
            </li>
          ))}
        </ul>
      </nav>
    </Dialog>
  )
}
