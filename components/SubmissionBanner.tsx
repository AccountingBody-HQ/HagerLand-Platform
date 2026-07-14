'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function Banner() {
  const params = useSearchParams()
  const success = params.get('success')
  const error = params.get('error')

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
