import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifySessionToken, SESSION_COOKIE } from '@/lib/admin-auth'
import { unstable_noStore as noStore } from 'next/cache'
import TransferServicesAdminClient from './TransferServicesAdminClient'

export const dynamic = 'force-dynamic'

export default function Page() {
  noStore()
  const token = cookies().get(SESSION_COOKIE)?.value
  if (!verifySessionToken(token)) redirect('/roodber8-login')

  return <TransferServicesAdminClient />
}
