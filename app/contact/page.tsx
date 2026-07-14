import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata = { title: 'Contact us' }

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />
      <section className="max-w-lg mx-auto px-4 sm:px-6 py-16 flex-1 text-center">
        <h1 className="text-3xl font-bold text-ink mb-4">Contact us</h1>
        <p className="text-muted leading-relaxed mb-8">
          Have a question, want to report a listing, or need help? Reach out to our team.
        </p>
        <a href="mailto:team@hagerland.com" className="inline-block bg-green hover:bg-green-dark text-white font-semibold rounded-full px-6 py-2.5 transition-colors">
          Email us
        </a>
        <p className="text-xs text-muted mt-6">team@hagerland.com</p>
      </section>
      <SiteFooter />
    </main>
  )
}