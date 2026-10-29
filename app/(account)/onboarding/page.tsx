import { redirect } from 'next/navigation'
import { House, MailWarning, Search } from 'lucide-react'
import { getMemberships, isEmailConfirmed, requireUser } from '@/lib/auth'
import { getProductCategories, getServiceCategories } from '@/lib/data/reference'
import { BUSINESS_INTENTS, type SignupIntent } from '@/lib/validation/auth'
import { createOrganisationAction } from '@/app/(account)/account/company/org-actions'
import { OrganisationForm } from '@/components/account/OrganisationForm'
import { ButtonLink } from '@/components/ui/Button'
import { Container } from '@/components/ui/Layout'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Set up your account', robots: { index: false } }

const KINDS_BY_INTENT: Record<string, string[]> = {
  agent: ['agency'],
  developer: ['developer'],
  professional: ['contractor', 'professional_firm', 'sole_trader'],
  supplier: ['supplier', 'manufacturer'],
}

export default async function OnboardingPage(props: { searchParams: Promise<{ business?: string }> }) {
  const searchParams = await props.searchParams
  const user = await requireUser('/onboarding')
  if ((await getMemberships()).length > 0) redirect('/account')
  const intent = (user.user_metadata?.signup_intent as SignupIntent | undefined) ?? 'looking'
  const isBusiness = BUSINESS_INTENTS.includes(intent) || searchParams.business === '1'

  if (!isEmailConfirmed(user)) {
    return (
      <Container className="py-16">
        <div className="mx-auto max-w-md rounded-xl border border-border bg-white p-8 text-center shadow-sm">
          <MailWarning className="mx-auto size-10 text-gold" aria-hidden />
          <h1 className="hl-h2 mt-4">Confirm your email</h1>
          <p className="mt-2 text-muted">Open the link we sent to {user.email} to finish setting up your account.</p>
        </div>
      </Container>
    )
  }

  if (!isBusiness) {
    return (
      <Container className="py-16">
        <div className="mx-auto max-w-xl rounded-xl border border-border bg-white p-8 text-center shadow-sm">
          <h1 className="hl-h2">Welcome to HagerLand</h1>
          <p className="mt-2 text-muted">Your account is ready.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row [&>*]:flex-1">
            {intent === 'owner' ? (
              <ButtonLink href="/account/listings/new">
                <House /> List your property
              </ButtonLink>
            ) : (
              <ButtonLink href="/property">
                <Search /> Find property
              </ButtonLink>
            )}
            <ButtonLink href="/account" variant="secondary">
              Go to my account
            </ButtonLink>
          </div>
          <p className="mt-6 text-small text-muted">
            Run a business? <a href="/onboarding?business=1" className="font-semibold text-green underline">Create a business profile</a>
          </p>
        </div>
      </Container>
    )
  }

  const [services, products] = await Promise.all([getServiceCategories(), getProductCategories()])
  const kinds = KINDS_BY_INTENT[intent] ?? ['contractor', 'professional_firm', 'sole_trader', 'agency', 'developer', 'supplier', 'manufacturer']

  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <p className="hl-eyebrow text-green">Step 3 of 3</p>
        <h1 className="hl-h1 mt-2">Tell us about your business</h1>
        <p className="mt-2 text-muted">We review every new profile before it goes live and email you when it is approved.</p>
        <div className="mt-8 rounded-xl border border-border bg-white p-5 shadow-sm sm:p-8">
          <OrganisationForm
            action={createOrganisationAction}
            kinds={kinds}
            services={services.map((g) => ({ id: g.id, name: g.name, children: g.children }))}
            productCategories={products.map((c) => ({ id: c.id, name: c.name, children: [] }))}
            submitLabel="Submit for review"
          />
        </div>
      </div>
    </Container>
  )
}
