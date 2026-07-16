export const dynamic = 'force-dynamic'

import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { submitMoney } from './actions'

export const metadata = {
  title: 'List a money service | HagerLand',
  description: 'List your money transfer or financial service on HagerLand — free.',
}

const SERVICE_TYPES = [
  'Money transfer',
  'Currency exchange',
  'Mobile money',
  'Banking services',
  'Financial advice',
  'Insurance',
  'Investment',
  'Other',
]

export default function PostMoneyPage() {
  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0" style={{background: 'linear-gradient(135deg, #155F3A 0%, #1C7C4C 60%, #1e8a55 100%)'}} />
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <p className="inline-flex items-center gap-2.5 text-white/50 text-[11px] font-bold tracking-[0.18em] uppercase mb-6">ሃገር <span className="w-1 h-1 rounded-full bg-white/30" /> Money</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">List a money service</h1>
          <p className="text-white/65 text-lg max-w-xl">Add your money transfer or financial service to HagerLand. Free, always.</p>
        </div>
      </section>
      <section className="bg-section flex-1">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 pb-20">
          <form action={submitMoney} className="bg-white border border-border rounded-2xl p-8 space-y-5">
            <input type="text" name="website_url" className="hidden" tabIndex={-1} autoComplete="off" />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-green mb-1">Service details</p>
              <h2 className="text-xl font-bold text-ink mb-6">Tell us about your service</h2>
            </div>
            <div>
              <label className="block text-xs font-bold text-ink mb-2">Service name <span className="text-red-500">*</span></label>
              <input name="title" type="text" required placeholder="e.g. Addis Money Transfer"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-green transition-colors" />
            </div>
            <div>
              <label className="block text-xs font-bold text-ink mb-2">Service type <span className="text-red-500">*</span></label>
              <select name="service_type" required className="w-full border border-border rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:border-green transition-colors bg-white">
                <option value="">Select a type</option>
                {SERVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-ink mb-2">Description</label>
              <textarea name="description" rows={4} placeholder="Describe your service, rates, and any other relevant details..."
                className="w-full border border-border rounded-xl px-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-green transition-colors resize-none" />
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-ink mb-2">Location</label>
                <input name="location" type="text" placeholder="e.g. London"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-green transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-ink mb-2">Coverage</label>
                <input name="coverage" type="text" placeholder="e.g. UK to Ethiopia"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-green transition-colors" />
              </div>
            </div>
            <div className="border-t border-border pt-5">
              <p className="text-xs font-bold uppercase tracking-widest text-green mb-4">Contact details</p>
              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-ink mb-2">Your name</label>
                  <input name="contact_name" type="text" placeholder="e.g. Abebe Girma"
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-green transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink mb-2">Email address <span className="text-red-500">*</span></label>
                  <input name="contact_email" type="email" required placeholder="you@example.com"
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-green transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink mb-2">Phone number</label>
                  <input name="contact_phone" type="tel" placeholder="e.g. 07700 900000"
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-green transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink mb-2">Website</label>
                  <input name="website" type="url" placeholder="https://example.com"
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-green transition-colors" />
                </div>
              </div>
            </div>
            <div className="bg-green-soft border border-green/20 rounded-xl p-4 text-xs text-muted">
              Your listing will be reviewed by our team within 48 hours before going live. We will send a confirmation to your email address.
            </div>
            <button type="submit" className="w-full bg-green hover:bg-green-dark text-white font-bold rounded-full py-3.5 text-sm transition-colors">
              Submit listing — free
            </button>
          </form>
        </div>
      </section>
      <SiteFooter />
    </main>
  )
}