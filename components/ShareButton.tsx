'use client'
import { useState } from 'react'

export function ShareButton({ title, dark = true }: { title: string; dark?: boolean }) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {}
  }

  return (
    <button
      onClick={handleShare}
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-full w-36 py-2.5 text-sm transition-colors shrink-0 ${
        dark
          ? 'border border-white/20 text-white/70 hover:border-white/50 hover:text-white'
          : 'border border-border text-muted hover:border-ink hover:text-ink'
      }`}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
      {copied ? 'Copied!' : 'Share'}
    </button>
  )
}