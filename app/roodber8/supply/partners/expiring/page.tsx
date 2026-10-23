import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'
import { formatDate, formatETBCents, formatPhone } from '@/lib/format'
import { CONTACT_CHANNELS, labelFor } from '@/lib/supply/partners'
import { expiringOffers, today } from '@/lib/supply/offers-data'
import { unitLabel } from '@/lib/units'
import { AdminHeader, DataTable } from '@/components/admin/AdminUi'
import { FreshnessBadge } from '@/components/admin/SupplierOffers'

export const metadata = { title: 'Prices expiring this week' }

/** Whom to call this week: current prices that run out within 7 days or have already run out. Nothing is sent. */
export default async function ExpiringPricesPage() {
  await requireAdminPage()
  const rows = await expiringOffers()
  const now = today()
  return (
    <div>
      <AdminHeader
        title="Prices expiring this week"
        description="Current prices that run out within 7 days, and those already expired. Call the partner for a new price. Nothing is sent automatically."
      />
      <DataTable
        label="Prices expiring this week"
        rows={rows}
        rowKey={(r) => r.id}
        empty="No prices expire this week."
        columns={[
          {
            key: 'partner',
            label: 'Partner',
            render: (r) => (
              <Link href={`/roodber8/supply/partners/${r.orgId}/offers`} prefetch={false} className="font-semibold hover:underline">
                {r.orgName}
              </Link>
            ),
          },
          { key: 'item', label: 'Item', render: (r) => `${r.item} (per ${unitLabel(r.unit)})` },
          { key: 'price', label: 'Price', render: (r) => <span className="tabular-nums">{formatETBCents(r.priceCents)}</span> },
          {
            key: 'valid',
            label: 'Valid until',
            render: (r) => (
              <div>
                <p>{formatDate(r.validUntil)}</p>
                <FreshnessBadge value={r.validUntil < now ? 'expired' : 'ageing'} />
              </div>
            ),
          },
          {
            key: 'contact',
            label: 'Who to call',
            render: (r) =>
              r.contact === 'do_not_contact' ? (
                <span className="font-semibold uppercase text-error">Do not contact</span>
              ) : r.contact ? (
                <div>
                  <p className="font-semibold">{r.contact.name}</p>
                  <p>
                    {[r.contact.channel ? labelFor(CONTACT_CHANNELS, r.contact.channel) : null, r.contact.phone ? formatPhone(r.contact.phone) : null].filter(Boolean).join(' · ')}
                  </p>
                </div>
              ) : (
                <span className="text-muted">No contact recorded</span>
              ),
          },
        ]}
      />
    </div>
  )
}
