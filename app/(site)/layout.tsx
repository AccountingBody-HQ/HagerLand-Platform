import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { CurrencyProvider } from '@/components/currency/CurrencyProvider'
import { CompareBar } from '@/components/compare/CompareBar'
import { QuoteListSync } from '@/components/supplies/QuoteListSync'
import { getSiteNav } from '@/lib/data/site-nav'
import { getPillars } from '@/lib/data/pillars'
import { PillarTrail } from '@/components/pillars/PillarTrail'
import { getExchangeRates } from '@/lib/data/rates'
import { getSiteSettings } from '@/lib/data/reference'
import { jobsAmharicHere } from '@/lib/i18n/server'
import { JobsAmharicNotice } from '@/components/layout/JobsAmharicNotice'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [nav, rates, settings, pillars, jobsAm] = await Promise.all([getSiteNav(), getExchangeRates(), getSiteSettings(), getPillars(), jobsAmharicHere()])
  // The language switch appears only while the Amharic version is switched on (spec 25.2m), or, on Jobs pages, while
  // Amharic for Jobs is on (Jobs Phase 5).
  const amharicOn = settings.amharic_enabled === true || jobsAm
  return (
    <CurrencyProvider rates={rates}>
      <div className="flex min-h-dvh flex-col">
        <SiteHeader nav={nav} amharicOn={amharicOn} />
        <PillarTrail pillars={pillars.map((p) => ({ key: p.key, name: p.name, slug: p.slug }))} />
        <main id="main" className="flex-1">
          <JobsAmharicNotice nav={nav} footer />
          {children}
        </main>
        <SiteFooter amharicOn={amharicOn} />
        <CompareBar />
        <QuoteListSync />
      </div>
    </CurrencyProvider>
  )
}
