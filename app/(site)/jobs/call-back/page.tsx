import { notFound } from 'next/navigation'
import { readJobsSwitches } from '@/lib/jobs-switches'
import { buildMetadata } from '@/lib/seo'
import { getJobsI18n } from '@/lib/i18n/server'
import { CALLBACK_PATH, CALLBACK_TEXT } from '@/lib/callbacks'
import { ABROAD_COUNTRIES } from '@/lib/service-requests/employer-abroad'
import { Container } from '@/components/ui/Layout'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { CallbackForm } from '@/components/jobs/CallbackForm'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  const { locale, t } = await getJobsI18n()
  return buildMetadata({ title: t(CALLBACK_TEXT.submit), description: t(CALLBACK_TEXT.boxText), path: CALLBACK_PATH, noindex: true, locale })
}

/** "Ask for a call" for people hiring (Jobs Phase 5). Not found while the owner's call-back switch is off. */
export default async function CallbackPage() {
  if (!(await readJobsSwitches()).callbacks) notFound()
  const { t, href } = await getJobsI18n()
  return (
    <Container className="max-w-2xl py-6 lg:py-10">
      <Breadcrumbs items={[{ label: t('Jobs'), href: href('/jobs') }, { label: t(CALLBACK_TEXT.submit) }]} />
      <h1 className="hl-h1 mt-6">{t(CALLBACK_TEXT.boxHeading)}</h1>
      <p className="mt-3">{t(CALLBACK_TEXT.boxText)}</p>
      <div className="mt-8 rounded-lg border border-border bg-white p-5 sm:p-8">
        <CallbackForm countries={ABROAD_COUNTRIES.map((c) => ({ code: c.code, name: c.name }))} />
      </div>
    </Container>
  )
}
