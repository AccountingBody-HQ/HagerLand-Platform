'use client'

import './globals.css'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh items-center justify-center bg-stone-50 px-4 font-sans text-ink">
        <main className="max-w-md text-center">
          <p className="font-display text-2xl font-extrabold">HagerLand</p>
          <h1 className="mt-6 font-display text-h2 font-bold">Something went wrong</h1>
          <p className="mt-3 text-muted">Please try again in a moment.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row [&>*]:flex-1">
            <button type="button" onClick={reset} className="h-11 rounded-md bg-green px-5 font-semibold text-white">
              Try again
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full reload is wanted after the whole app failed */}
            <a href="/" className="inline-flex h-11 items-center justify-center rounded-md border border-ink px-5 font-semibold">
              Go to the homepage
            </a>
          </div>
        </main>
      </body>
    </html>
  )
}
