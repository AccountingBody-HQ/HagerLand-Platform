'use client'
import { useState, useEffect } from 'react'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
const inp = 'w-full px-4 py-3 border border-border rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green text-sm'

export default function ManageMoneyPage() {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'idle'|'saving'|'saved'|'error'|'invalid'>('idle')
  const [listingStatus, setListingStatus] = useState('')
  const [title, setTitle] = useState('')
  const [submitterName, setSubmitterName] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  const [openingHours, setOpeningHours] = useState('')
  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [promoText, setPromoText] = useState('')
  const [promoExpiresAt, setPromoExpiresAt] = useState('')
  const [hasPending, setHasPending] = useState(false)

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('token')
    if (!t) { setStatus('invalid'); setLoading(false); return }
    setToken(t)
    fetch('/api/money/manage?token=' + t)
      .then(r => r.json())
      .then(({ data, error }) => {
        if (error || !data) { setStatus('invalid'); setLoading(false); return }
        setTitle(data.title ?? '')
        setSubmitterName(data.submitter_name ?? '')
        setCategory(data.category ?? '')
        setDescription(data.ai_description ?? '')
        setCity(data.city ?? '')
        setCountry(data.country ?? '')
        setAddress(data.address ?? '')
        setPhone(data.phone ?? '')
        setWebsite(data.website ?? '')
        setOpeningHours(data.opening_hours ?? '')
        setInstagram(data.instagram ?? '')
        setFacebook(data.facebook ?? '')
        setWhatsapp(data.whatsapp ?? '')
        setPromoText(data.promo_text ?? '')
        setPromoExpiresAt(data.promo_expires_at ? data.promo_expires_at.split('T')[0] : '')
        setListingStatus(data.status)
        setHasPending(!!data.pending_changes && Object.keys(data.pending_changes).length > 0)
        setLoading(false)
      })
      .catch(() => { setStatus('invalid'); setLoading(false) })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token) return
    setStatus('saving')
    try {
      const res = await fetch('/api/money/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          title: title,
          submitter_name: submitterName,
          category,
          ai_description: description,
          city, country, address, phone, website,
          opening_hours: openingHours,
          instagram, facebook, whatsapp,
          promo_text: promoText,
          promo_expires_at: promoExpiresAt || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Update failed')
      setHasPending(json.hasPendingChanges ?? false)
      setStatus('saved')
    } catch { setStatus('error') }
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
            <p className='text-muted text-sm'>Need help? <a href='/money/edit-link' className='text-green font-medium'>Request a new edit link.</a></p>
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
              <p className='text-muted text-sm'>Status: <span className={`font-semibold ${statusColor}`}>{statusLabel}</span></p>
            </div>
            {hasPending && (
              <div className='bg-gold-soft border border-gold/20 text-gold text-sm px-4 py-3 rounded-lg mb-6 flex items-start gap-2'>
                <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='shrink-0 mt-0.5'><circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/></svg>
                <span>You have changes pending admin review. They will go live once approved.</span>
              </div>
            )}
            {status === 'error' && (
              <div className='bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-6'>Something went wrong. Please try again.</div>
            )}
            <form onSubmit={handleSubmit} className='flex flex-col gap-4 bg-white border border-border rounded-2xl p-6 sm:p-8'>
              <label className='text-sm font-medium text-ink'>
                Service name <span className='text-ink'>*</span>
                <input value={title} onChange={e => setTitle(e.target.value)} required className={inp} placeholder='' />
              </label>
              <label className='text-sm font-medium text-ink'>
                Your name
                <input value={submitterName} onChange={e => setSubmitterName(e.target.value)} className={inp} placeholder='Your full name' />
              </label>
              <label className='text-sm font-medium text-ink'>
                Category <span className='text-ink'>*</span>
                <select value={category} onChange={e => setCategory(e.target.value)} required className={inp + ' cursor-pointer'}>
                  <option value=''>Select a category...</option>
                  <option key='Money transfer' value='Money transfer'>Money transfer</option>
                  <option key='Currency exchange' value='Currency exchange'>Currency exchange</option>
                  <option key='Accounting & Tax' value='Accounting & Tax'>Accounting & Tax</option>
                  <option key='Mortgage advice' value='Mortgage advice'>Mortgage advice</option>
                  <option key='Business loans' value='Business loans'>Business loans</option>
                  <option key='Personal loans' value='Personal loans'>Personal loans</option>
                  <option key='Insurance' value='Insurance'>Insurance</option>
                  <option key='Investment advice' value='Investment advice'>Investment advice</option>
                  <option key='Pension advice' value='Pension advice'>Pension advice</option>
                  <option key='Credit repair' value='Credit repair'>Credit repair</option>
                </select>
              </label>
              <label className='text-sm font-medium text-ink'>
                Description <span className='text-ink'>*</span>
                <span className='block text-xs font-normal text-muted mt-0.5 mb-1'>Tell customers what makes this listing special.</span>
                <textarea value={description} onChange={e => setDescription(e.target.value)} required rows={4} className={inp} placeholder='' />
              </label>
              <div className='grid sm:grid-cols-2 gap-3'>
                <label className='text-sm font-medium text-ink'>
                  City
                  <input value={city} onChange={e => setCity(e.target.value)} className={inp} placeholder='e.g. London' />
                </label>
                <label className='text-sm font-medium text-ink'>
                  Country
                  <input value={country} onChange={e => setCountry(e.target.value)} className={inp} placeholder='e.g. United Kingdom' />
                </label>
              </div>
              <label className='text-sm font-medium text-ink'>
                Full address
                <input value={address} onChange={e => setAddress(e.target.value)} className={inp} placeholder='e.g. 123 High Street' />
              </label>
              <label className='text-sm font-medium text-ink'>
                Phone <span className='text-ink'>*</span>
                <input value={phone} onChange={e => setPhone(e.target.value)} required className={inp} placeholder='e.g. 020 7946 0001' />
              </label>
              <label className='text-sm font-medium text-ink'>
                Website
                <input value={website} onChange={e => setWebsite(e.target.value)} className={inp} placeholder='e.g. https://example.com' />
              </label>
              <label className='text-sm font-medium text-ink'>
                Opening hours
                <span className='block text-xs font-normal text-muted mt-0.5 mb-1'>e.g. Mon-Fri 9am-6pm</span>
                <input value={openingHours} onChange={e => setOpeningHours(e.target.value)} className={inp} placeholder='e.g. Mon-Fri 9am-6pm' />
              </label>
              <div>
                <p className='text-sm font-medium text-ink mb-2'>Social media</p>
                <div className='flex flex-col gap-3'>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs font-semibold text-muted w-24 shrink-0'>Instagram</span>
                    <input value={instagram} onChange={e => setInstagram(e.target.value)} className={inp} placeholder='e.g. @handle' />
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs font-semibold text-muted w-24 shrink-0'>Facebook</span>
                    <input value={facebook} onChange={e => setFacebook(e.target.value)} className={inp} placeholder='e.g. facebook.com/page' />
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs font-semibold text-muted w-24 shrink-0'>WhatsApp</span>
                    <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className={inp} placeholder='e.g. +44 7700 900000' />
                  </div>
                </div>
              </div>
              <label className='text-sm font-medium text-ink'>
                What&apos;s on — promotions &amp; updates
                <span className='block text-xs font-normal text-muted mt-0.5 mb-1'>Share offers, events, or announcements.</span>
                <textarea value={promoText} onChange={e => setPromoText(e.target.value)} rows={4} className={inp} placeholder='e.g. Special offer this week...' />
              </label>
              {promoText && (
                <label className='text-sm font-medium text-ink'>
                  Promotion end date <span className='text-ink'>*</span>
                  <span className='block text-xs font-normal text-muted mt-0.5 mb-1'>Required — max 1 year. Expired promotions are hidden automatically.</span>
                  <input type='date' value={promoExpiresAt} onChange={e => setPromoExpiresAt(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    max={new Date(Date.now() + 365*24*60*60*1000).toISOString().split('T')[0]}
                    required={!!promoText} className={inp} />
                </label>
              )}
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
