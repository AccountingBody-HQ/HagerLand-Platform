import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/format'
import { AdminHeader, DataTable } from '@/components/admin/AdminUi'
import { ButtonLink } from '@/components/ui/Button'

export const metadata = { title: 'Newsletter' }

/** Newsletter sign-ups with their consent records (spec 26.10). */
export default async function NewsletterPage() {
  await requireAdminPage()
  const db = getAdminSupabase()
  // The table shows the latest 1,000 sign-ups; the subscribed total is counted in the database (Fix F-1), not from the table.
  const [{ data }, { count, error }] = await Promise.all([
    db.from('newsletter_subscriptions').select('id, email, name, status, consent_at, source, unsubscribed_at').order('created_at', { ascending: false }).limit(1000),
    db.from('newsletter_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'subscribed'),
  ])
  if (error) throw new Error(`Could not read from the database: ${error.message}`)
  const active = count ?? 0
  return (
    <div className="space-y-5">
      <AdminHeader title="Newsletter" description={`${active} subscribed. Each sign-up stores the consent wording and time; unsubscribing is one click from every email.`} actions={<ButtonLink href="/roodber8/export/newsletter" variant="secondary" size="sm">CSV (subscribed)</ButtonLink>} />
      <DataTable
        label="Newsletter sign-ups"
        rows={data ?? []}
        rowKey={(r) => r.id}
        empty="No sign-ups yet."
        columns={[
          { key: 'email', label: 'Email', render: (r) => r.email },
          { key: 'name', label: 'Name', render: (r) => r.name ?? '' },
          { key: 'status', label: 'Status', render: (r) => (r.status === 'subscribed' ? 'Subscribed' : `Unsubscribed ${r.unsubscribed_at ? formatDate(r.unsubscribed_at) : ''}`) },
          { key: 'consent', label: 'Consent given', render: (r) => formatDate(r.consent_at) },
          { key: 'source', label: 'Where', render: (r) => r.source ?? '' },
        ]}
      />
    </div>
  )
}
