import { SiteHeader } from '@/components/layout/SiteHeader'
import { getSiteNav } from '@/lib/data/site-nav'
import { jobsAmharicHere } from '@/lib/i18n/server'
import { JobsAmharicNotice } from '@/components/layout/JobsAmharicNotice'

export const metadata = { robots: { index: false, follow: false } }

export default async function AccountGroupLayout({ children }: { children: React.ReactNode }) {
  const [nav, jobsAm] = await Promise.all([getSiteNav(), jobsAmharicHere()])
  return (
    <div className="flex min-h-dvh flex-col bg-stone-50">
      {/* Jobs account pages show the language switch while Amharic for Jobs is on (Jobs Phase 5). */}
      <SiteHeader nav={nav} amharicOn={jobsAm} />
      <main id="main" className="flex-1">
        <JobsAmharicNotice nav={nav} />
        {children}
      </main>
    </div>
  )
}
