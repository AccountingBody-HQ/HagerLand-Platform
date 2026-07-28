"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X, ChevronDown, ChevronUp, Shield } from 'lucide-react'

type ConsentState = {
  essential: true
  analytics: boolean
  marketing: boolean
  decided: boolean
}

const CONSENT_KEY = 'birrbank_cookie_consent'

const DEFAULT_CONSENT: ConsentState = {
  essential: true,
  analytics: false,
  marketing: false,
  decided: false,
}

type GtmWindow = Window & {
  dataLayer?: unknown[]
  gtag?: (...args: unknown[]) => void
}

function pushConsentToGTM(analytics: boolean, marketing: boolean) {
  if (typeof window === 'undefined') return
  const w = window as GtmWindow
  w.dataLayer = w.dataLayer || []
  w.dataLayer.push({
    event: 'consent_update',
    analytics_storage: analytics ? 'granted' : 'denied',
    ad_storage: marketing ? 'granted' : 'denied',
    ad_user_data: marketing ? 'granted' : 'denied',
    ad_personalization: marketing ? 'granted' : 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
  })
}

function initConsentDefaults() {
  if (typeof window === 'undefined') return
  const w = window as GtmWindow
  w.dataLayer = w.dataLayer || []
  w.gtag = (...args: unknown[]) => { w.dataLayer!.push(args) }
  w.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500,
  })
}

// Global function — call window.__birrbank_openCookieSettings() from anywhere to reopen
declare global { interface Window { __birrbank_openCookieSettings?: () => void } }

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [consent, setConsent] = useState<ConsentState>(DEFAULT_CONSENT)

  useEffect(() => {
    initConsentDefaults()
    // Register global reopen function so footer/cookie policy can trigger it
    window.__birrbank_openCookieSettings = () => {
      setShowPreferences(false)
      setVisible(true)
    }
    try {
      const stored = localStorage.getItem(CONSENT_KEY)
      if (stored) {
        const parsed: ConsentState = JSON.parse(stored)
        if (parsed.decided) {
          pushConsentToGTM(parsed.analytics, parsed.marketing)
          setConsent(parsed)
          setVisible(false)
          return
        }
      }
    } catch { /* ignore malformed stored consent */ }
    const t = setTimeout(() => setVisible(true), 600)
    return () => clearTimeout(t)
  }, [])

  function saveConsent(updates: Partial<ConsentState>) {
    const next: ConsentState = { ...consent, ...updates, essential: true, decided: true }
    setConsent(next)
    try { localStorage.setItem(CONSENT_KEY, JSON.stringify(next)) } catch { /* ignore storage failures */ }
    pushConsentToGTM(next.analytics, next.marketing)
    setVisible(false)
  }

  function handleAcceptAll() { saveConsent({ analytics: true, marketing: true }) }
  function handleRejectAll() { saveConsent({ analytics: false, marketing: false }) }
  function handleSavePreferences() { saveConsent({}) }

  if (!visible) return null

  const toggleBase = 'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900'
  const toggleOn = 'bg-blue-600'
  const toggleOff = 'bg-slate-700'
  const thumbBase = 'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform'
  const thumbOn = 'translate-x-4'
  const thumbOff = 'translate-x-0'

  return (
    <div className="fixed bottom-0 right-0 z-[9999] flex items-end justify-end pointer-events-none p-0 sm:p-6">
      <div className="absolute inset-0 bg-black/20 sm:hidden pointer-events-auto" onClick={handleRejectAll} />
      <div className="relative pointer-events-auto w-full sm:max-w-2xl sm:mb-6 sm:mx-6 bg-slate-950 border-t sm:border border-slate-800 sm:rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
        <div className="h-0.5 bg-gradient-to-r from-blue-600 via-blue-400 to-blue-600" />
        <div className="px-6 py-5">

          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600/10 border border-blue-500/20 rounded-xl p-2 shrink-0">
                <Shield size={18} className="text-blue-400" />
              </div>
              <div>
                <h2 className="text-white font-bold text-sm leading-tight">Your privacy choices</h2>
                <p className="text-slate-400 text-xs mt-0.5">BirrBank.com</p>
              </div>
            </div>
            <button onClick={handleRejectAll} className="text-slate-500 hover:text-slate-300 transition-colors shrink-0 mt-0.5" aria-label="Reject and close">
              <X size={18} />
            </button>
          </div>

          <p className="text-slate-400 text-sm leading-relaxed mb-5">
            We use essential cookies to keep the site running. With your consent, we also use analytics
            cookies to improve the platform.{' '}
            <Link href="/privacy" className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors">
              Cookie policy
            </Link>
          </p>

          <button
            onClick={() => setShowPreferences(p => !p)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-4"
          >
            {showPreferences ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Manage preferences
          </button>

          {showPreferences && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-5 space-y-3">

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-xs font-semibold">Essential</p>
                  <p className="text-slate-500 text-xs mt-0.5">Required for the site to function. Cannot be disabled.</p>
                </div>
                <div className="bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full">
                  Always on
                </div>
              </div>

              <div className="border-t border-slate-800" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-xs font-semibold">Analytics</p>
                  <p className="text-slate-500 text-xs mt-0.5">Helps us understand how the platform is used.</p>
                </div>
                <button
                  role="switch"
                  aria-checked={consent.analytics}
                  onClick={() => setConsent(c => ({ ...c, analytics: !c.analytics }))}
                  className={toggleBase + ' ' + (consent.analytics ? toggleOn : toggleOff)}
                >
                  <span className={thumbBase + ' ' + (consent.analytics ? thumbOn : thumbOff)} />
                </button>
              </div>

              <div className="border-t border-slate-800" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white text-xs font-semibold">Marketing</p>
                  <p className="text-slate-500 text-xs mt-0.5">Enables personalised content and relevant adverts.</p>
                </div>
                <button
                  role="switch"
                  aria-checked={consent.marketing}
                  onClick={() => setConsent(c => ({ ...c, marketing: !c.marketing }))}
                  className={toggleBase + ' ' + (consent.marketing ? toggleOn : toggleOff)}
                >
                  <span className={thumbBase + ' ' + (consent.marketing ? thumbOn : thumbOff)} />
                </button>
              </div>

              <div className="border-t border-slate-800 pt-3">
                <button
                  onClick={handleSavePreferences}
                  className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold rounded-lg py-2.5 transition-colors"
                >
                  Save my preferences
                </button>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleRejectAll}
              className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-sm font-semibold rounded-xl py-3 transition-all"
            >
              Reject non-essential
            </button>
            <button
              onClick={handleAcceptAll}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl py-3 transition-all shadow-lg shadow-blue-900/30"
            >
              Accept all
            </button>
          </div>

          <p className="text-slate-600 text-[10px] text-center mt-3 leading-relaxed">
            UK GDPR &amp; EU GDPR compliant · You can change your preferences at any time via our{' '}
            <Link href="/privacy" className="hover:text-slate-400 transition-colors underline underline-offset-2">
              cookie policy
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}
