import { getActiveMembership, getMemberships, getProfile, requireUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { accountNavItems } from '@/lib/account-nav'
import { getVertical } from '@/lib/data/verticals'
import { AccountNav } from '@/components/account/AccountNav'
import { OrgSwitcher } from '@/components/account/OrgSwitcher'
import { Container } from '@/components/ui/Layout'

export const dynamic = 'force-dynamic'

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser('/account')
  const [profile, memberships, active] = await Promise.all([getProfile(), getMemberships(), getActiveMembership()])
  const { count } = await getServerSupabase().from('enquiries').select('id', { count: 'exact', head: true }).eq('status', 'new').or(`sender_user_id.is.null,sender_user_id.neq.${user.id}`)
  const { count: offered } = active
    ? await getServerSupabase().from('service_request_matches').select('id', { count: 'exact', head: true }).eq('org_id', active.org.id).eq('status', 'offered')
    : { count: 0 }
  const jobsLive = (await getVertical('jobs'))?.status === 'live'
  const items = accountNavItems(active, count ?? 0, offered ?? 0, jobsLive)

  return (
    <Container className="py-6 lg:py-10">
      <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-10">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="mb-4 hidden lg:block">
            <p className="font-semibold text-ink">{profile?.full_name ?? user.email}</p>
            <p className="text-small text-muted">{active ? active.org.name : 'Personal account'}</p>
          </div>
          {memberships.length > 1 && (
            <div className="mb-4">
              <OrgSwitcher memberships={memberships} activeId={active?.org.id ?? null} />
            </div>
          )}
          <AccountNav items={items} />
        </aside>
        <div className="mt-6 min-w-0 lg:mt-0">{children}</div>
      </div>
    </Container>
  )
}
