export const dynamic = 'force-dynamic'
import { postJobs } from './actions'
import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
import { TurnstileWidget } from '@/components/TurnstileWidget'
import { JobsCategorySelect } from '@/components/JobsCategorySelect'
const inp = 'w-full px-4 py-3 border border-border rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green text-sm'
export default function PostJobsPage({ searchParams }: { searchParams: { success?: string; error?: string } }) {
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
            <h1 className='text-xl font-bold text-ink mb-3'>Check your email</h1>
            <p className='text-muted text-sm mb-2'>We sent a verification link to your email address. Click it to submit your listing for review.</p>
            <p className='text-muted text-xs mt-2'>Link expires in 24 hours. Lost the link? <a href='/jobs/edit-link' className='text-green font-medium'>Request a new one here.</a></p>
          </div>
        ) : (
          <>
            <div className='mb-8 text-center'>
              <h1 className='text-2xl sm:text-3xl font-bold text-ink mb-2'>Post a job</h1>
              <p className='text-muted text-sm'>Free to list. Reviewed by our team before going live.</p>
            </div>
            {error && (
              <div className='bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-6'>
                {error === 'missing' ? 'Please fill in all required fields.' : error === 'invalid-email' ? 'Please enter a valid email address.' : error === 'expired' ? 'Your verification link has expired. Please submit your listing again.' : 'Something went wrong. Please try again.'}
              </div>
            )}
            <form action={postJobs} className='flex flex-col gap-4 bg-white border border-border rounded-2xl p-6 sm:p-8'>
              <input type='text' name='hl_extra_field' tabIndex={-1} autoComplete='off' aria-hidden='true' style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }} />
              <TurnstileWidget />
              <label className='text-sm font-medium text-ink'>
                Job title <span className='text-ink'>*</span>
                <input name='title' required className={inp} placeholder='e.g. Senior Accountant' />
              </label>
              <label className='text-sm font-medium text-ink'>
                Your name <span className='text-ink'>*</span>
                <input name='submitter_name' required className={inp} placeholder='Your full name' />
              </label>
              <label className='text-sm font-medium text-ink'>
                Contact email <span className='text-ink'>*</span>
                <input name='contact_email' type='email' required className={inp} placeholder='you@example.com' />
              </label>
              <JobsCategorySelect value={''} onChange={() => {}} />
              <label className='text-sm font-medium text-ink'>
                Description <span className='text-ink'>*</span>
                <textarea name='description' required rows={4} className={inp + ' resize-none'} placeholder='Tell us about this listing — what makes it special...' />
              </label>
              <div className='grid sm:grid-cols-2 gap-4'>
                <label className='text-sm font-medium text-ink'>
                  City <span className='text-ink'>*</span>
                  <input name='city' required className={inp} placeholder='e.g. London' />
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
                Phone <span className='text-ink'>*</span>
                <input name='phone' required className={inp} placeholder='e.g. 020 7946 0001' />
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
                    <input name='instagram' className={inp} placeholder='e.g. @handle' />
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs font-semibold text-muted w-24 shrink-0'>Facebook</span>
                    <input name='facebook' className={inp} placeholder='e.g. facebook.com/page' />
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
