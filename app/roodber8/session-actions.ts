'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SESSION_COOKIE } from '@/lib/admin-auth'
import { audit } from '@/lib/admin/guard'

/** POST-only sign out (spec 18.1). */
export async function adminLogoutAction(): Promise<void> {
  await audit('admin.logout', {})
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  redirect('/roodber8-login')
}
