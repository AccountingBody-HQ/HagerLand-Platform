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

function setGoogTransCookie(langCode: string) {
  if (typeof document === 'undefined') return
  if (langCode === 'en') {
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname + ';'
  } else {
    const value = '/en/' + langCode
    document.cookie = 'googtrans=' + value + '; path=/;'
    document.cookie = 'googtrans=' + value + '; path=/; domain=' + window.location.hostname + ';'
  }
  window.location.reload()
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
