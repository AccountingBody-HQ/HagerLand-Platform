import { SiteNav } from '@/components/SiteNav'
import { SiteFooter } from '@/components/SiteFooter'
export default function EditLinkEventsPage() {
  return (
    <main className='min-h-screen bg-bg flex flex-col'>
      <SiteNav />
      <section className='max-w-lg mx-auto px-4 sm:px-6 py-10 sm:py-16 w-full'>
        <div className='text-center mb-8'>
          <h1 className='text-2xl font-bold text-ink mb-2'>Get your edit link</h1>
          <p className='text-muted text-sm'>Enter your email address and we will send you links to edit your listings.</p>
        </div>
        <form action='/api/events/resend-link' method='POST' className='bg-white border border-border rounded-2xl p-6 sm:p-8 flex flex-col gap-4'>
          <label className='text-sm font-medium text-ink'>
            Email address
            <input type='email' name='email' required className='w-full px-4 py-3 border border-border rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green text-sm' placeholder='you@example.com' />
          </label>
          <button type='submit' className='w-full bg-green hover:bg-green-dark text-white font-semibold rounded-full px-6 py-3 transition-colors'>
            Send edit links
          </button>
          <p className='text-center text-xs text-muted'>We will send edit links to any active listings associated with this email.</p>
        </form>
      </section>
      <SiteFooter />
    </main>
  )
}
