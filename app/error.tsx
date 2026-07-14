'use client'
import Link from 'next/link'

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="min-h-screen bg-bg flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="text-5xl font-bold text-muted mb-4">Oops</p>
        <h1 className="text-2xl font-bold text-ink mb-3">Something went wrong</h1>
        <p className="text-muted mb-8 leading-relaxed">
          An unexpected error occurred. Please try again.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-green hover:bg-green-dark text-white font-semibold rounded-full px-6 py-2.5 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="border border-ink text-ink font-semibold rounded-full px-6 py-2.5 transition-colors hover:bg-section"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  )
}
