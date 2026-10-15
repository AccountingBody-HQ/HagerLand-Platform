import { SiteHeader } from '@/components/layout/SiteHeader'
import { getSiteNav } from '@/lib/data/site-nav'

export const metadata = { robots: { index: false, follow: false } }

export default async function AccountGroupLayout({ children }: { children: React.ReactNode }) {
  const nav = await getSiteNav()
  return (
    <div className="flex min-h-dvh flex-col bg-stone-50">
      <SiteHeader nav={nav} />
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  )
}
