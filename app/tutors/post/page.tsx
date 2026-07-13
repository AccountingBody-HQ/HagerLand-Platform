import { postTutor } from './actions'
import { SiteNav } from '@/components/SiteNav'
import { TurnstileWidget } from '@/components/TurnstileWidget'

const inputStyle =
  'w-full px-4 py-3 border border-border rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green'

export default function PostTutorPage() {
  return (
    <main className="min-h-screen bg-bg">
      <SiteNav />
      <section className="max-w-lg mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <h1 className="text-2xl sm:text-3xl font-bold text-ink text-center mb-8">
          Offer tutoring
        </h1>

        <form action={postTutor} className="flex flex-col gap-4">
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
            Your name *
            <input name="name" required className={inputStyle} />
          </label>

          <label className="text-sm font-medium text-ink">
            Subject *
            <input name="subject" required placeholder="e.g. Amharic Language, Maths" className={inputStyle} />
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
            Delivery mode
            <input name="delivery_mode" placeholder="e.g. Online, In-person, Both" className={inputStyle} />
          </label>

          <label className="text-sm font-medium text-ink">
            Rate
            <input name="rate" placeholder="e.g. £20/hour" className={inputStyle} />
          </label>

          <label className="text-sm font-medium text-ink">
            Contact email *
            <input name="contact_email" type="email" required className={inputStyle} />
          </label>

          <button
            type="submit"
            className="bg-green hover:bg-green-dark text-white font-semibold rounded-full px-6 py-3 mt-4 transition-colors"
          >
            Post listing
          </button>
        </form>
      </section>
    </main>
  )
}
