import { getUser } from '@/lib/auth'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { hashRequestToken, isWellFormedToken } from '@/lib/service-requests/token'
import { acceptInvitationAction } from '@/app/actions/team-actions'
import { buildMetadata } from '@/lib/seo'
import { Container } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { FormAlert } from '@/components/forms/FormParts'
import { ActionButton } from '@/components/forms/ActionButton'

export const dynamic = 'force-dynamic'

export function generateMetadata() {
  return buildMetadata({ title: 'Team invitation', description: 'Join a business team on HagerLand.', path: '/invite', noindex: true })
}

/** Accept an invitation to an organisation's team (spec 25.2i). */
export default async function InvitePage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params
  const valid = isWellFormedToken(params.token)
  const { data: inv } = valid ? await getAdminSupabase().from('org_invitations').select('email, role, expires_at, accepted_at, revoked_at, org_id').eq('token_hash', hashRequestToken(params.token)).maybeSingle() : { data: null }
  const { data: org } = inv ? await getAdminSupabase().from('organisations').select('name').eq('id', inv.org_id).maybeSingle() : { data: null }
  const user = await getUser()
  const usable = inv && !inv.revoked_at && !inv.accepted_at && new Date(inv.expires_at).getTime() > Date.now()
  const next = encodeURIComponent(`/invite/${params.token}`)
  return (
    <Container className="max-w-xl py-10 lg:py-16">
      <h1 className="hl-h1">Team invitation</h1>
      <div className="mt-6 rounded-lg border border-border bg-white p-5 sm:p-8">
        {!usable ? (
          <FormAlert>This invitation is no longer valid. Ask the person who invited you for a new one.</FormAlert>
        ) : !user ? (
          <>
            <p>
              You have been invited to join <strong>{org?.name}</strong> on HagerLand. Sign in, or create a free account, with <strong>{inv.email}</strong> to accept.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={`/login?next=${next}`} className="flex-1">
                Sign in
              </ButtonLink>
              <ButtonLink href={`/signup?next=${next}`} variant="secondary" className="flex-1">
                Create an account
              </ButtonLink>
            </div>
          </>
        ) : user.email?.toLowerCase() !== inv.email ? (
          <FormAlert>{`This invitation is for ${inv.email}, but you are signed in as ${user.email}. Sign out and sign in with ${inv.email} to accept it.`}</FormAlert>
        ) : (
          <>
            <p>
              Join <strong>{org?.name}</strong> as {inv.role === 'admin' ? 'an admin' : 'a team member'}?
            </p>
            <ActionButton className="mt-5 w-full" action={acceptInvitationAction.bind(null, params.token)}>
              Accept invitation
            </ActionButton>
          </>
        )}
      </div>
    </Container>
  )
}
