import { CircleCheck } from 'lucide-react'
import { buildMetadata } from '@/lib/seo'
import { getUser } from '@/lib/auth'
import { Container } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { STAFFING_SLUG, requestFormCopy } from '@/lib/service-requests/form-copy'
import { getJobsI18n } from '@/lib/i18n/server'
import type { Translate } from '@/lib/i18n/translate'

export const dynamic = 'force-dynamic'

const asIs: Translate = (s) => s

/** The staffing thank-you page is a Jobs page (Jobs Phase 5, Jobs translator); for other services nothing changes. */
async function sentI18n(forSlug: string | undefined) {
  if (forSlug !== STAFFING_SLUG) return { staffing: false, locale: 'en' as const, t: asIs, href: asIs }
  const { locale, t, href } = await getJobsI18n()
  return { staffing: true, locale, t, href }
}

export async function generateMetadata(props: { searchParams: Promise<{ for?: string }> }) {
  const { staffing, locale, t } = await sentI18n((await props.searchParams).for)
  return buildMetadata({ title: t('Request sent'), description: t('Your service request has been sent to HagerLand.'), path: '/request-service/sent', noindex: true, ...(staffing ? { locale } : {}) })
}

export default async function RequestSentPage(props: { searchParams: Promise<{ ref?: string; for?: string }> }) {
  const searchParams = await props.searchParams
  const ref = /^HLS-\d{4}-\d{6}$/.test(searchParams.ref ?? '') ? searchParams.ref : null
  const user = await getUser()
  // Services HagerLand handles itself (the staffing requirement) say who contacts the customer instead of providers.
  const copy = requestFormCopy(searchParams.for ?? '')
  const { t, href } = await sentI18n(searchParams.for)
  const nextStep = copy.nextStep
  const steps = copy.customer?.sentSteps
  return (
    <Container className="max-w-2xl py-12 text-center lg:py-20">
      <CircleCheck className="mx-auto size-14 text-green" aria-hidden />
      <h1 className="hl-h1 mt-4">{t('Your request is on its way')}</h1>
      {ref && (
        <p className="mt-3 text-muted">
          {t('Your reference is')} <strong className="text-ink">{ref}</strong>.
        </p>
      )}
      <ol className="mx-auto mt-8 max-w-md space-y-3 text-left">
        <li>1. {nextStep ? t(nextStep) : 'We check your request and match it with up to three suitable providers at a time.'}</li>
        <li>2. {steps ? t(steps.second) : 'Providers who accept it contact you directly and send a quote.'}</li>
        <li>3. {steps ? t(user ? steps.thirdSignedIn : steps.thirdGuest) : `${user ? 'Quotes appear in your account.' : 'We have emailed you a private link where your quotes will appear.'} Choose the one you want.`}</li>
      </ol>
      <p className="mt-6 text-small text-muted">{t('Never pay a deposit before you have agreed the work, price and timing in writing.')}</p>
      <div className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row [&>*]:flex-1">
        {user ? <ButtonLink href={href('/account/service-requests')}>{t('My service requests')}</ButtonLink> : <ButtonLink href={href('/')}>{t('Back to HagerLand')}</ButtonLink>}
        <ButtonLink href={href('/request-service')} variant="secondary">
          {t('Request another service')}
        </ButtonLink>
      </div>
    </Container>
  )
}
