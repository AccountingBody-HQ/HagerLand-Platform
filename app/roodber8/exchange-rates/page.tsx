import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/format'
import { AdminHeader, Panel } from '@/components/admin/AdminUi'
import { RatesForm } from '@/components/admin/RatesForm'

export const metadata = { title: 'Exchange rates' }

const NAMES: Record<string, string> = {
  GBP: 'British pound', USD: 'US dollar', EUR: 'Euro', CAD: 'Canadian dollar', AED: 'UAE dirham', SEK: 'Swedish krona',
  NOK: 'Norwegian krone', SAR: 'Saudi riyal', ILS: 'Israeli shekel', ZAR: 'South African rand', KES: 'Kenyan shilling',
}

/** Rates for approximate prices shown to visitors abroad (spec 25.2f). ETB stays the price of record. */
export default async function RatesPage() {
  await requireAdminPage()
  const { data } = await getAdminSupabase().from('exchange_rates').select('currency, etb_per_unit, updated_at')
  const byCode = new Map((data ?? []).map((r) => [r.currency, r]))
  const rows = Object.entries(NAMES).map(([currency, name]) => {
    const r = byCode.get(currency)
    return { currency, name, value: r ? String(Number(r.etb_per_unit)) : '', updated: r ? formatDate(r.updated_at) : '—' }
  })
  return (
    <div className="max-w-3xl space-y-5">
      <AdminHeader
        title="Exchange rates"
        description="Visitors can choose to see approximate prices in their own currency. Prices stay in ETB; the converted amount is always labelled “approx.” with the date you last updated the rate. Leave a box empty to stop offering that currency. When no rates are set, the option is hidden."
      />
      <Panel title="1 unit of each currency = how many birr">
        <RatesForm rows={rows} />
      </Panel>
    </div>
  )
}
