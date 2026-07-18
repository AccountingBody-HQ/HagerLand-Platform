'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function Banner() {
  const params = useSearchParams()
  const success = params.get('success')
  const verified = params.get('verified')
  const error = params.get('error')

  if (verified === 'true') {
    return (
      <div className="bg-green-soft border border-green/20 text-green text-sm font-medium rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 mt-0.5"><polyline points="20 6 9 17 4 12"/></svg>
        <span><strong>Email verified.</strong> Your listing is now with our team for review. We will be in touch within 48 hours. Check your email for a link to edit your submission.</span>
      </div>
    )
  }

  if (verified === 'already') {
    return (
      <div className="bg-green-soft border border-green/20 text-green text-sm font-medium rounded-xl px-4 py-3 mb-6">
        Your email has already been verified. Your listing is under review.
      </div>
    )
  }

  if (success) {
    return (
      <div className="bg-green-soft border border-green/20 text-green text-sm font-medium rounded-xl px-4 py-3 mb-6">
        Your submission has been received and will be reviewed before going live.
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl px-4 py-3 mb-6">
        Your submission could not be processed. Please try again.
      </div>
    )
  }

  return null
}

export function SubmissionBanner() {
  return (
    <Suspense fallback={null}>
      <Banner />
    </Suspense>
  )
}
