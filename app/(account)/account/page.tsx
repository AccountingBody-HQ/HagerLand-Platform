import Link from 'next/link'
import { ArrowRight, BadgeCheck, CircleAlert, Clock, ImagePlus, MailWarning, Phone, Plus } from 'lucide-react'
import { getActiveMembership, getProfile, isEmailConfirmed, requireUser } from '@/lib/auth'
import { getServerSupabase } from '@/lib/supabase/server'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { ButtonLink } from '@/components/ui/Button'
import { Card, Stat } from '@/components/ui/Layout'
import { FormAlert } from '@/components/forms/FormParts'
import { formatNumber } from '@/lib/format'

export const metadata = { title: 'My account' }

interface Task {
  href: string
  label: string
  description: string
  icon: React.ReactNode
}

export default async function AccountOverview(props: { searchParams: Promise<{ welcome?: string; error?: string }> }) {
  const searchParams = await props.searchParams
  const user = await requireUser('/account')
  const [profile, active] = await Promise.all([getProfile(), getActiveMembership()])
  const supabase = getServerSupabase()
  const weekAhead = new Date(Date.now() + 7 * 86_400_000).toISOString()

  const [{ data: listings }, { count: newEnquiries }, verification] = await Promise.all([
    // RLS returns only listings the user owns or that belong to their organisations.
    supabase.from('properties').select('status, expires_at, views_count, enquiries_count'),
    supabase.from('enquiries').select('id', { count: 'exact', head: true }).eq('status', 'new').or(`sender_user_id.is.null,sender_user_id.neq.${user.id}`),
    active
      ? supabase.from('verification_requests').select('status').eq('org_id', active.org.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const rows = listings ?? []
  const live = rows.filter((r) => r.status === 'published').length
  const inReview = rows.filter((r) => r.status === 'pending_review').length
  const views = rows.reduce((n, r) => n + (r.views_count ?? 0), 0)
  const expiring = rows.filter((r) => r.status === 'published' && r.expires_at && r.expires_at <= weekAhead).length

  const tasks: Task[] = []
  if (!isEmailConfirmed(user)) tasks.push({ href: '/account/settings', label: 'Confirm your email', description: 'Open the link we emailed you. You need it before you can publish anything.', icon: <MailWarning /> })
  if (!profile?.phone) tasks.push({ href: '/account/settings', label: 'Add your phone number', description: 'Buyers and HagerLand need a way to reach you.', icon: <Phone /> })
  if (active && !active.org.logo_path) tasks.push({ href: '/account/company', label: 'Add a logo', description: 'Profiles with a logo get more enquiries.', icon: <ImagePlus /> })
  if (active && active.org.verification_level !== 'verified' && verification.data?.status !== 'pending')
    tasks.push({ href: '/account/company/verification', label: 'Get Verified', description: 'Submit your trade licence and TIN certificate to earn the gold Verified badge.', icon: <BadgeCheck /> })
  if (expiring > 0) tasks.push({ href: '/account/listings', label: `${expiring} listing${expiring === 1 ? '' : 's'} expire this week`, description: 'Renew in one click to keep them live.', icon: <Clock /> })

  const name = profile?.full_name?.split(' ')[0]

  return (
    <div className="space-y-8">
      <AccountPageHeader
        title={name ? `Hello, ${name}` : 'Your account'}
        description={active ? `Working as ${active.org.name}` : 'Your personal HagerLand account'}
        action={
          <ButtonLink href="/account/listings/new">
            <Plus /> List a property
          </ButtonLink>
        }
      />

      {searchParams.welcome === 'business' && (
        <FormAlert tone="success">Your business has been submitted. We review every new profile and will email you when it is live.</FormAlert>
      )}
      {searchParams.error === 'forbidden' && <FormAlert>You don&apos;t have access to that page.</FormAlert>}
      {active?.org.status === 'pending_review' && <FormAlert tone="info">{active.org.name} is waiting for review. You can keep adding details in the meantime.</FormAlert>}
      {active?.org.status === 'rejected' && (
        <FormAlert>
          {active.org.name} needs changes before it can go live. <Link href="/account/company" className="font-semibold underline">Edit your profile</Link>.
        </FormAlert>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Live listings" value={formatNumber(live)} />
        <Stat label="In review" value={formatNumber(inReview)} />
        <Stat label="New enquiries" value={formatNumber(newEnquiries ?? 0)} />
        <Stat label="Listing views" value={formatNumber(views)} />
      </div>

      <section aria-labelledby="tasks-heading">
        <h2 id="tasks-heading" className="hl-h3 mb-3">
          Things to do
        </h2>
        {tasks.length === 0 ? (
          <Card className="flex items-center gap-3 p-5 text-muted">
            <CircleAlert className="size-5 text-green" aria-hidden /> You&apos;re all set. Nothing needs your attention right now.
          </Card>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li key={t.label}>
                <Link href={t.href} className="flex items-center gap-4 rounded-lg border border-border bg-white p-4 shadow-sm hover:border-green">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-green-soft text-green [&_svg]:size-5">{t.icon}</span>
                  <span className="flex-1">
                    <span className="block font-semibold text-ink">{t.label}</span>
                    <span className="block text-small text-muted">{t.description}</span>
                  </span>
                  <ArrowRight className="size-5 text-subtle" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
