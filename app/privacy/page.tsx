import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata = { title: 'Privacy policy' }

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />
      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-16 flex-1">
        <h1 className="text-3xl font-bold text-ink mb-6">Privacy policy</h1>
        <p className="text-muted leading-relaxed mb-4">HagerLand collects only the information you provide when submitting a listing. This includes your name, email address, and business details.</p>
        <p className="text-muted leading-relaxed mb-4">Business directory listings are public. All other submitted information is used only to review and manage your listing.</p>
        <p className="text-muted leading-relaxed mb-4">We do not sell your data or share it with third parties except where required by law.</p>
        <p className="text-muted leading-relaxed">To request removal of your data, email team@hagerland.com.</p>
      </section>
      <SiteFooter />
    </main>
  )
}