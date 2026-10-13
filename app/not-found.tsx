import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl font-bold">Page not found</h1>
        <Link href="/" className="mt-6 inline-block text-green font-semibold">Go to homepage</Link>
      </div>
    </main>
  )
}
