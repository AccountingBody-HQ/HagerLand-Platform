export const dynamic = 'force-dynamic'

import { postBusiness } from './actions'
import { SiteNav } from '@/components/SiteNav'
import { TurnstileWidget } from '@/components/TurnstileWidget'
import { CategorySelect } from '@/components/CategorySelect'
import { SiteFooter } from '@/components/SiteFooter'

const inp = 'w-full px-4 py-3 border border-border rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green text-sm'

export default function PostBusinessPage({ searchParams }: { searchParams: { success?: string; error?: string; verified?: string } }) {
  const success = searchParams.success === 'verify'
  const error = searchParams.error

  return (
    <main className='min-h-screen bg-bg flex flex-col'>
      <SiteNav />
      <section className='max-w-lg mx-auto px-4 sm:px-6 py-10 sm:py-16 w-full'>

        {success ? (
          <div className='text-center py-12'>
            <div className='w-16 h-16 bg-green-soft rounded-full flex items-center justify-center mx-auto mb-6'>
              <svg width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='#1C7C4C' strokeWidth='2.5'><polyline points='20 6 9 17 4 12'/></svg>
            </div>
            <h1 className='text-2xl font-bold text-ink mb-3'>Check your email</h1>
            <p className='text-muted text-sm leading-relaxed'>We have sent a verification link to your email address. Please click the link to submit your listing for review.</p>
            <p className='text-muted text-xs mt-4'>The link expires in 24 hours. Check your spam folder if you do not see it.</p>
            <p className='text-muted text-xs mt-2'>Lost the edit link? <a href='/business/edit-link' className='text-green font-medium'>Request a new one here.</a></p>
          </div>
        ) : (
          <>
            <div className='mb-8 text-center'>
              <h1 className='text-2xl sm:text-3xl font-bold text-ink mb-2'>List your business</h1>
              <p className='text-muted text-sm'>Free to list. Reviewed by our team before going live.</p>
            </div>

            {error && (
              <div className='bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-6'>
                {error === 'missing' ? 'Please fill in all required fields — business name, your name, email, and about your business are required.' : error === 'invalid-email' ? 'Please enter a valid email address.' : 'Something went wrong. Please try again.'}
              </div>
            )}

            <form action={postBusiness} className='flex flex-col gap-4 bg-white border border-border rounded-2xl p-6 sm:p-8'>
              <input type='text' name='hl_extra_field' tabIndex={-1} autoComplete='off' aria-hidden='true' style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }} />
              <TurnstileWidget />

              <label className='text-sm font-medium text-ink'>
                Business name *
                <input name='company_name' required className={inp} placeholder='e.g. Addis Kitchen' />
              </label>

              <label className='text-sm font-medium text-ink'>
                Your name *
                <input name='submitter_name' required className={inp} placeholder='Your full name' />
              </label>

              <label className='text-sm font-medium text-ink'>
                Contact email *
                <input name='contact_email' type='email' required className={inp} placeholder='you@example.com' />
              </label>

              <CategorySelect />

              <label className='text-sm font-medium text-ink'>
                About your business <span className='text-red-500'>*</span>
                <textarea name='description' required rows={4} className={inp + ' resize-none'} placeholder='Tell us about your business — what you offer, who you serve, what makes you special...' />
              </label>

              <div className='grid sm:grid-cols-2 gap-4'>
                <label className='text-sm font-medium text-ink'>
                  City *
                  <input name='trading_address_city' required className={inp} placeholder='e.g. London' />
                </label>
                <label className='text-sm font-medium text-ink'>
                  Country
                  <input name='country' className={inp} placeholder='e.g. United Kingdom' />
                </label>
              </div>

              <label className='text-sm font-medium text-ink'>
                Full address
                <input name='address' className={inp} placeholder='e.g. 123 High Street, London, E1 6RF' />
              </label>

              <label className='text-sm font-medium text-ink'>
                Phone
                <input name='phone' className={inp} placeholder='e.g. 020 7946 0001' />
              </label>

              <label className='text-sm font-medium text-ink'>
                Website
                <input name='website' className={inp} placeholder='e.g. https://example.com' />
              </label>

              <label className='text-sm font-medium text-ink'>
                Opening hours
                <span className='block text-xs font-normal text-muted mt-0.5 mb-1'>e.g. Mon-Fri 9am-6pm, Sat 10am-4pm</span>
                <input name='opening_hours' className={inp} placeholder='e.g. Mon-Fri 9am-6pm' />
              </label>

              <div>
                <p className='text-sm font-medium text-ink mb-2'>Social media</p>
                <div className='flex flex-col gap-3'>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs font-semibold text-muted w-24 shrink-0'>Instagram</span>
                    <input name='instagram' className={inp} placeholder='e.g. @addiskitchen' />
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs font-semibold text-muted w-24 shrink-0'>Facebook</span>
                    <input name='facebook' className={inp} placeholder='e.g. facebook.com/addiskitchen' />
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs font-semibold text-muted w-24 shrink-0'>WhatsApp</span>
                    <input name='whatsapp' className={inp} placeholder='e.g. +44 7700 900000' />
                  </div>
                </div>
              </div>

              <div className='pt-2'>
                <button type='submit' className='w-full bg-green hover:bg-green-dark text-white font-semibold rounded-full px-6 py-3 transition-colors'>
                  Submit listing
                </button>
                <p className='text-center text-xs text-muted mt-3'>We will email you a verification link. Your listing goes live after review.</p>
              </div>
            </form>
          </>
        )}
      </section>
      <SiteFooter />
    </main>
  )
}