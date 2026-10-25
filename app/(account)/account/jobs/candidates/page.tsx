import { Search, Users } from 'lucide-react'
import { getActiveMembership, getMemberships, requireUser } from '@/lib/auth'
import { canSeeCandidates } from '@/lib/jobs-privacy'
import { getLocale } from '@/lib/i18n/server'
import { translator } from '@/lib/i18n/translate'
import { getServerSupabase } from '@/lib/supabase/server'
import { getVertical } from '@/lib/data/verticals'
import { AVAILABILITY, labelFor } from '@/lib/jobs'
import { countryName } from '@/lib/countries'
import { pluralise } from '@/lib/format'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { Card, EmptyState } from '@/components/ui/Layout'
import { Badge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { JobsNotLive } from '@/components/jobs/JobsNotLive'

export const metadata = { title: 'Find candidates' }

/** Short public reference for a candidate, used when asking HagerLand for an introduction. */
function candidateRef(id: string): string {
  return `C-${id.replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

/**
 * Employers search candidates who chose to be visible (spec 24.9, Vision §10). No contact details or CVs
 * are shown: HagerLand makes introductions through a staffing request.
 */
export default async function CandidatesPage(props: { searchParams: Promise<{ q?: string }> }) {
  const searchParams = await props.searchParams
  await requireUser('/account/jobs/candidates')
  if ((await getVertical('jobs'))?.status !== 'live') return <JobsNotLive />
  const active = await getActiveMembership()
  if (!active || active.org.status !== 'published')
    return <EmptyState icon={<Users />} title="For approved employers" description="Once your business profile is approved, you can search candidates who chose to be visible to employers." />
  // Decision 2 (also enforced by the database view): a verified business, or one with a job HagerLand approved and has not removed.
  const memberships = (await getMemberships()).filter((m) => m.org.status === 'published')
  const { data: jobs } = await getServerSupabase().from('job_posts').select('employer_org_id, published_at, status').in('employer_org_id', memberships.map((m) => m.org.id)).not('published_at', 'is', null)
  if (!memberships.some((m) => canSeeCandidates(m.org, (jobs ?? []).filter((j) => j.employer_org_id === m.org.id)))) {
    const t = translator(await getLocale())
    return <EmptyState icon={<Users />} title="For approved employers" description={t('Candidate profiles are open to verified businesses and businesses that have had a job approved by HagerLand. Post a job or ask us to verify your business.')} />
  }
  const q = searchParams.q?.trim().toLowerCase().slice(0, 80) ?? ''
  const { data } = await getServerSupabase().from('candidates_for_employers').select('*').order('updated_at', { ascending: false }).limit(300)
  const rows = (data ?? []).filter((c) => !q || [c.headline, c.qualifications, c.experience, ...(c.skills ?? [])].some((t) => t?.toLowerCase().includes(q)))
  return (
    <div>
      <AccountPageHeader title="Find candidates" description="People who chose to let employers find them. Ask HagerLand to introduce you: we pass on your details with their agreement." />
      <form method="get" className="mb-5 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="cand-q" className="sr-only">
          Skill, trade or qualification
        </label>
        <Input id="cand-q" name="q" type="search" defaultValue={searchParams.q} placeholder="Skill, trade or qualification" className="flex-1" />
        <Button type="submit" variant="secondary">
          <Search /> Search
        </Button>
      </form>
      <p className="mb-3 text-muted" role="status">
        {pluralise(rows.length, 'candidate')}
      </p>
      {rows.length === 0 ? (
        <EmptyState icon={<Users />} title="No candidates found" description={q ? 'Try another skill or trade.' : 'No candidates have made their profile visible yet.'} />
      ) : (
        <ul className="space-y-3">
          {rows.map((c) => (
            <li key={c.candidate_id}>
              <Card className="space-y-2 p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {c.first_name} <span className="font-normal text-muted">· {candidateRef(c.candidate_id ?? '')}</span>
                    </p>
                    {c.headline && <p className="text-muted">{c.headline}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={c.availability === 'immediately' ? 'green' : 'neutral'}>{labelFor(AVAILABILITY, c.availability)}</Badge>
                    {c.placement_wanted && <Badge tone="gold">Wants placement help</Badge>}
                  </div>
                </div>
                <p className="text-small text-muted">
                  {c.location_display ?? countryName(c.country_code)}
                  {c.experience_years !== null ? ` · ${pluralise(c.experience_years ?? 0, 'year')} of experience` : ''}
                </p>
                {c.skills && c.skills.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5">
                    {c.skills.map((s) => (
                      <li key={s} className="rounded-full bg-stone-100 px-2.5 py-0.5 text-caption">
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
                {c.qualifications && <p className="whitespace-pre-line text-small">{c.qualifications}</p>}
              </Card>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6 rounded-lg border border-gold/30 bg-gold-soft/40 p-5">
        <p className="font-semibold">Want to meet a candidate?</p>
        <p className="mt-1 text-small text-muted">Submit a staffing requirement and include the candidate reference (for example C-1A2B3C4D). We will ask them and introduce you.</p>
        <ButtonLink href="/request-service/staffing" className="mt-3">
          Submit a staffing requirement
        </ButtonLink>
      </div>
    </div>
  )
}
