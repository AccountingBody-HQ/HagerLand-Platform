import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

export const metadata = { title: 'How it works' }

const steps = [
  { n: '1', title: 'Browse or search', desc: 'Search by name, category, or city. Every section has filters to help you find exactly what you need.' },
  { n: '2', title: 'Find what you need', desc: 'Every listing shows contact details, location, and key information. Click to reveal the email address.' },
  { n: '3', title: 'List your own', desc: 'Listing is completely free. Submit a business, job, housing, or event and it will be reviewed within 48 hours.' },
  { n: '4', title: 'Claim your listing', desc: 'If your business is already listed, claim it to update your details and earn a verified gold badge.' },
]

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />
      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-16 flex-1">
        <h1 className="text-3xl font-bold text-ink mb-10">How HagerLand works</h1>
        <div className="space-y-8">
          {steps.map((step) => (
            <div key={step.n} className="flex gap-5">
              <div className="w-8 h-8 rounded-full bg-green-soft flex items-center justify-center font-bold text-green text-sm shrink-0">{step.n}</div>
              <div>
                <h2 className="font-bold text-ink mb-1">{step.title}</h2>
                <p className="text-muted text-sm leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}