'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { Heart } from 'lucide-react'
import { savedStateAction, toggleSavedAction } from '@/app/actions/saved-actions'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { track } from '@/lib/analytics'

/** Save / saved toggle (spec 24.7, 25.2a). Guests are sent to sign in and brought back. */
export function SaveButton({ entityType, entityId, label = 'Save', className }: { entityType: 'property' | 'product' | 'organisation' | 'development'; entityId: string; label?: string; className?: string }) {
  const [saved, setSaved] = useState(false)
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  const pathname = usePathname()
  useEffect(() => {
    savedStateAction(entityType, [entityId]).then((ids) => setSaved(ids.includes(entityId))).catch(() => undefined)
  }, [entityType, entityId])
  return (
    <button
      type="button"
      aria-pressed={saved}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await toggleSavedAction({ entity_type: entityType, entity_id: entityId })
          if (!res.ok) {
            if (res.error === 'Sign in to save.') router.push(`/login?next=${encodeURIComponent(pathname ?? '/')}`)
            else toast(res.error, 'error')
            return
          }
          setSaved(res.data.saved)
          toast(res.data.saved ? 'Saved to your account.' : 'Removed from saved.', 'success')
          if (res.data.saved) track('property_saved', { entity_type: entityType })
        })
      }
      className={cn('inline-flex min-h-11 items-center gap-2 rounded-md border border-border-strong bg-white px-4 font-semibold text-ink hover:bg-stone-100 disabled:opacity-60', className)}
    >
      <Heart className={cn('size-5', saved ? 'fill-error text-error' : 'text-ink')} aria-hidden />
      {saved ? 'Saved' : label}
    </button>
  )
}
