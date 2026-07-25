'use client'
import { useState } from 'react'
export function EnquireButton({
  email,
  label = 'Get in touch',
  subject = '',
  section,
  listingId,
}: {
  email: string
  label?: string
  subject?: string
  section?: string
  listingId?: string
}) {
  const [revealed, setRevealed] = useState(false)
  function handleReveal() {
    setRevealed(true)
    if (section && listingId) {
      // Fire-and-forget count — never blocks or delays the reveal
      fetch('/api/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, listing_id: listingId }),
        keepalive: true,
      }).catch(() => {})
    }
  }
  if (revealed) {
    const href = subject
      ? `mailto:${email}?subject=${encodeURIComponent(subject)}`
      : `mailto:${email}`
    return (
      <a
        href={href}
        className="inline-flex items-center gap-2 bg-green hover:bg-green-dark text-white font-semibold rounded-full px-6 py-2.5 transition-colors"
      >
        {email}
      </a>
    )
  }
  return (
    <button
      onClick={handleReveal}
      className="bg-green hover:bg-green-dark text-white font-semibold rounded-full px-6 py-2.5 transition-colors"
    >
      {label}
    </button>
  )
}
