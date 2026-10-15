'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { CURRENCIES } from '@/lib/countries'

export interface RateInfo {
  currency: string
  etbPerUnit: number
  updatedAt: string
}

interface CurrencyState {
  rates: RateInfo[]
  /** The visitor's chosen display currency, or null for ETB only. */
  selected: RateInfo | null
  choose: (currency: string | null) => void
}

const Ctx = createContext<CurrencyState>({ rates: [], selected: null, choose: () => undefined })
const KEY = 'hl_currency'

/** Holds admin-set rates and the visitor's chosen currency (kept in this browser only). */
export function CurrencyProvider({ rates, children }: { rates: RateInfo[]; children: ReactNode }) {
  const [code, setCode] = useState<string | null>(null)
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY)
      if (saved && (CURRENCIES as readonly string[]).includes(saved)) setCode(saved)
    } catch {
      // storage unavailable: show ETB only
    }
  }, [])
  const choose = (c: string | null) => {
    setCode(c)
    try {
      if (c) window.localStorage.setItem(KEY, c)
      else window.localStorage.removeItem(KEY)
    } catch {
      // storage unavailable: the choice lasts for this page only
    }
  }
  const selected = rates.find((r) => r.currency === code) ?? null
  return <Ctx.Provider value={{ rates, selected, choose }}>{children}</Ctx.Provider>
}

export function useCurrency(): CurrencyState {
  return useContext(Ctx)
}
