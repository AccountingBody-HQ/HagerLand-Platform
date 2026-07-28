'use client'
import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export default function HashScroller() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const hash = window.location.hash
    if (!hash) return
    const id = hash.replace('#', '')

    // Try multiple times to handle slow renders
    const attempts = [100, 300, 600, 1000]
    attempts.forEach(delay => {
      setTimeout(() => {
        const el = document.getElementById(id)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, delay)
    })
  }, [pathname, searchParams])

  return null
}
