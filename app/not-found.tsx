import Link from 'next/link'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

export default function NotFound() {
  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-md">
          <p className="text-7xl font-bold text-green mb-4">404</p>
          <h1 className="text-2xl font-bold text-ink mb-3">Page not found</h1>
          <p className="text-muted mb-8 leading-relaxed">
            This listing may have been removed, or the link may be incorrect.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/"
              className="bg-green hover:bg-green-dark text-white font-semibold rounded-full px-6 py-2.5 transition-colors"
            >
              Go to homepage
            </Link>
            <Link
              href="/search"
              className="border border-ink text-ink font-semibold rounded-full px-6 py-2.5 transition-colors hover:bg-section"
            >
              Search HagerLand
            </Link>
          </div>
        </div>
      </div>
      <SiteFooter />
    </main>
  )
}
