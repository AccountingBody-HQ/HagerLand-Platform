'use client'

import { useEffect } from 'react'

export const UTM_KEY = 'hl_utm'
const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']

/** Remembers campaign parameters from the landing URL for this browser session (lead attribution). */
export function UtmCapture() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const utm: Record<string, string> = {}
      KEYS.forEach((k) => {
        const v = params.get(k)
        if (v) utm[k] = v.slice(0, 100)
      })
      if (Object.keys(utm).length) window.sessionStorage.setItem(UTM_KEY, JSON.stringify(utm))
    } catch {
      // storage unavailable
    }
  }, [])
  return null
}

export function readUtm(): string {
  try {
    return window.sessionStorage.getItem(UTM_KEY) ?? ''
  } catch {
    return ''
  }
}
