'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { localizeHref, type Locale } from './config'
import { translator, type Translate } from './translate'

const LocaleContext = createContext<Locale>('en')

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
}

/** Translation and link helpers for client components. */
export function useI18n(): { locale: Locale; t: Translate; href: (h: string) => string } {
  const locale = useContext(LocaleContext)
  return useMemo(() => ({ locale, t: translator(locale), href: (h: string) => localizeHref(h, locale) }), [locale])
}
