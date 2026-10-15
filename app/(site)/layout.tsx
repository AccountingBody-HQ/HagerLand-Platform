import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { CurrencyProvider } from '@/components/currency/CurrencyProvider'
import { CompareBar } from '@/components/compare/CompareBar'
import { QuoteListSync } from '@/components/supplies/QuoteListSync'
import { getVerticals } from '@/lib/data/verticals'
import { getExchangeRates } from '@/lib/data/rates'
import { getSiteSettings } from '@/lib/data/reference'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [verticals, rates, settings] = await Promise.all([getVerticals(), getExchangeRates(), getSiteSettings()])
  // The language switch appears only while the Amharic version is switched on (spec 25.2m).
  const amharicOn = settings.amharic_enabled === true
  return (
    <CurrencyProvider rates={rates}>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader verticals={verticals} amharicOn={amharicOn} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter amharicOn={amharicOn} />
        <CompareBar />
        <QuoteListSync />
      </div>
    </CurrencyProvider>
  )
}
