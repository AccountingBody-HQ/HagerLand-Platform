import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Briefcase, CalendarClock, Hammer, MapPin, ShieldCheck } from 'lucide-react'
import { getJobBySlug } from '@/lib/data/jobs'
import { getVertical } from '@/lib/data/verticals'
import { readJobsSwitches } from '@/lib/jobs-switches'
import { getJobsI18n } from '@/lib/i18n/server'
import { fill } from '@/lib/i18n/translate'
import { formatDateFor } from '@/lib/i18n/dates'
import { buildMetadata, truncateDescription } from '@/lib/seo'
import { canonicalUrl } from '@/lib/site'
import { publicMediaUrl } from '@/lib/media'
import { EMPLOYMENT_TYPES, SCHEMA_EMPLOYMENT, categoryLabel, formatSalary, labelFor, tradeLabel, type EmploymentType } from '@/lib/jobs'
import { verticalLandingMetadata } from '@/components/verticals/ComingSoonPage'
import { Container } from '@/components/ui/Layout'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { ButtonLink } from '@/components/ui/Button'
import { ExpandableText } from '@/components/ui/ExpandableText'
import { VerificationBadge } from '@/components/company/VerificationBadge'
import { JsonLd } from '@/components/seo/JsonLd'
import { ReportJob } from '@/components/jobs/ReportJob'
import { ShareJob } from '@/components/jobs/ShareJob'
import { shareLinks, shareText, telegramShareText } from '@/lib/jobs-share'
import { liveRecord } from '@/lib/verification-data'
import { REPORT_REASONS } from '@/lib/job-reports'
import { brand } from '@/lib/brand'

export const revalidate = 300

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params
  const [job, { locale, t }] = await Promise.all([getJobBySlug(params.slug), getJobsI18n()])
  return verticalLandingMetadata('jobs', () =>
    job
      ? buildMetadata({
          // A private-client job never names the client (Jobs Phase 4).
          title: job.posted_for === 'private_client' ? `${job.title}, ${job.location_display?.split(', ')[0]}` : fill(t('{title} at {employer}, {place}'), { title: job.title ?? '', employer: job.employer_name ?? '', place: job.location_display?.split(', ')[0] ?? '' }),
          description: truncateDescription(job.description ?? job.title ?? ''),
          path: `/jobs/${job.slug}`,
          locale,
        })
      : { title: t('Job not found') },
  )
}

const UNIT: Record<string, string> = { hour: 'HOUR', day: 'DAY', month: 'MONTH', year: 'YEAR' }

