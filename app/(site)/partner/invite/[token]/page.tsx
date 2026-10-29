import { redirect } from 'next/navigation'
import { getUser } from '@/lib/auth'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { hashRequestToken, isWellFormedToken } from '@/lib/service-requests/token'
import { acceptPartnerInvitationAction } from '@/app/actions/partner-portal-actions'
import { buildMetadata } from '@/lib/seo'
import { Container } from '@/components/ui/Layout'
import { FormAlert } from '@/components/forms/FormParts'
import { ActionButton } from '@/components/forms/ActionButton'
import { PORTAL_TEXT } from '@/lib/supply/partner-rules'

export const dynamic = 'force-dynamic'

export function generateMetadata() {
  return buildMetadata({ title: PORTAL_TEXT.areaTitle, description: PORTAL_TEXT.intro, path: '/partner', noindex: true })
}

/**
 * S6-1: the link in the partner-area invitation. Guests sign in or create an account first (the existing pages, which
 * come back here); then one tap makes them a partner member. Messages are the site's existing invitation texts.
 */
export default async function PartnerInvitePage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params
  const valid = isWellFormedToken(token)
  const { data: inv } = valid
    ? await getAdminSupabase().from('partner_invitations').select('email, expires_at, accepted_at, revoked_at').eq('token_hash', hashRequestToken(token)).maybeSingle()
    : { data: null }
  const usable = inv && !inv.revoked_at && !inv.accepted_at && new Date(inv.expires_at).getTime() > Date.now()
  const user = await getUser()
  if (usable && !user) redirect(`/login?next=${encodeURIComponent(`/partner/invite/${token}`)}`)
  return (
    <Container className="max-w-xl py-10 lg:py-16">
      <h1 className="hl-h1">{PORTAL_TEXT.areaTitle}</h1>
      <div className="mt-6 rounded-lg border border-border bg-white p-5 sm:p-8">
        {!usable ? (
          <FormAlert>This invitation is no longer valid. Ask the person who invited you for a new one.</FormAlert>
        ) : user?.email?.toLowerCase() !== inv.email ? (
          <FormAlert>{`This invitation is for ${inv.email}, but you are signed in as ${user?.email}. Sign out and sign in with ${inv.email} to accept it.`}</FormAlert>
        ) : (
          <ActionButton className="w-full" action={acceptPartnerInvitationAction.bind(null, token)}>
            {PORTAL_TEXT.openArea}
          </ActionButton>
        )}
      </div>
    </Container>
  )
}
