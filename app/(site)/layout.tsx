import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { CurrencyProvider } from '@/components/currency/CurrencyProvider'
import { getVerticals } from '@/lib/data/verticals'
import { getExchangeRates } from '@/lib/data/rates'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [verticals, rates] = await Promise.all([getVerticals(), getExchangeRates()])
  return (
    <CurrencyProvider rates={rates}>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader verticals={verticals} />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </div>
    </CurrencyProvider>
  )
}
