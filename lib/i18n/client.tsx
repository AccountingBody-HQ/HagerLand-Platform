'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { localizeHref, type AmScope, type Locale } from './config'
import { jobsTranslator, translator, type Translate } from './translate'

const LocaleContext = createContext<{ locale: Locale; scope: AmScope; reviewed?: Record<string, string> }>({ locale: 'en', scope: 'site' })

/** `reviewed` is passed only on pages served by Amharic for Jobs (the native-reviewed entries). */
export function LocaleProvider({ locale, scope = 'site', reviewed, children }: { locale: Locale; scope?: AmScope; reviewed?: Record<string, string>; children: ReactNode }) {
  const value = useMemo(() => ({ locale, scope, reviewed }), [locale, scope, reviewed])
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

/** Translation and link helpers for client components. */
export function useI18n(): { locale: Locale; scope: AmScope; t: Translate; href: (h: string) => string } {
  const { locale, scope, reviewed } = useContext(LocaleContext)
  return useMemo(() => ({ locale, scope, t: translator(locale, scope, reviewed), href: (h: string) => localizeHref(h, locale, scope) }), [locale, scope, reviewed])
}

/** For Jobs forms and components (Jobs Phase 5): Amharic only when Amharic for Jobs serves the page, with only native-reviewed text (see getJobsI18n). */
export function useJobsI18n(): { locale: Locale; scope: AmScope; t: Translate; href: (h: string) => string } {
  const { locale: requested, scope, reviewed } = useContext(LocaleContext)
  return useMemo(() => {
    const locale: Locale = scope === 'jobs' ? requested : 'en'
    return { locale, scope, t: jobsTranslator(requested, scope, reviewed), href: (h: string) => localizeHref(h, locale, 'jobs') }
  }, [requested, scope, reviewed])
}
