'use client'

import { useEffect } from 'react'

/** Scrolls to a section once the page has loaded (a redirect from a server action drops the #anchor). */
export function ScrollToSection({ id }: { id: string }) {
  useEffect(() => {
    document.getElementById(id)?.scrollIntoView({ block: 'start' })
  }, [id])
  return null
}
