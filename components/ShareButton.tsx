'use client'
import { useState } from 'react'

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // clipboard also unavailable — silently ignore
    }
  }

  return (
    <button
      onClick={handleShare}
      className="border border-border text-muted font-medium rounded-full px-4 py-2 text-sm hover:border-ink hover:text-ink transition-colors shrink-0"
    >
      {copied ? 'Copied!' : 'Share'}
    </button>
  )
}
