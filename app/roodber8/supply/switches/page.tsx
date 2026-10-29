import { redirect } from 'next/navigation'
import { isOwnerSession, requireAdminPage } from '@/lib/admin/guard'
import { AdminHeader, Panel } from '@/components/admin/AdminUi'
import { SupplySwitchControl } from '@/components/admin/PartnerAdminTools'
import { readSupplySwitches } from '@/lib/supply/partner-switches'
import { NOT_YET_USED, type SupplySwitch } from '@/lib/supply/partner-rules'

export const metadata = { title: 'Supply switches' }
export const dynamic = 'force-dynamic'

const ROWS: { which: SupplySwitch; label: string; note: string }[] = [
  {
    which: 'registration',
    label: 'Partner registration',
    note: 'The public form at /sell-through-hagerland/register and its two lines in the privacy policy. Off: the page is “not found”. Staff can add registrations either way.',
  },
  {
    which: 'homeBusinessRow',
    label: 'Homepage “Sell through HagerLand” row',
    note: 'The second row under “Start here”. It shows only while partner registration is also on (its buttons lead there).',
  },
  {
    which: 'catalogueOrdering',
    label: 'Catalogue ordering',
    note: '"Request to order" on HagerLand Supply products, stock reservations and offline payments, plus their lines in /terms and /privacy. Locked off. Waits for HagerLand Ltd (Ethiopia), a bank account and VAT registration. It also needs the payment details in Settings.',
  },
  {
    which: 'tradePricing',
    label: 'Trade price agreements',
    note: 'Prices agreed with each trade customer (a later release). Waits for the same as catalogue ordering.',
  },
]

/** S6-1 owner switches (all start off). */
export default async function SupplySwitchesPage() {
  await requireAdminPage()
  if (!(await isOwnerSession())) redirect('/roodber8?denied=1')
  const on = await readSupplySwitches()
  return (
    <div className="max-w-3xl space-y-5">
      <AdminHeader title="Supply switches" description="Only you (the owner) can change these. They all start off. Customers buy from HagerLand Supply; partners are never shown." />
      <Panel>
        <div className="space-y-4">
          {ROWS.map((r) => (
            <div key={r.which}>
              <SupplySwitchControl which={r.which} on={on[r.which]} label={r.label} locked={NOT_YET_USED.includes(r.which)} />
              <p className="mt-1 text-small text-muted">{r.note}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}
