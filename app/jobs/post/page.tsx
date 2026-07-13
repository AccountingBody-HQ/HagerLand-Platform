import { postJob } from './actions'
import { SiteNav } from '@/components/SiteNav'
import { TurnstileWidget } from '@/components/TurnstileWidget'

const inputStyle =
  'w-full px-4 py-3 border border-border rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green'

export default function PostJobPage() {
  return (
    <main className="min-h-screen bg-bg">
      <SiteNav />
      <section className="max-w-lg mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <h1 className="text-2xl sm:text-3xl font-bold text-ink text-center mb-8">
          Post a job
        </h1>

        <form action={postJob} className="flex flex-col gap-4">
          <input
            type="text"
            name="website_confirm"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}
          />
          <TurnstileWidget />
          <label className="text-sm font-medium text-ink">
            Job title *
            <input name="title" required className={inputStyle} />
          </label>

          <label className="text-sm font-medium text-ink">
            Company / business name *
            <input name="company_name" required className={inputStyle} />
          </label>

          <label className="text-sm font-medium text-ink">
            Description
            <textarea name="description" rows={4} className={inputStyle} />
          </label>

          <label className="text-sm font-medium text-ink">
            Location
            <input name="location" className={inputStyle} />
          </label>

          <label className="text-sm font-medium text-ink">
            Job type
            <input name="job_type" placeholder="e.g. Full-time" className={inputStyle} />
          </label>

          <label className="text-sm font-medium text-ink">
            Salary range
            <input name="salary_range" placeholder="e.g. £25,000-£30,000/year" className={inputStyle} />
          </label>

          <label className="text-sm font-medium text-ink">
            Contact email *
            <input name="contact_email" type="email" required className={inputStyle} />
          </label>

          <button
            type="submit"
            className="bg-green hover:bg-green-dark text-white font-semibold rounded-full px-6 py-3 mt-4 transition-colors"
          >
            Post job
          </button>
        </form>
      </section>
    </main>
  )
}
