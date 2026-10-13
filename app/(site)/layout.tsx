import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { getVerticals } from '@/lib/data/verticals'

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const verticals = await getVerticals()
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader verticals={verticals} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
