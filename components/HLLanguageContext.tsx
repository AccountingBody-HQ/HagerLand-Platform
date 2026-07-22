'use client'
import React, { createContext, useContext, useState, useEffect } from 'react'
export type Language = 'en' | 'am' | 'om'
interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
}
const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => {},
})
function showLangOverlay() {
  if (typeof document === 'undefined') return
  const overlay = document.createElement('div')
  overlay.id = 'hl-lang-overlay'
  overlay.style.cssText = 'position:fixed;inset:0;background:#1C7C4C;z-index:99999;display:flex;align-items:center;justify-content:center;transition:opacity 0.15s;'
  overlay.innerHTML = '<div style="text-align:center"><p style="color:rgba(255,255,255,0.7);font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;margin:0 0 8px">ሃገር · Homeland · HagerLand</p><p style="color:#fff;font-size:14px;font-weight:600;margin:0">Loading...</p></div>'
  document.body.appendChild(overlay)
}

function setGoogTransCookie(langCode: string) {
  if (typeof document === 'undefined') return
  const hostname = window.location.hostname
  const rootDomain = hostname.replace(/^www\./, '')
  showLangOverlay()
  if (langCode === 'en') {
    const expires = 'expires=Thu, 01 Jan 1970 00:00:00 UTC'
    document.cookie = `googtrans=; ${expires}; path=/;`
    document.cookie = `googtrans=; ${expires}; path=/; domain=${hostname};`
    document.cookie = `googtrans=; ${expires}; path=/; domain=.${rootDomain};`
    document.cookie = `googtrans=; ${expires}; path=/; domain=${rootDomain};`
    setTimeout(() => {
      window.location.href = window.location.href.split('?')[0].split('#')[0]
    }, 50)
  } else {
    const value = '/en/' + langCode
    document.cookie = `googtrans=${value}; path=/;`
    document.cookie = `googtrans=${value}; path=/; domain=${hostname};`
    document.cookie = `googtrans=${value}; path=/; domain=.${rootDomain};`
    setTimeout(() => window.location.reload(), 50)
  }
}
function detectCurrentLanguage(): Language {
  if (typeof document === 'undefined') return 'en'
  const match = document.cookie.match(/googtrans=\/en\/([a-z]+)/)
  if (match) {
    const code = match[1]
    if (code === 'am') return 'am'
    if (code === 'om') return 'om'
  }
  return 'en'
}
export function HLLanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')
  useEffect(() => {
    setLanguageState(detectCurrentLanguage())
  }, [])
  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    setGoogTransCookie(lang)
  }
  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}
export function useHLLanguage() {
  return useContext(LanguageContext)
}
