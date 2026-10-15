import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Download } from 'lucide-react'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { auditFor } from '@/lib/admin/options'
import { signedDocumentUrl } from '@/lib/storage'
import { formatDate, formatETBCents, formatPhone } from '@/lib/format'
import { unitLabel } from '@/lib/units'
import { productPrice } from '@/lib/product-price'
import { AdminHeader, KeyValue, Panel, StatusBadge } from '@/components/admin/AdminUi'
import { IssueQuoteTool, LeadStatusTool, QuoteInternalTool } from '@/components/admin/LeadTools'
import { AuditTrail } from '@/components/admin/AuditTrail'

export const metadata = { title: 'Quote' }

export default async function AdminQuotePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  await requireAdminPage()
  const db = getAdminSupabase()
  const { data: q } = await db.from('quote_requests').select('*, location:locations(display_name)').eq('id', params.id).maybeSingle()
  if (!q) notFound()
  const [{ data: items }, trail] = await Promise.all([
    db.from('quote_request_items').select('id, quantity, unit, notes, free_text_item, product:products(id, name, sku, unit, price_type, price_etb_cents)').eq('quote_request_id', q.id).order('created_at'),
    auditFor(q.id),
  ])
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
          <Panel title={`Items (${items?.length ?? 0})`}>
            {items && items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-small">
                  <thead className="text-caption uppercase text-muted">
                    <tr>
                      <th scope="col" className="py-2 pr-3">Item</th>
                      <th scope="col" className="py-2 pr-3">Quantity</th>
                      <th scope="col" className="py-2 pr-3">Catalogue price</th>
                      <th scope="col" className="py-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {items.map((it) => {
                      const p = it.product as { id: string; name: string; sku: string | null; unit: string; price_type: string; price_etb_cents: number | null } | null
                      return (
                        <tr key={it.id}>
                          <td className="py-2 pr-3">
                            {p ? <Link href={`/roodber8/products/${p.id}`} className="font-semibold hover:underline">{p.name}</Link> : it.free_text_item}
                            {p?.sku && <span className="block font-mono text-caption text-muted">{p.sku}</span>}
                          </td>
                          <td className="py-2 pr-3 tabular-nums">
                            {Number(it.quantity)} {unitLabel(it.unit, Number(it.quantity))}
                          </td>
                          <td className="py-2 pr-3 tabular-nums">{p ? productPrice(p) : ''}</td>
                          <td className="py-2">{it.notes}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-small text-muted">No catalogue items: see the materials list.</p>
            )}
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
        </div>
        <aside className="space-y-5">
          <Panel title={q.status === 'quoted' ? 'Quote issued' : 'Issue the quote'}>
            {q.quoted_total_etb_cents !== null && <p className="mb-3 font-display text-h3 font-bold tabular-nums">{formatETBCents(q.quoted_total_etb_cents)}</p>}
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
