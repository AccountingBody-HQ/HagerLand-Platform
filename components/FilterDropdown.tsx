'use client'
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

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    if (val) {
      router.push(`${basePath}?${paramName}=${encodeURIComponent(val)}`)
    } else {
      router.push(basePath)
    }
  }

  return (
    <div className="relative inline-block">
      <select
        value={value || ''}
        onChange={handleChange}
        className="appearance-none bg-white border border-border text-ink text-sm font-medium rounded-full pl-4 pr-9 py-2.5 focus:outline-none focus:border-green cursor-pointer hover:border-ink transition-colors min-w-[140px]">
        <option value="">{allLabel}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
        <path d="M6 9l6 6 6-6"/>
      </svg>
    </div>
  )
}