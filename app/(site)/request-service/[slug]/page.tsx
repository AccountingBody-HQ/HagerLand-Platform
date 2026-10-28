import { notFound } from 'next/navigation'
import { getRequestableCategory } from '@/lib/data/service-requests'
import { getProfile, getUser } from '@/lib/auth'
import { buildMetadata } from '@/lib/seo'
import { Container } from '@/components/ui/Layout'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { ServiceRequestForm } from '@/components/service-requests/ServiceRequestForm'
import { HowRequestsWork } from '@/components/service-requests/HowRequestsWork'
import { STAFFING_SLUG, askedQuestions, requestFormCopy } from '@/lib/service-requests/form-copy'
import { ABROAD_COUNTRIES, EMPLOYER_ABROAD_TEXT } from '@/lib/service-requests/employer-abroad'
import { getJobsI18n, getLocale } from '@/lib/i18n/server'
import { translator, type Translate } from '@/lib/i18n/translate'
import type { Locale } from '@/lib/i18n/config'
import { readJobsSwitches } from '@/lib/jobs-switches'
import { CallbackBox } from '@/components/jobs/CallbackBox'
import { isOwnerOrOperationsSession } from '@/lib/admin/guard'
import { openCallback } from '@/lib/callbacks-data'

const asIs: Translate = (s) => s

/** The staffing requirement is a Jobs page (Jobs Phase 5, Jobs translator); every other service is unchanged. */
async function pageI18n(slug: string): Promise<{ staffing: boolean; locale: Locale; t: Translate; href: (h: string) => string }> {
  if (slug !== STAFFING_SLUG) return { staffing: false, locale: 'en', t: asIs, href: asIs }
  const { locale, t, href } = await getJobsI18n()
  return { staffing: true, locale, t, href }
}

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params
  const c = await getRequestableCategory(params.slug)
  if (!c) return {}
  const { staffing, locale, t } = await pageI18n(c.slug)
  return buildMetadata({
    title: t(requestFormCopy(c.slug).tabTitle(c.name)),
    description: t(requestFormCopy(c.slug).metaDescription(c.name)),
    path: `/request-service/${c.slug}`,
    ...(staffing ? { locale } : {}),
  })
}

export default async function RequestCategoryPage(
  props: { params: Promise<{ slug: string }>; searchParams: Promise<{ abroad?: string; callback?: string }> }
) {
  const searchParams = await props.searchParams
  const params = await props.params
  const category = await getRequestableCategory(params.slug)
  if (!category) notFound()
  const [user, profile] = await Promise.all([getUser(), getProfile()])
  const copy = requestFormCopy(category.slug)
  const { staffing, t: pt, href } = await pageI18n(category.slug)
  // Jobs Phase 5: "Ask us to call you" on the staffing page, only while the owner's call-back switch is on.
  const callbacks = staffing && (await readJobsSwitches()).callbacks
  // "Called — turned into a staffing request" (Jobs Phase 5): staff (Owner and Operations) open this form pre-filled from
  // an open call-back. Anyone else, or any other id, gets the normal empty form.
  const fromCallback = staffing && searchParams.callback && /^[0-9a-f-]{36}$/.test(searchParams.callback) && (await isOwnerOrOperationsSession()) ? await openCallback(searchParams.callback) : null
  const t = staffing ? pt : translator(await getLocale())
  return (
    <Container className="py-8 lg:py-12">
      <Breadcrumbs items={[{ label: pt('Request a service'), href: href('/request-service') }, { label: pt(category.name) }]} />
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <p className="hl-eyebrow text-green">{category.groupName && pt(category.groupName)}</p>
          <h1 className="hl-h1 mt-2">{pt(copy.heading(category.name))}</h1>
          {category.description && <p className="mt-3 max-w-2xl text-muted">{pt(category.description)}</p>}
          <div className="mt-8">
            <ServiceRequestForm
              categorySlug={category.slug}
              categoryName={category.name}
              questions={askedQuestions(category.slug, category.questions)}
              allowsEmergency={category.allowsEmergency}
              abroad={searchParams.abroad === '1'}
              employerAbroad={
                copy.employerAbroad
                  ? { question: t(EMPLOYER_ABROAD_TEXT.question), hint: t(EMPLOYER_ABROAD_TEXT.hint), countryQuestion: t(EMPLOYER_ABROAD_TEXT.countryQuestion), countries: ABROAD_COUNTRIES.map((c) => ({ code: c.code, name: c.name })) }
                  : null
              }
              defaults={fromCallback ? { name: fromCallback.name, phone: fromCallback.phone, details: fromCallback.need } : { name: profile?.full_name, phone: profile?.phone, email: user?.email }}
              callbackId={fromCallback?.id ?? null}
            />
          </div>
        </div>
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <h2 className="hl-h3 mb-4">{pt('How it works')}</h2>
          <HowRequestsWork compact steps={staffing ? copy.steps.map((s) => ({ title: pt(s.title), text: pt(s.text) })) : copy.steps} />
          {callbacks && (
            <div className="mt-6">
              <CallbackBox t={pt} href={href} />
            </div>
          )}
        </aside>
      </div>
    </Container>
  )
}
