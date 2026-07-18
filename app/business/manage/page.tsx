'use client'
import { useState, useEffect } from 'react'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'

const inp = 'w-full px-4 py-3 border border-border rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green text-sm'

export default function ManageBusinessPage() {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'idle'|'saving'|'saved'|'error'|'invalid'>('idle')
  const [listingStatus, setListingStatus] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [city, setCity] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [category, setCategory] = useState('')
  const [submitterName, setSubmitterName] = useState('')

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token')
    if (!t) { setStatus('invalid'); setLoading(false); return }
    setToken(t)
    fetch('/api/business/manage?token=' + t)
      .then(r => r.json())
      .then(({ data, error }) => {
        if (error || !data) { setStatus('invalid'); setLoading(false); return }
        setCompanyName(data.company_name ?? '')
        setCity(data.trading_address_city ?? '')
        setPhone(data.phone ?? '')
        setWebsite(data.website ?? '')
        setCategory(data.sic_description ?? '')
        setSubmitterName(data.submitter_name ?? '')
        setListingStatus(data.status)
        setLoading(false)
      })
      .catch(() => { setStatus('invalid'); setLoading(false) })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setStatus('saving')
    try {
      const res = await fetch('/api/business/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          company_name: companyName,
          trading_address_city: city,
          phone,
          website,
          sic_description: category,
          submitter_name: submitterName,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Update failed')
      setStatus('saved')
    } catch {
      setStatus('error')
    }
  }

  const statusLabel = listingStatus === 'active' ? 'Live' : listingStatus === 'pending' ? 'Under review' : 'Awaiting verification'
  const statusColor = listingStatus === 'active' ? 'text-green' : 'text-gold'

  return (
    <main className='min-h-screen bg-bg flex flex-col'>
      <SiteNav />
      <section className='max-w-lg mx-auto px-4 sm:px-6 py-10 sm:py-16 w-full'>
        {loading ? (
          <div className='text-center py-12 text-muted'>Loading your listing...</div>
        ) : status === 'invalid' ? (
          <div className='text-center py-12'>
            <h1 className='text-xl font-bold text-ink mb-3'>Invalid or expired link</h1>
            <p className='text-muted text-sm mb-6'>This manage link is invalid or has expired.</p>
            <p className='text-muted text-sm'>Need help? <a href='/contact' className='text-green font-medium'>Contact us</a> and we will send you a new edit link.</p>
          </div>
        ) : status === 'saved' ? (
          <div className='text-center py-12'>
            <div className='w-16 h-16 bg-green-soft rounded-full flex items-center justify-center mx-auto mb-6'>
              <svg width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='#1C7C4C' strokeWidth='2.5'><polyline points='20 6 9 17 4 12'/></svg>
            </div>
            <h1 className='text-xl font-bold text-ink mb-3'>Changes saved</h1>
            <p className='text-muted text-sm'>Your listing has been updated and will be reviewed by our team.</p>
            <button onClick={() => setStatus('idle')} className='mt-6 text-green text-sm font-medium'>Make more changes</button>
          </div>
        ) : (
          <>
            <div className='mb-8'>
              <h1 className='text-2xl font-bold text-ink mb-2'>Edit your listing</h1>
              <p className='text-muted text-sm'>
                Status: <span className={`font-semibold ${statusColor}`}>{statusLabel}</span>
              </p>
            </div>
            {status === 'error' && (
              <div className='bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-6'>
                Something went wrong. Please try again.
              </div>
            )}
            <form onSubmit={handleSubmit} className='flex flex-col gap-4 bg-white border border-border rounded-2xl p-6 sm:p-8'>
              <label className='text-sm font-medium text-ink'>
                Business name *
                <input value={companyName} onChange={e => setCompanyName(e.target.value)} required className={inp} placeholder='e.g. Addis Kitchen' />
              </label>
              <label className='text-sm font-medium text-ink'>
                Your name
                <input value={submitterName} onChange={e => setSubmitterName(e.target.value)} className={inp} placeholder='Your full name' />
              </label>
              <label className='text-sm font-medium text-ink'>
                Category / industry
                <input value={category} onChange={e => setCategory(e.target.value)} className={inp} placeholder='e.g. Ethiopian Restaurant' />
              </label>
              <label className='text-sm font-medium text-ink'>
                City
                <input value={city} onChange={e => setCity(e.target.value)} className={inp} placeholder='e.g. London' />
              </label>
              <label className='text-sm font-medium text-ink'>
                Phone
                <input value={phone} onChange={e => setPhone(e.target.value)} className={inp} placeholder='e.g. 020 7946 0001' />
              </label>
              <label className='text-sm font-medium text-ink'>
                Website
                <input value={website} onChange={e => setWebsite(e.target.value)} className={inp} placeholder='e.g. https://example.com' />
              </label>
              <div className='pt-2'>
                <button type='submit' disabled={status === 'saving'} className='w-full bg-green hover:bg-green-dark text-white font-semibold rounded-full px-6 py-3 transition-colors disabled:opacity-60'>
                  {status === 'saving' ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </>
        )}
      </section>
      <SiteFooter />
    </main>
  )
}