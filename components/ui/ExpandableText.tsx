'use client'

import { useState } from 'react'

/** Long text clamped to about 8 lines with a "Read more" toggle. */
export function ExpandableText({ text, lines = 8 }: { text: string; lines?: number }) {
  const [open, setOpen] = useState(false)
  const long = text.length > 600 || text.split('\n').length > lines
  return (
    <div>
      <p className={`whitespace-pre-line text-ink ${!open && long ? 'line-clamp-[8]' : ''}`}>{text}</p>
      {long && (
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="mt-2 min-h-11 font-semibold text-green hover:underline">
          {open ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  )
}
