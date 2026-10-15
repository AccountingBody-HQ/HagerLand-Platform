import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { getPillars } from '@/lib/data/pillars'
import { serviceOn } from '@/lib/pillars'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false } }

/** Owner portal (spec 26.7): signed-in owners only, while its switch (Manage › Owner portal) is on. */
export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  if (!serviceOn(await getPillars(), 'manage', 'owner-portal')) notFound()
  await requireUser('/owner')
  return children
}
