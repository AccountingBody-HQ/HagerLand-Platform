import { SiteHeader } from '@/components/layout/SiteHeader'
import { getVerticals } from '@/lib/data/verticals'

export const metadata = { robots: { index: false, follow: false } }

export default async function AccountGroupLayout({ children }: { children: React.ReactNode }) {
  const verticals = await getVerticals()
  return (
    <div className="flex min-h-dvh flex-col bg-stone-50">
      <SiteHeader verticals={verticals} />
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  )
}
