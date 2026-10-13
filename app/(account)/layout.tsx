import { SiteHeader } from '@/components/layout/SiteHeader'

export const metadata = { robots: { index: false, follow: false } }

export default function AccountGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-stone-50">
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  )
}
