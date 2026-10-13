import Link from 'next/link'
import { Search } from 'lucide-react'
import { requireAdminPage } from '@/lib/admin/guard'
import { queueCounts, totalQueue } from '@/lib/admin/counts'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { AdminMobileMenu, AdminSidebar } from '@/components/admin/AdminNav'
import { LogoMark } from '@/components/brand/Logo'
import { adminLogoutAction } from './session-actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: { default: 'Admin', template: '%s · HagerLand admin' }, robots: { index: false, follow: false } }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  requireAdminPage()
  const db = getAdminSupabase()
  const [queue, quotes, interest, requests] = await Promise.all([
    queueCounts(),
    db.from('quote_requests').select('id', { count: 'exact', head: true }).eq('status', 'submitted'),
    db.from('interest_registrations').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    db.from('service_requests').select('id', { count: 'exact', head: true }).in('status', ['submitted', 'triaged']),
  ])
  const badges = { review: totalQueue(queue), quotes: quotes.count ?? 0, interest: interest.count ?? 0, requests: requests.count ?? 0 }
  return (
    <div className="flex min-h-dvh flex-col bg-stone-100">
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-white/10 bg-ink px-3 text-white">
        <AdminMobileMenu badges={badges} />
        <Link href="/roodber8" className="flex items-center gap-2 font-display font-extrabold">
          <LogoMark className="size-7" /> <span className="hidden sm:inline">HagerLand admin</span>
        </Link>
        <form action="/roodber8/search" method="get" role="search" className="ml-auto flex max-w-md flex-1 items-center gap-2 rounded-md bg-white/10 px-3">
          <Search className="size-4 text-white/60" aria-hidden />
          <label htmlFor="admin-q" className="sr-only">
            Search everything
          </label>
          <input id="admin-q" name="q" placeholder="Search name, reference, phone, email…" className="h-9 w-full bg-transparent text-small text-white placeholder:text-white/50 focus:outline-none" />
        </form>
        <Link href="/" className="hidden text-small text-white/70 hover:text-white sm:inline">
          View site
        </Link>
        <form action={adminLogoutAction}>
          <button type="submit" className="h-9 rounded-md px-3 text-small font-semibold text-white/80 hover:bg-white/10 hover:text-white">
            Sign out
          </button>
        </form>
      </header>
      <div className="flex flex-1">
        <AdminSidebar badges={badges} />
        <main id="main" className="min-w-0 flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
