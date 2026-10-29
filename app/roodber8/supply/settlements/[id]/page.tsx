import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { z } from 'zod'
import { isOwnerSession, requireAdminPage } from '@/lib/admin/guard'
import { formatDate, formatETBCents } from '@/lib/format'
import { addisDateTime } from '@/lib/supply/order-requests'
import { AdminHeader, KeyValue, Panel, StatusBadge } from '@/components/admin/AdminUi'
import { FormAlert } from '@/components/forms/FormParts'
import { ButtonLink } from '@/components/ui/Button'
import { ApproveSettlementButton, PaySettlementForm, VoidSettlementStep } from '@/components/admin/SettlementTools'
import { settlementDetail } from '@/lib/supply/settlements-data'
import { METHOD_LABEL, SETTLEMENT_STATUS_LABEL, type SettlementStatus } from '@/lib/supply/settlements'
import { todayInAddis } from '@/lib/supply/shortlist'

export const metadata = { title: 'Settlement' }
export const dynamic = 'force-dynamic'

/** S6-3 (owner only): one settlement: approve, record the payment, void, and the partner's statement. */
export default async function SettlementPage(props: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const [{ id }, sp] = await Promise.all([props.params, props.searchParams])
  await requireAdminPage()
  if (!(await isOwnerSession())) redirect('/roodber8?denied=1')
  if (!z.uuid().safeParse(id).success) notFound()
  const s = await settlementDetail(id)
  if (!s) notFound()
  const status = s.status as SettlementStatus
  return (
    <div className="max-w-4xl space-y-5">
      <AdminHeader
        title={s.reference}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={s.status} /> {SETTLEMENT_STATUS_LABEL[status]} · {s.partner} · {formatDate(s.from)} – {formatDate(s.to)}
          </span>
        }
        actions={
          <span className="flex flex-wrap gap-2">
            <ButtonLink href={`/roodber8/supply/settlements/${s.id}/statement`} variant="secondary" size="sm" prefetch={false} external>
              Statement for the partner
            </ButtonLink>
            <ButtonLink href={`/roodber8/supply/settlements/${s.id}/statement?download=1`} variant="ghost" size="sm" prefetch={false}>
              Download statement
            </ButtonLink>
          </span>
        }
      />
      {sp.created && <FormAlert tone="success">Draft settlement created. Check it, then approve it.</FormAlert>}
      <Panel title="Amounts">
        <ul className="space-y-1 text-small">
          {s.items.map((i) => (
            <li key={i.id}>
              {i.kind === 'payable' ? (
                <>
                  <Link href={`/roodber8/supply/orders/${i.orderId}`} prefetch={false} className="font-mono underline">
                    {i.order}
                  </Link>{' '}
                  · {formatETBCents(i.amountCents)}
                  {i.upfrontReason ? ` · paid up front: ${i.upfrontReason}` : ''}
                </>
              ) : (
                <>
                  Adjustment: {i.reason} · {formatETBCents(i.amountCents)}
                  {i.order ? ` · ${i.order}` : ''}
                </>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-3 font-semibold">Total: {formatETBCents(s.totalCents)}</p>
      </Panel>
      <Panel title="Status">
        <KeyValue
          items={[
            ['Created', addisDateTime(s.createdAt)],
            ['Approved', s.approvedAt ? `${addisDateTime(s.approvedAt)}${s.approvedBy ? ` by ${s.approvedBy}` : ''}` : ''],
            ['Paid', s.paidOn ? `${formatDate(s.paidOn)} · ${METHOD_LABEL[s.method ?? ''] ?? s.method} · ${s.transferReference ?? ''}` : ''],
            ['Void', s.voidReason ?? ''],
          ]}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {status === 'draft' && <ApproveSettlementButton id={s.id} updatedAt={s.updatedAt} />}
          {(status === 'draft' || status === 'approved') && <VoidSettlementStep id={s.id} />}
        </div>
        {status === 'approved' && (
          <div className="mt-4">
            <PaySettlementForm id={s.id} today={todayInAddis()} />
          </div>
        )}
      </Panel>
    </div>
  )
}
