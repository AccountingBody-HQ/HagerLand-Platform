import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { auditFor, notesFor } from '@/lib/admin/options'
import { INTENT_LABELS } from '@/lib/enquiries'
import { formatDate, formatPhone } from '@/lib/format'
import { AdminHeader, KeyValue, Panel, StatusBadge } from '@/components/admin/AdminUi'
import { ENQUIRY_TARGET_LABELS } from '@/components/admin/EnquiryList'
import { LeadStatusTool } from '@/components/admin/LeadTools'
import { NotesTool } from '@/components/admin/RecordTools'
import { AuditTrail } from '@/components/admin/AuditTrail'
import { must } from '@/lib/admin/must'

export const metadata = { title: 'Enquiry' }

const ADMIN_PATH: Record<string, string> = {
  property: '/roodber8/properties',
  development: '/roodber8/developments',
  hagerland_development: '/roodber8/developments',
  organisation: '/roodber8/organisations',
  product: '/roodber8/products',
}

export default async function AdminEnquiryPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  await requireAdminPage()
  const db = getAdminSupabase()
  const { data: e } = must(await db.from('enquiries').select('*, org:organisations!enquiries_recipient_org_id_fkey(id, name)').eq('id', params.id).maybeSingle())
  if (!e) notFound()
  const [notes, trail] = await Promise.all([notesFor('enquiry', e.id), auditFor(e.id)])
  const details = (e.details as Record<string, string | number | boolean> | null) ?? {}
  const utm = (e.utm as Record<string, string> | null) ?? {}
  const org = e.org as { id: string; name: string } | null
  const base = ADMIN_PATH[e.target_type]
  return (
    <div className="space-y-5">
      <AdminHeader
        title={e.reference}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={e.status} /> received {formatDate(e.created_at)}
          </span>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-5">
          <Panel title="Message">
            <p className="whitespace-pre-line text-body">{e.message}</p>
            {Object.keys(details).length > 0 && (
              <div className="mt-4">
                <KeyValue items={Object.entries(details).map(([k, v]) => [k.replace(/_/g, ' '), String(v)])} />
              </div>
            )}
          </Panel>
          <Panel title="Sender">
            <KeyValue
              items={[
                ['Name', e.name],
                ['Phone', <a key="p" href={`tel:${e.phone}`} className="text-green underline">{formatPhone(e.phone)}</a>],
                ['Email', e.email ? <a key="e" href={`mailto:${e.email}`} className="text-green underline">{e.email}</a> : null],
                ['Prefers', e.preferred_contact],
                ['Signed in', e.sender_user_id ? <Link key="u" href={`/roodber8/users/${e.sender_user_id}`} className="text-green underline">View user</Link> : 'No'],
              ]}
            />
          </Panel>
          <Panel title="About">
            <KeyValue
              items={[
                ['Type', ENQUIRY_TARGET_LABELS[e.target_type] ?? e.target_type],
                ['Intent', INTENT_LABELS[e.intent] ?? e.intent],
                ['Record', base && e.target_id ? <Link key="t" href={`${base}/${e.target_id}`} className="text-green underline">Open in admin</Link> : null],
                ['Sent to', org ? <Link key="o" href={`/roodber8/organisations/${org.id}`} className="text-green underline">{org.name}</Link> : e.recipient_user_id ? <Link key="r" href={`/roodber8/users/${e.recipient_user_id}`} className="text-green underline">Private owner</Link> : 'HagerLand'],
                ['First opened', e.first_viewed_at ? formatDate(e.first_viewed_at) : 'Not yet opened'],
                ['Page', e.source_url],
                ['Campaign', Object.keys(utm).length ? Object.entries(utm).map(([k, v]) => `${k}=${v}`).join(', ') : null],
              ]}
            />
          </Panel>
          {e.recipient_notes && (
            <Panel title="Recipient's private notes">
              <p className="whitespace-pre-line text-small">{e.recipient_notes}</p>
            </Panel>
          )}
        </div>
        <aside className="space-y-5">
          <Panel title="Status">
            <LeadStatusTool kind="enquiry" id={e.id} status={e.status} />
          </Panel>
          <Panel title="Internal notes">
            <NotesTool entity="enquiry" id={e.id} notes={notes} />
          </Panel>
          <Panel title="Audit trail">
            <AuditTrail entries={trail} />
          </Panel>
        </aside>
      </div>
    </div>
  )
}
