'use client'

import { useRouter } from 'next/navigation'
import { useCompare } from './useCompare'

export function CompareRemove({ id }: { id: string }) {
  const { list, remove } = useCompare()
  const router = useRouter()
  return (
    <button
      type="button"
      className="mt-1 block min-h-11 text-small font-semibold text-error underline"
      onClick={() => {
        remove(id)
        const rest = list.filter((x) => x.id !== id).map((x) => x.id)
        router.replace(rest.length ? `/property/compare?ids=${rest.join(',')}` : '/property/compare')
      }}
    >
      Remove
    </button>
  )
}
