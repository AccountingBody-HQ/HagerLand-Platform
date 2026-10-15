import { notFound } from 'next/navigation'
import { getOrganisationBySlug } from '@/lib/data/organisations'
import { getProfile, requireUser } from '@/lib/auth'
import { AuthCard } from '@/components/auth/AuthCard'
import { ClaimForm } from '@/components/company/ClaimForm'
import { FormAlert } from '@/components/forms/FormParts'
import { ButtonLink } from '@/components/ui/Button'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Claim this business', robots: { index: false } }

export default async function ClaimPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params
  const user = await requireUser(`/company/${params.slug}/claim`)
  const org = await getOrganisationBySlug(params.slug)
  if (!org || !org.id || org.is_hagerland) notFound()
  const profile = await getProfile()
  return (
    <AuthCard title={`Claim ${org.name}`} subtitle="Claiming lets you update the profile, show your work and receive enquiries.">
      {org.has_members ? (
        <div className="space-y-4">
          <FormAlert tone="info">This business is already managed on HagerLand. If you think that is wrong, contact us and we will look into it.</FormAlert>
          <ButtonLink href="/contact?topic=claim-dispute" fullWidth>
            Contact us
          </ButtonLink>
        </div>
      ) : (
        <ClaimForm orgId={org.id} defaults={{ phone: profile?.phone ?? null, email: user.email ?? '' }} />
      )}
    </AuthCard>
  )
}
