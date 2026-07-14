import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata = { title: 'Terms of use' }

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />
      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-16 flex-1">
        <h1 className="text-3xl font-bold text-ink mb-6">Terms of use</h1>
        <p className="text-muted leading-relaxed mb-4">By using HagerLand you agree to submit only accurate, lawful information. Listings that are misleading, offensive, or unrelated to the Ethiopian community will be removed.</p>
        <p className="text-muted leading-relaxed mb-4">HagerLand is a free community platform. We reserve the right to remove any listing at our discretion.</p>
        <p className="text-muted leading-relaxed">These terms are subject to change. Continued use of the platform constitutes acceptance of any updates.</p>
      </section>
      <SiteFooter />
    </main>
  )
}