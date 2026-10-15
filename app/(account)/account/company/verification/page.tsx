import { BadgeCheck, Store } from 'lucide-react'
import { getActiveMembership, requireUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { VerificationForm } from '@/components/account/VerificationForm'
import { Card, EmptyState } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { FormAlert } from '@/components/forms/FormParts'
import { formatDate } from '@/lib/format'

export const metadata = { title: 'Get Verified' }

export default async function VerificationPage() {
  await requireUser('/account/company/verification')
  const active = await getActiveMembership()
  if (!active) return <EmptyState icon={<Store />} title="Create a business profile first" actions={<ButtonLink href="/onboarding?business=1">Create a business profile</ButtonLink>} />
  const { data: latest } = await getServerSupabase().from('verification_requests').select('status, created_at, decided_at').eq('org_id', active.org.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
  return (
    <div className="space-y-6">
      <AccountPageHeader title="Get Verified" description="The gold Verified badge shows customers that HagerLand has checked your trade licence." />
      {active.org.verification_level === 'verified' ? (
        <Card className="flex items-center gap-3 p-5">
          <BadgeCheck className="size-6 text-gold" aria-hidden /> {active.org.name} is Verified.
        </Card>
      ) : latest?.status === 'pending' ? (
        <FormAlert tone="info">Your documents were submitted on {formatDate(latest.created_at)} and are being checked.</FormAlert>
      ) : (
        <>
          {latest?.status === 'rejected' && <FormAlert>We couldn&apos;t verify your last submission. Please upload clear, current documents.</FormAlert>}
          <Card className="p-5 sm:p-6">
            <VerificationForm orgId={active.org.id} kind={active.org.kind} />
          </Card>
        </>
      )}
    </div>
  )
}
