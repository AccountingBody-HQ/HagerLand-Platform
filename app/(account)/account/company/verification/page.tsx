import { BadgeCheck, Store } from 'lucide-react'
import { getActiveMembership, requireUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { VerificationForm } from '@/components/account/VerificationForm'
import { Card, EmptyState } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { FormAlert } from '@/components/forms/FormParts'
import { formatDate } from '@/lib/format'
import { accountBadgeState } from '@/lib/verification-data'
import { LoadFailed } from '@/components/account/LoadFailed'
import { log } from '@/lib/log'

export const metadata = { title: 'Get Verified' }

export default async function VerificationPage() {
  await requireUser('/account/company/verification')
  const active = await getActiveMembership()
  if (!active) return <EmptyState icon={<Store />} title="Create a business profile first" actions={<ButtonLink href="/onboarding?business=1">Create a business profile</ButtonLink>} />
  const { data: latest, error } = await getServerSupabase().from('verification_requests').select('status, created_at, decided_at').eq('org_id', active.org.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  // Jobs Phase 4: badges are checked again every 12 months (W7–W11). Legacy badges keep the original wording (F5).
  const badge = await accountBadgeState(active.org.id, active.org.verification_level)
  if (error) log.error('account', 'verification failed to load', error)
  const pending = latest?.status === 'pending'
  const form = (
    <Card className="p-5 sm:p-6">
      <VerificationForm orgId={active.org.id} kind={active.org.kind} />
    </Card>
  )
  return (
    <div className="space-y-6">
      <AccountPageHeader title="Get Verified" description="The gold Verified badge shows customers and job seekers that HagerLand has checked your trade licence and tax number. We check again every 12 months." />
      {error ? (
        <LoadFailed what="your verification" />
      ) : active.org.verification_level === 'verified' ? (
        <>
          <Card className="flex items-center gap-3 p-5">
            <BadgeCheck className="size-6 text-gold" aria-hidden /> {badge.kind === 'live' ? `${active.org.name} is Verified until ${formatDate(badge.endsOn)}.` : `${active.org.name} is Verified.`}
          </Card>
          {(badge.kind === 'live' || badge.kind === 'legacy') && badge.dueSoon && badge.endsOn && (
            <>
              <FormAlert tone="info">Your Verified badge ends on {formatDate(badge.endsOn)}. Upload your current trade licence to keep it.</FormAlert>
              {pending ? <FormAlert tone="info">Your documents were submitted on {formatDate(latest.created_at)} and are being checked.</FormAlert> : form}
            </>
          )}
        </>
      ) : pending ? (
        <FormAlert tone="info">Your documents were submitted on {formatDate(latest.created_at)} and are being checked.</FormAlert>
      ) : (
        <>
          {badge.kind === 'ended' ? (
            <FormAlert>Your Verified badge has ended. Upload your current trade licence to get it back.</FormAlert>
          ) : (
            latest?.status === 'rejected' && <FormAlert>We couldn&apos;t verify your last submission. Please upload clear, current documents.</FormAlert>
          )}
          {form}
        </>
      )}
    </div>
  )
}
