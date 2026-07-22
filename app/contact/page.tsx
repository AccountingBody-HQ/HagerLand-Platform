'use client'

import { useState } from 'react'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { submitContactForm } from './actions'

const SUBJECTS = [
  'General enquiry',
  'Report a listing',
  'Claim my business',
  'Update my listing',
  'Partnership or advertising',
  'Other',
]

export default function ContactPage() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')
    const formData = new FormData(e.currentTarget)
    const result = await submitContactForm(formData)
    if (result.success) {
      setStatus('success')
    } else {
      setStatus('error')
      setErrorMsg(result.error || 'Something went wrong.')
    }
  }

  return (
    <main className="min-h-screen bg-bg flex flex-col">
      <SiteNav />

      {/* HERO BAND */}
      <section className="relative overflow-hidden bg-green">
        <div className="absolute inset-0" style={{background: 'linear-gradient(135deg, #155F3A 0%, #1C7C4C 60%, #1e8a55 100%)'}} />
        <div className="absolute inset-0 opacity-[0.07]" style={{backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)', backgroundSize: '28px 28px'}} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2.5 text-white/50 text-[11px] font-bold tracking-[0.18em] uppercase mb-6">
              ሃገር
              <span className="w-1 h-1 rounded-full bg-white/30" />
              Get in touch
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-6">
              Contact us
            </h1>
            <p className="text-white/65 text-lg sm:text-xl leading-relaxed">
              Questions, listing issues, or anything else — we read every message and reply within 48 hours.
            </p>
          </div>
        </div>
      </section>

      {/* CONTACT LAYOUT */}
      <section className="bg-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12 items-start">

            {/* LEFT — info */}
            <div className="lg:col-span-1 space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-green mb-5">How we can help</p>
              {[
                { title: 'Report a listing', body: 'Found something inaccurate or inappropriate? Let us know and we will review it promptly.' },
                { title: 'Update your details', body: 'Need to change your listing? Send us the details and we will update it for you.' },
                { title: 'Claim your business', body: 'Already listed but not yet claimed? We can help you through the verification process.' },
                { title: 'General questions', body: 'Anything else — we are happy to hear from you.' },
              ].map((item) => (
                <div key={item.title} className="p-5 bg-white border border-border rounded-2xl">
                  <h3 className="font-bold text-ink text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-muted leading-relaxed">{item.body}</p>
                </div>
              ))}
              <div className="p-5 bg-white border border-border rounded-2xl">
                <p className="text-xs font-bold uppercase tracking-widest text-green mb-2">Email directly</p>
                <a href="mailto:team@hagerland.com" className="text-sm font-semibold text-ink hover:text-green transition-colors">
                  team@hagerland.com
                </a>
                <p className="text-xs text-muted mt-1">We reply within 48 hours.</p>
              </div>
            </div>

            {/* RIGHT — form */}
            <div className="lg:col-span-2 bg-white border border-border rounded-2xl p-8">
              {status === 'success' ? (
                <div className="flex flex-col items-start gap-4 py-8">
                  <div className="w-12 h-12 rounded-xl bg-green flex items-center justify-center">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-ink mb-2">Message sent</h2>
                    <p className="text-muted text-sm leading-relaxed">Thank you for getting in touch. We have sent a confirmation to your email and will reply within 48 hours.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-green mb-1">Send a message</p>
                    <h2 className="text-xl font-bold text-ink mb-6">We will get back to you within 48 hours</h2>
                  </div>
                  {/* honeypot */}
                  <input type="text" name="website" className="hidden" tabIndex={-1} autoComplete="off" />

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-ink mb-2">Your name</label>
                      <input name="name" type="text" required placeholder="e.g. Abebe Girma"
                        className="w-full border border-border rounded-xl px-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-green transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-ink mb-2">Email address</label>
                      <input name="email" type="email" required placeholder="you@example.com"
                        className="w-full border border-border rounded-xl px-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-green transition-colors" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink mb-2">Subject</label>
                    <select name="subject" required
                      className="w-full border border-border rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:border-green transition-colors bg-white">
                      <option value="">Select a subject</option>
                      {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-ink mb-2">Message</label>
                    <textarea name="message" required rows={6} placeholder="Tell us how we can help..."
                      className="w-full border border-border rounded-xl px-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-green transition-colors resize-none" />
                  </div>

                  {status === 'error' && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{errorMsg}</p>
                  )}

                  <button type="submit" disabled={status === 'loading'}
                    className="bg-green hover:bg-green-dark disabled:opacity-60 text-white font-bold rounded-full px-8 py-3 transition-colors text-sm">
                    {status === 'loading' ? 'Sending...' : 'Send message'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-green-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="bg-white border border-green/20 rounded-2xl px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-ink mb-1">Want to list your business?</h3>
              <p className="text-muted text-sm">Join the directory — free for everyone, always.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full sm:w-auto">
              <a href="/business/post" className="w-44 text-center bg-green hover:bg-green-dark text-white font-bold rounded-full py-3 transition-colors text-sm leading-tight min-h-[48px] flex items-center justify-center">
                Get listed — free
              </a>
              <a href="/business" className="w-44 text-center border border-border text-ink hover:border-ink font-semibold rounded-full py-3 transition-colors text-sm">
                Browse businesses
              </a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  )
}