import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Download } from 'lucide-react'
import { isOwnerSession, requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { auditFor } from '@/lib/admin/options'
import { signedDocumentUrl } from '@/lib/storage'
import { formatDate, formatETBCents, formatPhone } from '@/lib/format'
import { quoteValidUntil } from '@/lib/listing-rules'
import { getAdminSession } from '@/lib/admin-auth'
import { roleCanAccess } from '@/lib/admin/roles'
import { CLOSED_QUOTE_STATUSES, quoteSupplyData } from '@/lib/supply/quote-supply-data'
import { QuoteItemsPanel, QuoteSuppliersPanel } from '@/components/admin/QuoteSupply'
import { CreateOrders } from '@/components/admin/SupplyOrders'
import { listOrders, orderableGroups } from '@/lib/supply/orders-data'
import { AdminHeader, KeyValue, Panel, StatusBadge } from '@/components/admin/AdminUi'
import { IssueQuoteTool, LeadStatusTool, QuoteInternalTool } from '@/components/admin/LeadTools'
import { AuditTrail } from '@/components/admin/AuditTrail'

export const metadata = { title: 'Quote' }

const SUPPLY_AREA = '/roodber8/supply/partners'

export default async function AdminQuotePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  await requireAdminPage()
  const db = getAdminSupabase()
  const { data: q } = await db.from('quote_requests').select('*, location:locations(display_name)').eq('id', params.id).maybeSingle()
  if (!q) notFound()
  const session = await getAdminSession()
  // Suppliers and HagerLand-added items are for owner and operations (the supply area); margins for the owner only.
  const canSupply = session?.kind === 'master' || (session?.kind === 'staff' && roleCanAccess(session.role, SUPPLY_AREA))
  const [supply, trail, isOwner] = await Promise.all([quoteSupplyData(q), auditFor(q.id), isOwnerSession()])
  const items = canSupply ? supply.items : supply.items.filter((i) => !i.addedByAdmin)
  const [orders, groups] = await Promise.all([canSupply ? listOrders({ quoteId: q.id }) : Promise.resolve([]), isOwner ? orderableGroups(q.id) : Promise.resolve([])])
  const readOnly = CLOSED_QUOTE_STATUSES.includes(q.status)
  const files = await Promise.all(
    (q.materials_file_paths.length ? q.materials_file_paths : q.materials_file_path ? [q.materials_file_path] : []).map(async (p, i) => ({ name: `Materials list ${i + 1}.${p.split('.').pop()}`, url: await signedDocumentUrl(p) })),
  )
  const quoteDoc = q.quote_document_path ? await signedDocumentUrl(q.quote_document_path) : null
  return (
    <div className="space-y-5">
      <AdminHeader
        title={q.reference}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={q.status} /> received {formatDate(q.created_at)}
            {q.quoted_at && ` · quoted ${formatDate(q.quoted_at)}`}
          </span>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-5">
          <Panel title="Customer">
            <KeyValue
              items={[
                ['Name', q.name],
                ['Company', q.company_name],
                ['Phone', <a key="p" href={`tel:${q.phone}`} className="text-green underline">{formatPhone(q.phone)}</a>],
                ['Email', q.email ? <a key="e" href={`mailto:${q.email}`} className="text-green underline">{q.email}</a> : null],
                ['Account', q.requester_user_id ? <Link key="u" href={`/roodber8/users/${q.requester_user_id}`} className="text-green underline">View user</Link> : 'Guest'],
                ['Deliver to', [q.delivery_address, (q.location as { display_name: string } | null)?.display_name].filter(Boolean).join(', ')],
                ['Needed by', q.needed_by ? formatDate(q.needed_by) : null],
                ['Source', q.source === 'materials_list' ? 'Materials list' : q.source === 'product_page' ? 'Product page' : 'Quote list'],
              ]}
            />
            {q.notes && <p className="mt-4 whitespace-pre-line rounded-md bg-stone-50 p-3 text-small">{q.notes}</p>}
          </Panel>
          <Panel title={`Items (${items.length})`}>
            <QuoteItemsPanel quoteId={q.id} items={items} removedCount={canSupply ? supply.removedCount : 0} categories={supply.categories} readOnly={readOnly} canEdit={canSupply} />
          </Panel>
          {files.length > 0 && (
            <Panel title="Uploaded materials lists">
              <ul className="space-y-2">
                {files.map((f) => (
                  <li key={f.name}>
                    {f.url ? (
                      <a href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 font-semibold text-green underline">
                        <Download className="size-4" aria-hidden /> {f.name}
                      </a>
                    ) : (
                      <span className="text-muted">{f.name} (temporarily unavailable)</span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-caption text-muted">Links work for 10 minutes. Reload the page for fresh links.</p>
            </Panel>
          )}
          {canSupply && (
            <Panel title="Suppliers">
              <QuoteSuppliersPanel quoteId={q.id} items={items} shortlists={supply.shortlists} lines={supply.lines} partners={supply.partners} offerPrices={supply.offerPrices} place={supply.place} readOnly={readOnly} isOwner={isOwner} />
            </Panel>
          )}
          {canSupply && (orders.length > 0 || (isOwner && groups.length > 0 && !readOnly)) && (
            <Panel title={`Orders (${orders.length})`}>
              <div className="space-y-3">
                {orders.length > 0 && (
                  <ul className="space-y-1 text-small">
                    {orders.map((o) => (
                      <li key={o.id} className="flex flex-wrap items-center gap-2">
                        <Link href={`/roodber8/supply/orders/${o.id}`} prefetch={false} className="font-mono font-semibold text-green underline">
                          {o.reference}
                        </Link>
                        <StatusBadge status={o.status} />
                        <span className="text-muted">
                          {o.supplier} · model {o.model}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {isOwner && !readOnly && <CreateOrders key={groups.map((g) => g.orgId).join()} quoteId={q.id} groups={groups} />}
              </div>
            </Panel>
          )}
        </div>
        <aside className="space-y-5">
          <Panel title={q.status === 'quoted' ? 'Quote issued' : 'Issue the quote'}>
            {q.quoted_total_etb_cents !== null && <p className="mb-3 font-display text-h3 font-bold tabular-nums">{formatETBCents(q.quoted_total_etb_cents)}</p>}
            {q.status === 'quoted' && q.quoted_at && <p className="mb-3 text-small text-muted">Valid until {formatDate(quoteValidUntil(q.quoted_at))}</p>}
            {quoteDoc && (
              <a href={quoteDoc} target="_blank" rel="noopener noreferrer" className="mb-3 inline-flex min-h-11 items-center gap-2 font-semibold text-green underline">
                <Download className="size-4" aria-hidden /> Current quote PDF
              </a>
            )}
            <IssueQuoteTool id={q.id} hasEmail={Boolean(q.email)} hasDocument={Boolean(q.quote_document_path)} currentTotalEtb={q.quoted_total_etb_cents !== null ? (q.quoted_total_etb_cents / 100).toFixed(2) : ''} />
          </Panel>
          <Panel title="Status">
            <LeadStatusTool kind="quote" id={q.id} status={q.status} />
          </Panel>
          <Panel title="Handling">
            <QuoteInternalTool id={q.id} assignedTo={q.assigned_to} notes={q.internal_notes} />
          </Panel>
          <Panel title="Audit trail">
            <AuditTrail entries={trail} />
          </Panel>
        </aside>
      </div>
    </div>
  )
}
