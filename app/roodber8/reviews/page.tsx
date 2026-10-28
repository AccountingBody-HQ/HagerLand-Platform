import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/format'
import { AdminHeader, DataTable } from '@/components/admin/AdminUi'
import { ReviewModeration } from '@/components/admin/ReviewTools'
import { must } from '@/lib/admin/must'

export const metadata = { title: 'Reviews' }

/** Review moderation queue (spec 26.12): every review is from a won job; check it before it is published. */
export default async function ReviewsAdminPage(props: { searchParams: Promise<{ status?: string }> }) {
  await requireAdminPage()
  const sp = await props.searchParams
  const status = ['pending', 'published', 'rejected'].includes(sp.status ?? '') ? sp.status! : 'pending'
  const { data } = must(await getAdminSupabase().from('reviews').select('id, rating, body, author_name, status, created_at, provider_reply, rejection_reason, org:organisations(name), request:service_requests(id, reference)').eq('status', status).order('created_at').limit(300))
  return (
    <div className="space-y-5">
      <AdminHeader title="Reviews" description="Reviews come only from customers who chose a provider through HagerLand. Publish them unless they are abusive, off-topic or include personal details. Never edit their words." />
      <nav aria-label="Status" className="flex gap-2">
        {['pending', 'published', 'rejected'].map((s) => (
          <Link key={s} href={`/roodber8/reviews?status=${s}`} prefetch={false} aria-current={s === status ? 'page' : undefined} className={`inline-flex min-h-10 items-center rounded-full px-3 text-small font-semibold ${s === status ? 'bg-ink text-white' : 'bg-stone-100 text-ink'}`}>
            {s === 'pending' ? 'To moderate' : s === 'published' ? 'Published' : 'Rejected'}
          </Link>
        ))}
      </nav>
      <DataTable
        label="Reviews"
        rows={data ?? []}
        rowKey={(r) => r.id}
        empty="Nothing here."
        columns={[
          { key: 'org', label: 'Business', render: (r) => (Array.isArray(r.org) ? r.org[0]?.name : r.org?.name) ?? '' },
          { key: 'job', label: 'Job', render: (r) => { const q = Array.isArray(r.request) ? r.request[0] : r.request; return q ? <Link href={`/roodber8/service-requests/${q.id}`} prefetch={false} className="text-green underline">{q.reference}</Link> : '' } },
          { key: 'rating', label: 'Rating', render: (r) => `${r.rating} of 5` },
          { key: 'body', label: 'Review', render: (r) => <span className="block max-w-md whitespace-pre-line">{r.body}{r.provider_reply ? `\n— Reply: ${r.provider_reply}` : ''}{r.rejection_reason ? `\n(Rejected: ${r.rejection_reason})` : ''}</span> },
          { key: 'who', label: 'By', render: (r) => `${r.author_name} · ${formatDate(r.created_at)}` },
          { key: 'act', label: 'Action', render: (r) => (r.status === 'pending' ? <ReviewModeration id={r.id} /> : '') },
        ]}
      />
    </div>
  )
}
