import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { auditFor } from '@/lib/admin/options'
import { formatDate, formatPhone } from '@/lib/format'
import { AdminHeader, DataTable, KeyValue, Panel, StatusBadge } from '@/components/admin/AdminUi'
import { UserTools } from '@/components/admin/UserTools'
import { AuditTrail } from '@/components/admin/AuditTrail'
import { Badge } from '@/components/ui/Badge'
import { FormAlert } from '@/components/forms/FormParts'

export const metadata = { title: 'User' }

export default async function AdminUserPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  await requireAdminPage()
  if (!z.uuid().safeParse(params.id).success) notFound()
  const db = getAdminSupabase()
  const { data: auth } = await db.auth.admin.getUserById(params.id)
  const user = auth.user
  if (!user) notFound()
  const [{ data: p }, { data: orgs }, { data: listings }, { count: sent }, { count: received }, { data: quotes }, trail] = await Promise.all([
    db.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    db.from('organisation_members').select('role, org:organisations(id, name, kind, status)').eq('user_id', user.id),
    db.from('properties').select('id, title, status, updated_at').eq('lister_user_id', user.id).order('updated_at', { ascending: false }).limit(50),
    db.from('enquiries').select('id', { count: 'exact', head: true }).eq('sender_user_id', user.id),
    db.from('enquiries').select('id', { count: 'exact', head: true }).eq('recipient_user_id', user.id),
    db.from('quote_requests').select('id, reference, status, created_at').eq('requester_user_id', user.id).order('created_at', { ascending: false }).limit(20),
    auditFor(user.id),
  ])
  const providers = (user.app_metadata?.providers as string[] | undefined) ?? [user.app_metadata?.provider as string].filter(Boolean)
  return (
    <div className="space-y-5">
      <AdminHeader
        title={p?.full_name || user.email || 'User'}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {user.email} {p?.is_suspended && <Badge tone="danger">suspended</Badge>} {!user.email_confirmed_at && <Badge tone="warning">email not confirmed</Badge>}
          </span>
        }
      />
      {p?.deletion_requested_at && <FormAlert tone="info">This user asked for their account to be deleted on {formatDate(p.deletion_requested_at)}. Use “Delete account” to carry it out; they get a confirmation email.</FormAlert>}
      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          <Panel title="Profile">
            <KeyValue
              items={[
                ['Name', p?.full_name],
                ['Email', user.email],
                ['Phone', p?.phone ? formatPhone(p.phone) : null],
                ['Account type', p?.account_type],
                ['Prefers', p?.preferred_contact],
                ['Marketing emails', p?.marketing_opt_in ? 'Yes' : 'No'],
                ['Sign-in methods', providers.join(', ')],
                ['Joined', formatDate(user.created_at)],
                ['Last sign-in', user.last_sign_in_at ? formatDate(user.last_sign_in_at) : 'Never'],
                ['Enquiries sent', String(sent ?? 0)],
                ['Enquiries received', String(received ?? 0)],
              ]}
            />
          </Panel>
          <Panel title="Companies">
            <DataTable
              rows={(orgs ?? []).filter((o) => o.org)}
              rowKey={(o) => (o.org as { id: string }).id}
              empty="Not a member of any company."
              columns={[
                { key: 'n', label: 'Company', render: (o) => { const org = o.org as { id: string; name: string }; return <Link href={`/roodber8/organisations/${org.id}`} className="font-semibold hover:underline">{org.name}</Link> } },
                { key: 'k', label: 'Kind', render: (o) => (o.org as { kind: string }).kind.replace('_', ' ') },
                { key: 'r', label: 'Role', render: (o) => o.role },
                { key: 's', label: 'Status', render: (o) => <StatusBadge status={(o.org as { status: string }).status} /> },
              ]}
            />
          </Panel>
          <Panel title="Property listings">
            <DataTable
              rows={listings ?? []}
              rowKey={(l) => l.id}
              empty="No listings."
              columns={[
                { key: 't', label: 'Title', render: (l) => <Link href={`/roodber8/properties/${l.id}`} className="font-semibold hover:underline">{l.title}</Link> },
                { key: 's', label: 'Status', render: (l) => <StatusBadge status={l.status} /> },
                { key: 'u', label: 'Updated', render: (l) => formatDate(l.updated_at) },
              ]}
            />
          </Panel>
          {quotes && quotes.length > 0 && (
            <Panel title="Quote requests">
              <DataTable
                rows={quotes}
                rowKey={(q) => q.id}
                columns={[
                  { key: 'r', label: 'Reference', render: (q) => <Link href={`/roodber8/quotes/${q.id}`} className="font-semibold hover:underline">{q.reference}</Link> },
                  { key: 's', label: 'Status', render: (q) => <StatusBadge status={q.status} /> },
                  { key: 'd', label: 'Sent', render: (q) => formatDate(q.created_at) },
                ]}
              />
            </Panel>
          )}
        </div>
        <aside className="space-y-5">
          <Panel title="Actions">
            <UserTools userId={user.id} suspended={p?.is_suspended ?? false} deletionRequested={Boolean(p?.deletion_requested_at)} />
          </Panel>
          <Panel title="Audit trail">
            <AuditTrail entries={trail} />
          </Panel>
        </aside>
      </div>
    </div>
  )
}
