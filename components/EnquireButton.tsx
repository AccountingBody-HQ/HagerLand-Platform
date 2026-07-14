'use client'
import { useState } from 'react'

export function EnquireButton({
  email,
  label = 'Get in touch',
  subject = '',
}: {
  email: string
  label?: string
  subject?: string
}) {
  const [revealed, setRevealed] = useState(false)

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
      onClick={() => setRevealed(true)}
      className="bg-green hover:bg-green-dark text-white font-semibold rounded-full px-6 py-2.5 transition-colors"
    >
      {label}
    </button>
  )
}
