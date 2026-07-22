'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function FilterDropdown({
  options,
  value,
  basePath,
  paramName,
  allLabel = 'All',
}: {
  options: string[]
  value?: string
  basePath: string
  paramName: string
  allLabel?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function select(val: string) {
    setOpen(false)
    if (val) {
      router.push(`${basePath}?${paramName}=${encodeURIComponent(val)}`)
    } else {
      router.push(basePath)
    }
  }

  const current = value || allLabel

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 bg-white border border-border text-ink text-sm font-medium rounded-full pl-4 pr-3 py-2 hover:border-ink transition-colors focus:outline-none focus:border-green whitespace-nowrap justify-between">
        <span>{current}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 w-52 bg-white border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="py-1.5 max-h-64 overflow-y-auto">
            <button onClick={() => select('')}
              className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${!value ? 'text-green font-bold bg-green-soft' : 'text-ink hover:bg-section'}`}>
              {allLabel}
            </button>
            {options.map((opt) => (
              <button key={opt} onClick={() => select(opt)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${value === opt ? 'text-green font-bold bg-green-soft' : 'text-ink hover:bg-section'}`}>
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}