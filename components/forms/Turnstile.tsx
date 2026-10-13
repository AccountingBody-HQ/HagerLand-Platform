'use client'

import { useEffect, useRef } from 'react'
import { publicEnv } from '@/lib/env-public'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string
      remove: (id: string) => void
      reset: (id?: string) => void
    }
  }
}

const SCRIPT_ID = 'cf-turnstile-script'

/** Cloudflare Turnstile check. Adds a hidden "cf-turnstile-response" field to the surrounding form. */
export function Turnstile({ action }: { action?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const siteKey = publicEnv.turnstileSiteKey

  useEffect(() => {
    if (!siteKey || !ref.current) return
    let widgetId: string | null = null
    const el = ref.current
    const render = () => {
      if (window.turnstile && el && !widgetId) {
        widgetId = window.turnstile.render(el, { sitekey: siteKey, action, appearance: 'interaction-only', theme: 'light' })
      }
    }
    if (window.turnstile) render()
    else {
      let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
      if (!script) {
        script = document.createElement('script')
        script.id = SCRIPT_ID
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        script.async = true
        document.head.appendChild(script)
      }
      script.addEventListener('load', render)
    }
    return () => {
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
    }
  }, [siteKey, action])

  if (!siteKey) return null
  return <div ref={ref} className="min-h-0" />
}
