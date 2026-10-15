import { BadgePercent } from 'lucide-react'
import { getActiveMembership, getProfile, getUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { buildMetadata } from '@/lib/seo'
import { brand } from '@/lib/brand'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Container } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { FormAlert } from '@/components/forms/FormParts'
import { TradeForm } from '@/components/supplies/TradeForm'

export const dynamic = 'force-dynamic'

export const metadata = buildMetadata({
  title: 'Trade accounts',
  description: `Contractors, developers and builders can apply for a ${brand.divisions.supply} trade account to see trade prices on materials whenever they are signed in.`,
  path: '/supplies/trade',
})

/** Trade accounts (spec 25.2e): apply, then see trade prices once HagerLand approves. */
export default async function TradePage() {
  const user = await getUser()
  const [profile, active, { data: account }] = user
    ? await Promise.all([getProfile(), getActiveMembership(), getServerSupabase().from('trade_accounts').select('status, reference, admin_note').eq('user_id', user.id).maybeSingle()])
    : [null, null, { data: null }]
  return (
    <Container className="max-w-3xl py-6 lg:py-10">
      <Breadcrumbs items={[{ label: brand.divisions.supply, href: '/supplies' }, { label: 'Trade accounts' }]} />
      <h1 className="hl-h1 mt-6 flex items-center gap-3">
        <BadgePercent className="size-8 text-gold" aria-hidden /> Trade accounts
      </h1>
      <p className="mt-3 text-muted">
        For contractors, developers, builders and other businesses that buy regularly. Once we approve your account, you see trade prices on products that have them whenever you are signed in. Trade prices are never shown publicly.
      </p>
      <div className="mt-8 rounded-lg border border-border bg-white p-5 sm:p-8">
        {!user ? (
          <div>
            <h2 className="hl-h3">Sign in to apply</h2>
            <p className="mt-2 text-muted">Applications are linked to your HagerLand account, so you see trade prices when you sign in.</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/login?next=/supplies/trade" className="flex-1">
                Sign in
              </ButtonLink>
              <ButtonLink href="/signup?next=/supplies/trade" variant="secondary" className="flex-1">
                Create an account
              </ButtonLink>
            </div>
          </div>
        ) : account?.status === 'approved' ? (
          <FormAlert tone="success">Your trade account is active. Trade prices appear on product pages while you are signed in.</FormAlert>
        ) : account?.status === 'pending' ? (
          <FormAlert tone="info">{`Your application (${account.reference}) is with us. We will email you when it has been decided.`}</FormAlert>
        ) : account?.status === 'revoked' ? (
          <FormAlert>Your trade account has been closed. Please contact us if you think this is a mistake.</FormAlert>
        ) : (
          <>
            {account?.status === 'rejected' && <FormAlert className="mb-5">{`We could not approve your last application.${account.admin_note ? ` ${account.admin_note}` : ''} You can apply again.`}</FormAlert>}
            <TradeForm defaults={{ business_name: active?.org.name ?? '', phone: profile?.phone ?? '' }} />
          </>
        )}
      </div>
    </Container>
  )
}
