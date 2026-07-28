"use client"

export default function CookieSettingsButton() {
  function handleClick() {
    if (typeof window !== 'undefined' && window.__birrbank_openCookieSettings) {
      window.__birrbank_openCookieSettings()
    }
  }

  return (
    <button
      onClick={handleClick}
      className="text-slate-400 hover:text-white text-sm transition-colors"
    >
      Cookie settings
    </button>
  )
}
