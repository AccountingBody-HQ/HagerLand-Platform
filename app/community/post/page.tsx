import { postCommunity } from './actions'
import { SiteNav } from '@/components/SiteNav'

const inputStyle =
  'w-full px-4 py-3 border border-border rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-green/20 focus:border-green'

export default function PostCommunityPage() {
  return (
    <main className="min-h-screen bg-bg">
      <SiteNav />
      <section className="max-w-lg mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <h1 className="text-2xl sm:text-3xl font-bold text-ink text-center mb-8">
          List a community organisation
        </h1>

        <form action={postCommunity} className="flex flex-col gap-4">
          <label className="text-sm font-medium text-ink">
            Organisation name *
            <input name="name" required className={inputStyle} />
          </label>

          <label className="text-sm font-medium text-ink">
            Category
            <input name="category" placeholder="e.g. Church/Religious, Support Network" className={inputStyle} />
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
            Contact name
            <input name="contact_name" className={inputStyle} />
          </label>

          <label className="text-sm font-medium text-ink">
            Contact email *
            <input name="contact_email" type="email" required className={inputStyle} />
          </label>

          <button
            type="submit"
            className="bg-green hover:bg-green-dark text-white font-semibold rounded-full px-6 py-3 mt-4 transition-colors"
          >
            List organisation
          </button>
        </form>
      </section>
    </main>
  )
}
