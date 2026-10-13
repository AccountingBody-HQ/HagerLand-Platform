import { requireAdminPage } from '@/lib/admin/guard'
import { AdminHeader, Panel } from '@/components/admin/AdminUi'
import { PriceImport } from './PriceImport'

export const metadata = { title: 'Update prices' }

export default function PricesPage() {
  requireAdminPage()
  return (
    <div className="max-w-5xl">
      <AdminHeader title="Update prices and stock" description="Upload a CSV with sku, price (ETB per unit) and/or stock_status. Rows are checked first; only valid rows are applied." />
      <Panel>
        <PriceImport />
      </Panel>
    </div>
  )
}
