'use client'

import { useEffect, useRef, type ReactNode, useId } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { IconButton } from './Button'

/**
 * Accessible modal using the native <dialog> element (focus trap, Esc to close, backdrop).
 * variant "sheet" is a bottom sheet on mobile and a centred panel from the sm breakpoint.
 */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  variant = 'dialog',
  className,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  variant?: 'dialog' | 'sheet' | 'drawer'
  className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  const titleId = useId()
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className={cn(
        'm-0 max-h-none max-w-none bg-transparent p-0 backdrop:bg-ink/50 open:flex',
        variant === 'dialog' && 'inset-0 h-full w-full items-center justify-center p-4',
        variant === 'sheet' && 'inset-0 h-full w-full items-end justify-center sm:items-center sm:p-4',
        variant === 'drawer' && 'inset-0 h-full w-full justify-end',
      )}
    >
      <div
        className={cn(
          'flex max-h-full w-full flex-col bg-white shadow-lg',
          variant === 'dialog' && 'max-w-lg animate-fade-in rounded-xl',
          variant === 'sheet' && 'max-h-[92dvh] animate-slide-up rounded-t-xl sm:max-w-lg sm:animate-fade-in sm:rounded-xl',
          variant === 'drawer' && 'h-full max-w-sm animate-slide-in-right',
          className,
        )}
      >
        <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
          <h2 id={titleId} className="font-display text-h3 font-bold">
            {title}
          </h2>
          <IconButton label="Close" onClick={onClose}>
            <X />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-border px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </dialog>
  )
}
