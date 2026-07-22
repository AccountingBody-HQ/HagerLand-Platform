export const dynamic = 'force-dynamic'

import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { Breadcrumb } from '@/components/Breadcrumb'
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { submitClaim } from './actions'

export const metadata = { title: 'Claim your listing' }

const inp = 'w-full px-4 py-3 border border-border rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-green text-sm'

export default async function ClaimPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { success?: string; error?: string; from?: string }
}) {
  const { data: listing } = await supabase
    .from('community')
    .select('id, name, manage_token')
    .eq('id', params.id)
    .eq('status', 'active')
    .single()

  if (!listing) notFound()

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />
      <section className="max-w-lg mx-auto px-4 sm:px-6 py-10 sm:py-16 flex-1 w-full">
        <Breadcrumb
          crumbs={[
            { href: '/', label: 'Home' },
            { href: '/community', label: 'Community' },
            { href: `/community/${params.id}`, label: listing.name },
            { href: `/community/${params.id}/claim`, label: 'Claim listing' },
          ]}
        />
        {listing.manage_token ? (
          <div className="text-center py-12">
            <p className="text-2xl font-bold text-ink mb-4">Already claimed</p>
            <p className="text-muted">This listing has already been claimed and is being managed.</p>
          </div>
        ) : searchParams.success === 'sent' ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-green-soft flex items-center justify-center mx-auto mb-6">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1C7C4C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-ink mb-3">Verification email sent</p>
            <p className="text-muted leading-relaxed">Check your inbox and click the link to verify your claim.</p>
          </div>
        ) : (
          <>
            <h1 className="text-2xl sm:text-3xl font-bold text-ink mb-2 text-center">
              {searchParams.from === 'promotion' ? 'Claim your listing first' : 'Request access'}
            </h1>
            <p className="text-muted text-center mb-8">
              {searchParams.from === 'promotion' ? (
                <>To add promotions to <span className="font-semibold text-ink">{listing.name}</span>, you first need to verify ownership.</>
              ) : (
                <>Requesting access for <span className="font-semibold text-ink">{listing.name}</span></>
              )}
            </p>
            <div className="bg-green-soft border border-green/20 rounded-xl p-4 mb-6 text-sm text-green">
              {searchParams.from === 'promotion'
                ? 'Once your ownership is verified by our team, you will be able to add and manage promotions for your listing.'
                : 'We will send a verification link to your email. Our team reviews every claim before granting access to manage your listing.'}
            </div>
            {searchParams.error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">
                {searchParams.error === 'duplicate'
                  ? 'A claim is already pending for this listing with that email.'
                  : searchParams.error === 'claimed'
                  ? 'This listing has already been claimed.'
                  : 'Something went wrong. Please try again.'}
              </div>
            )}
            <form action={submitClaim.bind(null, params.id)} className="flex flex-col gap-4">
              <label className="text-sm font-medium text-ink">
                Your full name *
                <input name="claimant_name" required className={inp} />
              </label>
              <label className="text-sm font-medium text-ink">
                Your email address *
                <input name="claimant_email" type="email" required className={inp} />
              </label>
              <label className="text-sm font-medium text-ink">
                Your relationship to this listing *
                <input name="relationship" required placeholder="e.g. Owner, Manager, Director" className={inp} />
              </label>
              <button type="submit"
                className="bg-green hover:bg-green-dark text-white font-semibold rounded-full px-6 py-2.5 transition-colors mt-2">
                Send verification email
              </button>
            </form>
          </>
        )}
      </section>
      <SiteFooter />
    </main>
  )
}
