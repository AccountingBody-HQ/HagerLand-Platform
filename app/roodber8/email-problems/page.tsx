import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/format'
import { discardEmailAction, retryEmailAction } from '../actions/email'
import { AdminHeader, DataTable, StatusBadge } from '@/components/admin/AdminUi'
import { ActionButton } from '@/components/forms/ActionButton'

export const metadata = { title: 'Email problems' }

/** Emails that could not be delivered (spec 25.4). The daily job retries them up to five times. */
export default async function EmailProblemsPage() {
  requireAdminPage()
  const { data } = await getAdminSupabase().from('email_outbox').select('id, to_addresses, subject, status, attempts, last_error, next_attempt_at, created_at').in('status', ['failed', 'gave_up']).order('created_at', { ascending: false }).limit(200)
  return (
    <div>
      <AdminHeader title="Email problems" description="Emails that could not be sent. Nothing the visitor did was lost: the daily job retries each one up to five times. Fix the cause (for example the Resend settings) and retry, or stop retrying." />
      <DataTable
        label="Undelivered emails"
        rows={data ?? []}
        rowKey={(r) => r.id}
        empty="All emails have been delivered."
        columns={[
          { key: 'd', label: 'First tried', render: (r) => formatDate(r.created_at) },
          { key: 's', label: 'Subject', render: (r) => <span className="font-semibold">{r.subject}</span> },
          { key: 't', label: 'To', render: (r) => r.to_addresses.join(', ') },
          { key: 'e', label: 'Last error', render: (r) => <span className="line-clamp-2 max-w-xs">{r.last_error ?? ''}</span> },
          { key: 'a', label: 'Attempts', render: (r) => String(r.attempts) },
          { key: 'st', label: 'Status', render: (r) => <StatusBadge status={r.status === 'gave_up' ? 'stopped' : 'retrying'} /> },
          {
            key: 'x',
            label: '',
            render: (r) => (
              <div className="flex gap-2">
                <ActionButton size="sm" variant="secondary" action={retryEmailAction.bind(null, r.id)}>
                  Retry now
                </ActionButton>
                {r.status === 'failed' && (
                  <ActionButton size="sm" variant="ghost" action={discardEmailAction.bind(null, r.id)}>
                    Stop retrying
                  </ActionButton>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
