'use client'
import { useState, useEffect } from 'react'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'


const CATEGORIES = [
  { group: 'Food & Hospitality', items: ['Ethiopian Restaurant','Eritrean Restaurant','Cafe & Coffee Shop','Catering & Events','Food Delivery','Bakery & Pastry'] },
  { group: 'Professional Services', items: ['Accounting & Tax','Legal Services','Financial Advice','Immigration & Visa','Mortgage & Property','Insurance','Business Consulting'] },
  { group: 'Health & Wellbeing', items: ['GP & Medical','Dentist','Pharmacy','Mental Health & Counselling','Physiotherapy','Alternative Medicine'] },
  { group: 'Beauty & Personal Care', items: ['Hair Salon & Braiding','Barbershop','Nail & Beauty Salon','Skincare & Cosmetics'] },
  { group: 'Retail & Trade', items: ['African & Ethiopian Grocery','Fashion & Clothing','Electronics & Mobile','Home & Furniture','Car Sales & Parts'] },
  { group: 'Transport & Travel', items: ['Taxi & Private Hire','Travel Agency','Driving School','Courier & Delivery'] },
  { group: 'Education & Training', items: ['Tutoring & Education','Language Classes','Skills & Vocational Training','Childcare & Nursery'] },
  { group: 'Creative & Media', items: ['Photography & Videography','Music & Entertainment','Graphic Design & Printing','Marketing & PR','Web & Tech Services'] },
  { group: 'Community & Faith', items: ['Church & Faith Organisation','Community Association','Charity & Non-profit','Events & Cultural'] },
  { group: 'Property', items: ['Estate Agent','Letting Agent','Property Management','Construction & Renovation','Cleaning Services'] },
]
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
  const [description, setDescription] = useState('')
  const [promoText, setPromoText] = useState('')
  const [promoExpiresAt, setPromoExpiresAt] = useState('')
  const [country, setCountry] = useState('')
  const [address, setAddress] = useState('')
  const [openingHours, setOpeningHours] = useState('')
  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [hasPending, setHasPending] = useState(false)

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
        setDescription(data.ai_description ?? '')
        setPromoText(data.promo_text ?? '')
        setPromoExpiresAt(data.promo_expires_at ? data.promo_expires_at.split('T')[0] : '')
        setCountry(data.country ?? '')
        setAddress(data.address ?? '')
        setOpeningHours(data.opening_hours ?? '')
        setInstagram(data.instagram ?? '')
        setFacebook(data.facebook ?? '')
        setWhatsapp(data.whatsapp ?? '')
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
          ai_description: description,
          promo_text: promoText,
          promo_expires_at: promoExpiresAt || null,
          country,
          address,
          opening_hours: openingHours,
          instagram,
          facebook,
          whatsapp,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Update failed')
      setStatus('saved')
      setHasPending(json.hasPendingChanges ?? false)
    } catch {
      setStatus('error')
    }
  }

  const statusLabel = listingStatus === 'active' ? 'Live' : listingStatus === 'pending' ? 'Under review' : 'Awaiting verification'
  const statusColor = listingStatus === 'active' ? 'text-green' : listingStatus === 'pending' ? 'text-gold' : 'text-muted'

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
            <p className='text-muted text-sm'>Need help? <a href='/business/edit-link' className='text-green font-medium'>Contact us</a> and we will send you a new edit link.</p>
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
            {hasPending && (
              <div className='bg-gold-soft border border-gold/20 text-gold text-sm px-4 py-3 rounded-lg mb-6 flex items-start gap-2'>
                <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' className='shrink-0 mt-0.5'><circle cx='12' cy='12' r='10'/><line x1='12' y1='8' x2='12' y2='12'/><line x1='12' y1='16' x2='12.01' y2='16'/></svg>
                <span>You have changes pending admin review. They will go live once approved.</span>
              </div>
            )}
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
                Category / industry <span className='text-ink'>*</span>
                <select value={category} onChange={e => setCategory(e.target.value)} required className={inp + ' cursor-pointer'}>
                  <option value=''>Select a category...</option>
                  {CATEGORIES.map(({ group, items }) => (
                    <optgroup key={group} label={group}>
                      {items.map(item => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label className='text-sm font-medium text-ink'>
                Phone <span className='text-ink'>*</span>
                <input value={phone} onChange={e => setPhone(e.target.value)} required className={inp} placeholder='e.g. 020 7946 0001' />
              </label>
              <label className='text-sm font-medium text-ink'>
                Website
                <input value={website} onChange={e => setWebsite(e.target.value)} className={inp} placeholder='e.g. https://example.com' />
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
                <input value={address} onChange={e => setAddress(e.target.value)} className={inp} placeholder='e.g. 123 High Street, London, E1 6RF' />
              </label>
              <label className='text-sm font-medium text-ink'>
                Opening hours
                <span className='block text-xs font-normal text-muted mt-0.5 mb-1'>e.g. Mon-Fri 9am-6pm, Sat 10am-4pm</span>
                <input value={openingHours} onChange={e => setOpeningHours(e.target.value)} className={inp} placeholder='e.g. Mon-Fri 9am-6pm' />
              </label>
              <div>
                <p className='text-sm font-medium text-ink mb-2'>Social media</p>
                <div className='flex flex-col gap-3'>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs font-semibold text-muted w-24 shrink-0'>Instagram</span>
                    <input value={instagram} onChange={e => setInstagram(e.target.value)} className={inp} placeholder='e.g. @addiskitchen' />
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs font-semibold text-muted w-24 shrink-0'>Facebook</span>
                    <input value={facebook} onChange={e => setFacebook(e.target.value)} className={inp} placeholder='e.g. facebook.com/addiskitchen' />
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs font-semibold text-muted w-24 shrink-0'>WhatsApp</span>
                    <input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} className={inp} placeholder='e.g. +44 7700 900000' />
                  </div>
                </div>
              </div>
              <label className='text-sm font-medium text-ink'>
                About your business
                <span className='block text-xs font-normal text-muted mt-0.5 mb-1'>Tell customers who you are, what you offer, and what makes you special.</span>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} className={inp} placeholder='e.g. We are a family-run Ethiopian restaurant in London, serving authentic cuisine since 2010...' />
              </label>
              <label className='text-sm font-medium text-ink'>
                What&apos;s on — promotions &amp; updates
                <span className='block text-xs font-normal text-muted mt-0.5 mb-1'>Share offers, events, announcements, or any news you want customers to see.</span>
                <textarea value={promoText} onChange={e => setPromoText(e.target.value)} rows={4} className={inp} placeholder='e.g. Live music this Saturday 7pm — book your table now! Special Eid menu available all week.' />
              </label>
              {promoText && (
                <label className='text-sm font-medium text-ink'>
                  Promotion end date <span className='text-ink'>*</span>
                  <span className='block text-xs font-normal text-muted mt-0.5 mb-1'>Required — max 1 year. Expired promotions are hidden automatically.</span>
                  <input
                    type='date'
                    value={promoExpiresAt}
                    onChange={e => setPromoExpiresAt(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    max={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    required={!!promoText}
                    className={inp}
                  />
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