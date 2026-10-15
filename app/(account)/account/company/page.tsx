import Link from 'next/link'
import { ExternalLink, Store } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { loadActiveOrg } from '@/lib/data/owner-org'
import { getProductCategories, getServiceCategories } from '@/lib/data/reference'
import { updateOrganisationAction } from './org-actions'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { OrganisationForm } from '@/components/account/OrganisationForm'
import { SingleImageUpload } from '@/components/media/SingleImageUpload'
import { Badge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { Card, EmptyState } from '@/components/ui/Layout'
import { FormAlert } from '@/components/forms/FormParts'
import { LISTING_STATUS_LABELS } from '@/lib/labels'
import { VerificationBadge } from '@/components/company/VerificationBadge'

export const metadata = { title: 'Company profile' }

export default async function CompanyEditorPage() {
  await requireUser('/account/company')
  const loaded = await loadActiveOrg()
  if (!loaded) {
    return (
      <div className="space-y-6">
        <AccountPageHeader title="Business profile" />
        <EmptyState
          icon={<Store />}
          title="You don't have a business profile yet"
          description="Create one to appear in the directory, show your work and receive enquiries."
          actions={<ButtonLink href="/onboarding?business=1">Create a business profile</ButtonLink>}
        />
      </div>
    )
  }
  const { membership, org, defaults } = loaded
  const canEdit = membership.role === 'owner' || membership.role === 'admin'
  const [services, products] = await Promise.all([getServiceCategories(), getProductCategories()])
  const status = LISTING_STATUS_LABELS[org.status]

  return (
    <div className="space-y-6">
      <AccountPageHeader
        title={org.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={status.tone}>{status.label}</Badge>
            <VerificationBadge level={org.verification_level} verifiedAt={org.verified_at} />
          </span>
        }
        action={
          org.status === 'published' ? (
            <ButtonLink href={`/company/${org.slug}`} variant="secondary">
              View public profile <ExternalLink />
            </ButtonLink>
          ) : undefined
        }
      />
      {org.status === 'rejected' && org.rejection_reason && <FormAlert>{org.rejection_reason}</FormAlert>}
      {org.pending_changes && <FormAlert tone="info">You have changes waiting for review. The live profile shows the previous version until then.</FormAlert>}
      {org.verification_level !== 'verified' && (
        <FormAlert tone="info">
          Get the gold Verified badge: <Link href="/account/company/verification" className="font-semibold underline">submit your trade licence and TIN certificate</Link>.
        </FormAlert>
      )}
      {canEdit ? (
        <>
          <Card className="grid gap-6 p-5 sm:grid-cols-[200px_1fr] sm:p-6">
            <div>
              <h2 className="mb-3 font-semibold">Logo</h2>
              <SingleImageUpload entityType="organisation" entityId={org.id} kind="logo" currentPath={org.logo_path} label="Logo" aspect="aspect-square w-32" />
            </div>
            <div>
              <h2 className="mb-3 font-semibold">Cover image</h2>
              <SingleImageUpload entityType="organisation" entityId={org.id} kind="cover" currentPath={org.cover_path} label="Cover image" aspect="aspect-[3/1]" />
            </div>
          </Card>
          <Card className="p-5 sm:p-8">
            <OrganisationForm
              action={updateOrganisationAction}
              kinds={[org.kind]}
              services={services.map((g) => ({ id: g.id, name: g.name, children: g.children }))}
              productCategories={products.map((c) => ({ id: c.id, name: c.name, children: [] }))}
              defaults={{ ...defaults, id: org.id }}
              submitLabel={org.status === 'published' ? 'Submit changes' : org.status === 'rejected' ? 'Save and resubmit' : 'Save'}
              pendingNote={org.status === 'published' ? 'Changes to a live profile are checked by our team before they appear.' : undefined}
            />
          </Card>
        </>
      ) : (
        <FormAlert tone="info">Only owners and admins can edit this profile.</FormAlert>
      )}
    </div>
  )
}
