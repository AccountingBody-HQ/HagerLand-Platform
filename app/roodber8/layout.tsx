import { getAdminSession } from '@/lib/admin-auth'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { requireAdminPage } from '@/lib/admin/guard'
import { menuBadges } from '@/lib/admin/counts'
import { AdminMobileMenu, AdminSidebar } from '@/components/admin/AdminNav'
import { LogoMark } from '@/components/brand/Logo'
import { adminLogoutAction } from './session-actions'

export const dynamic = 'force-dynamic'
export const metadata = { title: { default: 'Admin', template: '%s · HagerLand admin' }, robots: { index: false, follow: false } }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage()
  const session = await getAdminSession()
  const role = session?.kind === 'staff' ? session.role : null
  // Only the areas this role may open are counted; a count that cannot be read shows "!" and the page still renders (Fix F-2).
  const badges = await menuBadges(role)
  return (
    <div className="flex min-h-dvh flex-col bg-stone-100">
      <header className="hl-admin-chrome sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-white/10 bg-ink px-3 text-white">
        {/* QC-1a: the public "Skip to content" pattern; light on the dark admin header. */}
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-ink">
          Skip to content
        </a>
        <AdminMobileMenu badges={badges} role={role} />
        <Link href="/roodber8" aria-label="HagerLand admin" className="flex items-center gap-2 font-display font-extrabold">
          <LogoMark className="size-7" /> <span className="hidden sm:inline">HagerLand admin</span>
        </Link>
        {session?.kind === 'staff' && <span className="ml-auto hidden text-small text-white/70 md:inline">{session.name} · {session.role}</span>}
        {(!role || role === 'owner') && (
        <form action="/roodber8/search" method="get" role="search" className="ml-auto flex max-w-md flex-1 items-center gap-2 rounded-md bg-white/10 px-3">
          <Search className="size-4 text-white/60" aria-hidden />
          <label htmlFor="admin-q" className="sr-only">
            Search everything
          </label>
          <input id="admin-q" name="q" placeholder="Search name, reference, phone, email…" className="h-9 w-full bg-transparent text-small text-white placeholder:text-white/50 focus:outline-none" />
        </form>
        )}
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
        <AdminSidebar badges={badges} role={role} />
        <main id="main" className="min-w-0 flex-1 p-4 sm:p-6 print:p-0">
          {children}
        </main>
      </div>
    </div>
  )
}
