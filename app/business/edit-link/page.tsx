'use client'
import { useState } from 'react'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

export default function EditLinkPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle'|'sending'|'sent'|'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/business/resend-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) throw new Error()
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  return (
    <main className='min-h-screen bg-bg flex flex-col'>
      <SiteNav />
      <section className='max-w-md mx-auto px-4 sm:px-6 py-10 sm:py-16 w-full'>
        {status === 'sent' ? (
          <div className='text-center py-12'>
            <div className='w-16 h-16 bg-green-soft rounded-full flex items-center justify-center mx-auto mb-6'>
              <svg width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='#1C7C4C' strokeWidth='2.5'><polyline points='20 6 9 17 4 12'/></svg>
            </div>
            <h1 className='text-xl font-bold text-ink mb-3'>Check your email</h1>
            <p className='text-muted text-sm'>If we have a listing registered to that email address, we have sent you the edit links.</p>
            <p className='text-muted text-xs mt-3'>Check your spam folder if you do not see it within a few minutes.</p>
          </div>
        ) : (
          <>
            <div className='mb-8 text-center'>
              <h1 className='text-2xl font-bold text-ink mb-2'>Recover your edit link</h1>
              <p className='text-muted text-sm'>Enter the email address you used when submitting your listing and we will send you your edit links.</p>
            </div>
            {status === 'error' && (
              <div className='bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-6'>
                Something went wrong. Please try again.
              </div>
            )}
            <form onSubmit={handleSubmit} className='bg-white border border-border rounded-2xl p-6 sm:p-8 flex flex-col gap-4'>
              <label className='text-sm font-medium text-ink'>
                Email address
                <input
                  type='email'
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className='w-full px-4 py-3 border border-border rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green text-sm'
                  placeholder='you@example.com'
                />
              </label>
              <button
                type='submit'
                disabled={status === 'sending'}
                className='w-full bg-green hover:bg-green-dark text-white font-semibold rounded-full px-6 py-3 transition-colors disabled:opacity-60'
              >
                {status === 'sending' ? 'Sending...' : 'Send my edit links'}
              </button>
            </form>
          </>
        )}
      </section>
      <SiteFooter />
    </main>
  )
}