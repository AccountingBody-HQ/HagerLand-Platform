'use client'
import { useEffect } from 'react'

declare global {
  interface Window {
    googleTranslateElementInit?: () => void
    google?: {
      translate: {
        TranslateElement: new (config: object, id: string) => void
      }
    }
  }
}

function initGoogleTranslate() {
  if (window.google?.translate?.TranslateElement) {
    new window.google.translate.TranslateElement(
      { pageLanguage: 'en', includedLanguages: 'am,om', autoDisplay: false },
      'google_translate_element'
    )
  }
}

function translateTo(lang: string) {
  const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null
  if (select) {
    select.value = lang
    select.dispatchEvent(new Event('change'))
  }
}

function resetToEnglish() {
  const iframe = document.querySelector('.goog-te-banner-frame') as HTMLIFrameElement | null
  if (iframe) {
    const innerDoc = iframe.contentDocument || iframe.contentWindow?.document
    const restoreBtn = innerDoc?.querySelector('.goog-te-banner-content button') as HTMLElement | null
    if (restoreBtn) restoreBtn.click()
    return
  }
  // Fallback — reload without translate cookie
  document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
  document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname
  window.location.reload()
}

export function LanguageSwitcher({ dark = false }: { dark?: boolean }) {
  useEffect(() => {
    if (!document.getElementById('google-translate-script')) {
      window.googleTranslateElementInit = initGoogleTranslate
      const script = document.createElement('script')
      script.id = 'google-translate-script'
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
      script.async = true
      document.body.appendChild(script)
    } else if (window.google?.translate?.TranslateElement) {
      initGoogleTranslate()
    }
  }, [])

  const base = dark
    ? 'text-[11px] font-bold px-2.5 py-1 rounded-full transition-all cursor-pointer'
    : 'text-[11px] font-bold px-2.5 py-1 rounded-full transition-all cursor-pointer'

  const active = dark
    ? 'bg-white/20 text-white'
    : 'bg-ink text-white'

  const inactive = dark
    ? 'text-white/50 hover:text-white hover:bg-white/15'
    : 'text-muted hover:text-ink hover:bg-section'

  const borderStyle = dark
    ? 'flex items-center gap-0.5 border border-white/20 rounded-full px-1.5 py-1.5 bg-white/8'
    : 'flex items-center gap-0.5 border border-border rounded-full px-1.5 py-1.5 bg-white shadow-sm'

  return (
    <>
      {/* Hidden Google Translate element */}
      <div id="google_translate_element" style={{ display: 'none' }} />

      <div className={borderStyle}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={dark ? 'text-white/40 mx-1' : 'text-muted mx-1'}>
          <circle cx="12" cy="12" r="10"/>
          <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
        </svg>
        <button onClick={resetToEnglish} className={`${base} ${active}`}>EN</button>
        <button onClick={() => translateTo('am')} className={`${base} ${inactive}`}>አማ</button>
        <button onClick={() => translateTo('om')} className={`${base} ${inactive}`}>OM</button>
      </div>
    </>
  )
}
