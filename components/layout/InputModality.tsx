'use client'

import { useEffect } from 'react'

/**
 * Records how the visitor last interacted (keyboard or pointer) on <html data-input>, so focus rings show for keyboard
 * users only. Browsers decide :focus-visible differently after a click (for example on links that keep focus while the
 * page changes); with this, a mouse or touch click never leaves a ring behind, and Tab always shows one.
 */
export function InputModality() {
  useEffect(() => {
    const root = document.documentElement
    const keyboard = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey && !e.altKey) root.dataset.input = 'keyboard'
    }
    const pointer = () => {
      root.dataset.input = 'pointer'
    }
    document.addEventListener('keydown', keyboard, true)
    document.addEventListener('pointerdown', pointer, true)
    return () => {
      document.removeEventListener('keydown', keyboard, true)
      document.removeEventListener('pointerdown', pointer, true)
    }
  }, [])
  return null
}
