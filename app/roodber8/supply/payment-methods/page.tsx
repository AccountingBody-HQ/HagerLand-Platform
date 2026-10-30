import { redirect } from 'next/navigation'
import { isOwnerSession, requireAdminPage } from '@/lib/admin/guard'
import { AdminHeader, Panel } from '@/components/admin/AdminUi'
import { PaymentMethodsTools } from '@/components/admin/PaymentMethodsTools'
import { listPaymentMethods } from '@/lib/supply/payment-methods-data'
import { PAYMENT_METHODS_TEXT } from '@/lib/supply/payment-methods'

export const metadata = { title: 'Payment methods' }
export const dynamic = 'force-dynamic'

/** QC-2: owner only. The ways customers pay HagerLand, shown on reserved order requests and in the reserved email. */
export default async function PaymentMethodsPage() {
  await requireAdminPage()
  if (!(await isOwnerSession())) redirect('/roodber8?denied=1')
  const methods = await listPaymentMethods()
  return (
    <div className="max-w-3xl space-y-5">
      <AdminHeader title={PAYMENT_METHODS_TEXT.title} description="Only you (the owner) can change these. Customers see the active ones, in this order, when their order is reserved." />
      <Panel>
        <PaymentMethodsTools methods={methods} />
      </Panel>
    </div>
  )
}
