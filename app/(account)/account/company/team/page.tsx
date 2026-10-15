import { Users } from 'lucide-react'
import { getActiveMembership, getUser, requireUser } from '@/lib/auth'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getServerSupabase } from '@/lib/supabase/server'
import { inviteMemberAction, revokeInvitationAction } from '@/app/actions/team-actions'
import { formatDate } from '@/lib/format'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { Card, EmptyState } from '@/components/ui/Layout'
import { Badge } from '@/components/ui/Badge'
import { Input, Select } from '@/components/ui/Field'
import { ActionForm } from '@/components/forms/ActionForm'
import { ActionButton } from '@/components/forms/ActionButton'
import { MemberTools } from '@/components/account/TeamTools'

export const metadata = { title: 'Team' }

const ROLE_LABEL: Record<string, string> = { owner: 'Owner', admin: 'Admin', member: 'Member' }

/** Team members, roles, invitations and ownership (spec 25.2i). */
export default async function TeamPage() {
  await requireUser('/account/company/team')
  const [active, me] = await Promise.all([getActiveMembership(), getUser()])
  if (!active) return <EmptyState icon={<Users />} title="Teams are for business accounts" description="Create a business profile to invite colleagues." />
  const { data: members } = await getServerSupabase().from('organisation_members').select('user_id, role, created_at').eq('org_id', active.org.id).order('created_at')
  const db = getAdminSupabase()
  // Names in one query; email addresses come from the auth service, one small call per member (teams are small).
  const { data: profiles } = await db.from('profiles').select('id, full_name').in('id', (members ?? []).map((m) => m.user_id))
  const people = await Promise.all(
    (members ?? []).map(async (m) => {
      const { data: u } = await db.auth.admin.getUserById(m.user_id)
      return { ...m, email: u.user?.email ?? '', name: profiles?.find((p) => p.id === m.user_id)?.full_name || u.user?.email || 'Team member' }
    }),
  )
  const manager = active.role === 'owner' || active.role === 'admin'
  const { data: invites } = manager ? await getServerSupabase().from('org_invitations').select('id, email, role, expires_at, created_at').eq('org_id', active.org.id).is('accepted_at', null).is('revoked_at', null).order('created_at', { ascending: false }) : { data: [] }
  return (
    <div className="space-y-6">
      <AccountPageHeader title="Team" description={`People who manage ${active.org.name} on HagerLand. Owners manage the team and ownership; admins manage listings, enquiries and members; members work on listings and enquiries.`} />
      <Card className="divide-y divide-border">
        {people.map((p) => (
          <div key={p.user_id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-semibold">
                {p.name} {p.user_id === me?.id && <span className="font-normal text-muted">(you)</span>}
              </p>
              <p className="truncate text-small text-muted">{p.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={p.role === 'owner' ? 'gold' : p.role === 'admin' ? 'info' : 'neutral'}>{ROLE_LABEL[p.role]}</Badge>
              <MemberTools userId={p.user_id} name={p.name} role={p.role} myRole={active.role} isMe={p.user_id === me?.id} />
            </div>
          </div>
        ))}
      </Card>
      {manager && (
        <Card className="space-y-4 p-5 sm:p-6">
          <h2 className="hl-h3">Invite someone</h2>
          <ActionForm action={inviteMemberAction} submitLabel="Send invitation">
            <label className="grid gap-1 text-small font-semibold">
              Email address
              <Input name="email" type="email" autoComplete="off" required />
            </label>
            <label className="grid gap-1 text-small font-semibold">
              Role
              <Select name="role" defaultValue="member">
                <option value="member">Member</option>
                {active.role === 'owner' && <option value="admin">Admin</option>}
              </Select>
            </label>
          </ActionForm>
          {invites && invites.length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold">Waiting to accept</h3>
              <ul className="divide-y divide-border rounded-md border border-border">
                {invites.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-small">
                    <span>
                      {i.email} · {ROLE_LABEL[i.role]} · expires {formatDate(i.expires_at)}
                    </span>
                    <ActionButton size="sm" variant="ghost" action={revokeInvitationAction.bind(null, i.id)}>
                      Cancel
                    </ActionButton>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
