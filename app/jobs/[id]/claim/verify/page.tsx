export const dynamic = 'force-dynamic'

import { supabaseAdmin } from '@/lib/supabase-admin'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import Link from 'next/link'
import { Resend } from 'resend'

export const metadata = { title: 'Verify your claim' }

export default async function VerifyClaimPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { token?: string }
}) {
  const token = searchParams.token

  if (!token) {
    return <ErrorState id={params.id} message="Invalid verification link." />
  }

  const { data: claim } = await supabaseAdmin
    .from('business_claims')
    .select('id, claimant_name, claimant_email, code_expires_at, status')
    .eq('verification_code', token)
    .eq('listing_id', params.id)
    .eq('section', 'jobs')
    .maybeSingle()

  if (!claim || claim.status !== 'pending') {
    return (
      <ErrorState
        id={params.id}
        message="This verification link is invalid or has already been used."
      />
    )
  }

  if (new Date(claim.code_expires_at) < new Date()) {
    return (
      <ErrorState
        id={params.id}
        message="This verification link has expired. Please submit a new claim."
      />
    )
  }

  await supabaseAdmin
    .from('business_claims')
    .update({ status: 'verified', completed_at: new Date().toISOString() })
    .eq('id', claim.id)

  const { data: listing } = await supabaseAdmin
    .from('jobs')
    .select('title')
    .eq('id', params.id)
    .single()

  const listingTitle = listing?.title ?? 'your listing'

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'HagerLand <info@accountingbody.com>',
      to: 'info@accountingbody.com',
      subject: `New verified claim — Jobs: ${listingTitle}`,
      html: `<p><strong>${claim.claimant_name}</strong> (${claim.claimant_email}) has verified their claim for the Jobs listing <strong>${listingTitle}</strong>.</p><p>Review and approve at <a href="https://www.hagerland.com/roodber8/claims">https://www.hagerland.com/roodber8/claims</a></p>`,
    })
  } catch (err) {
    console.error('Admin notification email failed:', err)
  }

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-green-soft flex items-center justify-center mx-auto mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1C7C4C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-ink mb-3">Claim verified</h1>
          <p className="text-muted leading-relaxed mb-6">
            Your claim for{' '}
            <span className="font-semibold text-ink">{listingTitle}</span> has been verified.
            Our team will review and approve your claim — you will receive a confirmation email within 48 hours.
          </p>
          <Link
            href={`/jobs/${params.id}`}
            className="inline-block bg-green hover:bg-green-dark text-white font-semibold rounded-full px-6 py-2.5 transition-colors"
          >
            View your listing
          </Link>
        </div>
      </div>
      <SiteFooter />
    </main>
  )
}

function ErrorState({ id, message }: { id: string; message: string }) {
  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="text-center max-w-md">
          <p className="text-2xl font-bold text-ink mb-3">Verification failed</p>
          <p className="text-muted mb-6">{message}</p>
          <Link
            href={`/jobs/${id}/claim`}
            className="inline-block bg-green hover:bg-green-dark text-white font-semibold rounded-full px-6 py-2.5 transition-colors"
          >
            Try again
          </Link>
        </div>
      </div>
      <SiteFooter />
    </main>
  )
}