export default async function JobPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params
  const v = await getVertical('jobs')
  if (!v || v.status !== 'live') notFound()
  const job = await getJobBySlug(params.slug)
  if (!job || !job.id) notFound()
  const privateClient = job.posted_for === 'private_client'
  const [switches, { locale, t, href }, badgeRecord] = await Promise.all([readJobsSwitches(), getJobsI18n(), !privateClient && job.employer_verification === 'verified' && job.employer_org_id ? liveRecord(job.employer_org_id) : Promise.resolve(null)])
  const salary = formatSalary(job.salary_min_minor, job.salary_max_minor, job.currency ?? 'ETB', job.salary_period, t)
  const place = job.location_display?.split(', ') ?? []
  // Share links (Jobs Phase 5): the canonical address of this page (the /am address on Amharic pages), no tracking tags.
  const shareLink = canonicalUrl(href(`/jobs/${job.slug}`))
  const shareMessage = shareText({ title: job.title ?? '', place: place[0] ?? '', link: shareLink, privateClient }, t)
  const share = shareLinks(shareMessage, shareLink, telegramShareText({ title: job.title ?? '', place: place[0] ?? '', privateClient }, t))
  return (
    <Container className="py-6 lg:py-8">
      <Breadcrumbs items={[{ label: t('Jobs'), href: href('/jobs') }, { label: t(categoryLabel(job.category)), href: href(`/jobs?category=${job.category}`) }, { label: job.title ?? '' }]} />
      <div className="mt-6 lg:grid lg:grid-cols-[1fr_340px] lg:gap-10">
        <article className="min-w-0 space-y-8">
          <header>
            <p className="font-semibold text-green">{t(categoryLabel(job.category))}</p>
            <h1 className="hl-h1 mt-1">{job.title}</h1>
            {privateClient ? (
              <>
                <p className="mt-2 text-[1.0625rem] font-semibold text-ink">{t('Posted by HagerLand for a private client')}</p>
                <p className="mt-1 text-muted">{t('HagerLand is handling this job for a private client. Your application goes to HagerLand, and we introduce you to the employer only if you agree.')}</p>
              </>
            ) : (
            <p className="mt-2 flex flex-wrap items-center gap-2 text-[1.0625rem] text-muted">
              {job.employer_slug ? (
                <Link href={`/company/${job.employer_slug}`} className="font-semibold text-ink underline-offset-2 hover:underline">
                  {job.employer_name}
                </Link>
              ) : (
                job.employer_name
              )}
              <VerificationBadge level={job.employer_verification} record={badgeRecord} />
            </p>
            )}
            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-muted">
              <li className="inline-flex items-center gap-1.5">
                <MapPin className="size-5" aria-hidden /> {job.location_display}
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Briefcase className="size-5" aria-hidden /> {t(labelFor(EMPLOYMENT_TYPES, job.employment_type))}
              </li>
              {job.trade && (
                <li className="inline-flex items-center gap-1.5">
                  <Hammer className="size-5" aria-hidden /> {t('Trade')}: {t(tradeLabel(job.trade))}
                </li>
              )}
              {job.closing_date && (
                <li className="inline-flex items-center gap-1.5">
                  <CalendarClock className="size-5" aria-hidden /> {fill(t('Closes {date}'), { date: formatDateFor(job.closing_date, locale) })}
                </li>
              )}
            </ul>
            {salary && <p className="mt-4 text-h3 font-bold text-ink">{salary}</p>}
          </header>
          <section aria-labelledby="desc-heading">
            <h2 id="desc-heading" className="hl-h3 mb-3">
              {t('About the job')}
            </h2>
            <ExpandableText text={job.description ?? ''} />
          </section>
          {job.requirements && (
            <section aria-labelledby="req-heading">
              <h2 id="req-heading" className="hl-h3 mb-3">
                {t('What you need')}
              </h2>
              <p className="whitespace-pre-line">{job.requirements}</p>
            </section>
          )}
        </article>
        <aside className="mt-8 space-y-4 lg:mt-0">
          <div className="rounded-lg border border-border bg-white p-5 shadow-sm lg:sticky lg:top-24">
            <h2 className="font-semibold text-ink">{t('Apply for this job')}</h2>
            <p className="mt-1 text-small text-muted">{privateClient ? t('Send your CV and a short note. Only HagerLand can see your application.') : fill(t('Send your CV and a short note. Only {employer} and HagerLand can see your application.'), { employer: job.employer_name ?? '' })}</p>
            <ButtonLink href={href(`/jobs/${job.slug}/apply`)} size="lg" className="mt-4 w-full">
              {t('Apply now')}
            </ButtonLink>
            {switches.phoneApply && (
              <ButtonLink href={href(`/jobs/${job.slug}/apply-by-phone`)} variant="secondary" size="lg" className="mt-3 w-full">
                {t('Apply by phone')}
              </ButtonLink>
            )}
            <p className="mt-4 flex gap-2 text-small text-muted">
              <ShieldCheck className="size-5 shrink-0 text-green" aria-hidden /> {t('Never pay an employer or agent to get a job. Report anything suspicious to HagerLand.')}
            </p>
            {switches.reportsEnabled && (
              <ReportJob
                jobId={job.id}
                text={{
                  button: t('Report this job'),
                  title: t('Report this job'),
                  legend: t('What is the problem?'),
                  reasons: REPORT_REASONS.map((r) => ({ value: r.value, label: t(r.label) })),
                  details: t('What did you notice?'),
                  contact: t('Your phone or email'),
                  contactHint: t("Only if you're happy for us to follow up. We don't share it with the employer."),
                  send: t('Send report'),
                  sending: t('Sending…'),
                }}
              />
            )}
          </div>
          <ShareJob
            link={shareLink}
            message={shareMessage}
            whatsapp={share.whatsapp}
            telegram={share.telegram}
            text={{ heading: t('Share this job'), whatsapp: t('WhatsApp'), telegram: t('Telegram'), share: t('Share'), copy: t('Copy link'), copied: t('Link copied.') }}
          />
        </aside>
      </div>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'JobPosting',
          title: job.title,
          description: job.description,
          identifier: { '@type': 'PropertyValue', name: 'HagerLand', value: job.short_id },
          datePosted: job.published_at,
          ...(job.expires_at ? { validThrough: job.expires_at } : {}),
          employmentType: SCHEMA_EMPLOYMENT[job.employment_type as EmploymentType] ?? 'OTHER',
          hiringOrganization: privateClient
            ? { '@type': 'Organization', name: brand.name, sameAs: canonicalUrl('/') }
            : {
                '@type': 'Organization',
                name: job.employer_name,
                ...(job.employer_slug ? { sameAs: canonicalUrl(`/company/${job.employer_slug}`) } : {}),
                ...(publicMediaUrl(job.employer_logo_path) ? { logo: publicMediaUrl(job.employer_logo_path) } : {}),
              },
          jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: place[0], addressCountry: job.country_code } },
          url: canonicalUrl(`/jobs/${job.slug}`),
          ...(job.salary_min_minor !== null || job.salary_max_minor !== null
            ? {
                baseSalary: {
                  '@type': 'MonetaryAmount',
                  currency: job.currency,
                  value: {
                    '@type': 'QuantitativeValue',
                    ...(job.salary_min_minor !== null ? { minValue: job.salary_min_minor / 100 } : {}),
                    ...(job.salary_max_minor !== null ? { maxValue: job.salary_max_minor / 100 } : {}),
                    unitText: UNIT[job.salary_period ?? ''] ?? 'MONTH',
                  },
                },
              }
            : {}),
        }}
      />
    </Container>
  )
}
