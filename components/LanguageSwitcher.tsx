'use client'
import { useHLLanguage, Language } from './HLLanguageContext'

const languages: { code: Language; label: string; full: string }[] = [
  { code: 'en', label: 'EN', full: 'English' },
  { code: 'am', label: '\u12a0\u121b', full: '\u12a0\u121b\u122d\u129b' },
  { code: 'om', label: 'OM', full: 'Afaan Oromoo' },
]

export function LanguageSwitcher() {
  const { language, setLanguage } = useHLLanguage()
  return (
    <div
      className="flex items-center gap-0.5 border border-border rounded-full px-1.5 py-1.5 bg-white shadow-sm"
      aria-label="Select language"
      role="group"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        className="text-muted mx-1">
        <circle cx="12" cy="12" r="10"/>
        <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
      </svg>
      {languages.map(({ code, label, full }) => (
        <button
          key={code}
          onClick={() => setLanguage(code)}
          title={full}
          translate="no"
          aria-pressed={language === code}
          aria-label={`Switch to ${full}`}
          className={[
            'px-2.5 py-1 rounded-full text-[11px] font-bold transition-all',
            language === code
              ? 'bg-ink text-white'
              : 'text-muted hover:bg-section hover:text-ink',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export function MobileLangSwitcher() {
  const { language, setLanguage } = useHLLanguage()
  return (
    <div
      className="flex items-center gap-0.5 border border-white/20 rounded-full px-1.5 py-1.5 bg-white/8"
      aria-label="Select language"
      role="group"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        className="text-white/40 mx-1">
        <circle cx="12" cy="12" r="10"/>
        <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
      </svg>
      {languages.map(({ code, label, full }) => (
        <button
          key={code}
          onClick={() => setLanguage(code)}
          title={full}
          translate="no"
          aria-pressed={language === code}
          aria-label={`Switch to ${full}`}
          className={[
            'px-2.5 py-1 rounded-full text-[11px] font-bold transition-all tracking-wide',
            language === code
              ? 'bg-white/20 text-white'
              : 'text-white/50 hover:text-white hover:bg-white/15',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
