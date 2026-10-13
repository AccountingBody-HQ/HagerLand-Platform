import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'
export const metadata = { robots: { index: false, follow: false } }

export default function AdminHome() {
  if (!verifySessionToken(cookies().get(SESSION_COOKIE)?.value)) redirect('/roodber8-login')
  return (
    <main className="min-h-screen bg-ink text-white p-8">
      <h1 className="font-display text-2xl font-bold">HagerLand admin</h1>
    </main>
  )
}
