import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import { getServerSupabase } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/env'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type OrgRole = Database['public']['Enums']['org_role']
export type OrgKind = Database['public']['Enums']['org_kind']

export interface Membership {
  role: OrgRole
  org: {
    id: string
    name: string
    slug: string
    kind: OrgKind
    status: Database['public']['Enums']['listing_status']
    verification_level: Database['public']['Enums']['verification_level']
    logo_path: string | null
  }
}

export const ACTIVE_ORG_COOKIE = 'hl_org'

export const getUser = cache(async (): Promise<User | null> => {
  if (!isSupabaseConfigured()) return null
  const { data } = await getServerSupabase().auth.getUser()
  return data.user ?? null
})

export const getProfile = cache(async (): Promise<Profile | null> => {
  const user = await getUser()
  if (!user) return null
  const { data } = await getServerSupabase().from('profiles').select('*').eq('id', user.id).maybeSingle()
  return data
})

/** Redirects to /login (and back afterwards) when nobody is signed in. */
export async function requireUser(nextPath = '/account'): Promise<User> {
  const user = await getUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`)
  return user
}

export const getMemberships = cache(async (): Promise<Membership[]> => {
  const user = await getUser()
  if (!user) return []
  const { data } = await getServerSupabase()
    .from('organisation_members')
    .select('role, org:organisations(id, name, slug, kind, status, verification_level, logo_path)')
    .eq('user_id', user.id)
  return (data ?? []).filter((m): m is Membership => Boolean(m.org)).sort((a, b) => a.org.name.localeCompare(b.org.name))
})

/** The organisation the user is working as (chosen in the switcher), or their first one. */
export const getActiveMembership = cache(async (): Promise<Membership | null> => {
  const memberships = await getMemberships()
  if (memberships.length === 0) return null
  const chosen = cookies().get(ACTIVE_ORG_COOKIE)?.value
  return memberships.find((m) => m.org.id === chosen) ?? memberships[0]
})

export async function requireOrgRole(orgId: string, roles: OrgRole[] = ['owner', 'admin', 'member']): Promise<Membership> {
  const memberships = await getMemberships()
  const m = memberships.find((x) => x.org.id === orgId)
  if (!m || !roles.includes(m.role)) redirect('/account?error=forbidden')
  return m
}

export function isEmailConfirmed(user: User): boolean {
  return Boolean(user.email_confirmed_at ?? user.confirmed_at)
}
