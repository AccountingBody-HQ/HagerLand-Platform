export function Logo({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="16" cy="16" r="16" fill="#1C7C4C" />
      <path d="M11 12 L21 12 L16 21 Z" stroke="white" strokeWidth="1.4" fill="none" opacity="0.55" />
      <circle cx="11" cy="12" r="2.6" fill="white" />
      <circle cx="21" cy="12" r="2.6" fill="white" />
      <circle cx="16" cy="21" r="2.6" fill="white" />
    </svg>
  )
}
