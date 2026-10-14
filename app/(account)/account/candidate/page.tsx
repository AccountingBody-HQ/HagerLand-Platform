import { getProfile, requireUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { getVertical } from '@/lib/data/verticals'
import { getLocationById } from '@/lib/data/reference'
import { deleteCandidateProfileAction } from '@/app/actions/job-actions'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { Card } from '@/components/ui/Layout'
import { ActionButton } from '@/components/forms/ActionButton'
import { CandidateForm } from '@/components/jobs/CandidateForm'
import { JobsNotLive } from '@/components/jobs/JobsNotLive'

export const metadata = { title: 'Candidate profile' }

export default async function CandidateProfilePage() {
  const user = await requireUser('/account/candidate')
  if ((await getVertical('jobs'))?.status !== 'live') return <JobsNotLive />
  const [profile, { data: c }] = await Promise.all([getProfile(), getServerSupabase().from('candidate_profiles').select('*').eq('user_id', user.id).maybeSingle()])
  const loc = c?.location_id ? await getLocationById(c.location_id) : null
  return (
    <div className="space-y-6">
      <AccountPageHeader title="Candidate profile" description="Your skills, experience and CV in one place. It is private unless you choose to let employers find you." />
      <Card className="p-5 sm:p-8">
        <CandidateForm
          userId={user.id}
          defaults={{
            full_name: c?.full_name ?? profile?.full_name ?? '',
            headline: c?.headline ?? null,
            skills: c?.skills ?? [],
            qualifications: c?.qualifications ?? null,
            experience_years: c?.experience_years ?? null,
            experience: c?.experience ?? null,
            availability: c?.availability ?? 'within_month',
            location: loc ? { value: loc.id, label: loc.name, description: loc.display_name } : null,
            cv_path: c?.cv_path ?? null,
            visibility: c?.visibility ?? 'private',
            placement_wanted: c?.placement_wanted ?? false,
          }}
        />
      </Card>
      {c && (
        <div className="rounded-lg border border-border p-5">
          <h2 className="font-semibold">Delete your candidate profile</h2>
          <p className="mt-1 text-small text-muted">This deletes your profile and its CV. Applications you have already sent stay with those employers until they are deleted after 12 months.</p>
          <ActionButton variant="ghost" className="mt-3 text-error" confirm="Delete your candidate profile and CV?" action={deleteCandidateProfileAction}>
            Delete profile
          </ActionButton>
        </div>
      )}
    </div>
  )
}
