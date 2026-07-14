import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata = { title: 'About HagerLand' }

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />
      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-16 flex-1">
        <h1 className="text-3xl font-bold text-ink mb-6">About HagerLand</h1>
        <p className="text-muted leading-relaxed mb-4">
          HagerLand is the trusted digital home of the Ethiopian diaspora — a free, verified directory of Ethiopian-owned businesses, jobs, housing, events, and community organisations worldwide.
        </p>
        <p className="text-muted leading-relaxed mb-4">
          The name comes from ሃገር (hager) — the Amharic word for homeland. HagerLand is built to connect the Ethiopian community wherever in the world they are.
        </p>
        <p className="text-muted leading-relaxed">
          HagerLand is free for everyone. List your business, post a job, find housing, or connect with community organisations — all in one place.
        </p>
      </section>
      <SiteFooter />
    </main>
  )
}