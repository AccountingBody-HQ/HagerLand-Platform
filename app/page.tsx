import { brand } from '@/lib/brand'

export const metadata = { robots: { index: false, follow: false } }

export default function TemporaryHomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-xl text-center">
        <h1 className="font-display text-3xl font-extrabold">{brand.name}</h1>
        <p className="mt-3 text-muted">{brand.descriptor}</p>
      </div>
    </main>
  )
}
