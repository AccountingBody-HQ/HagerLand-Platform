import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { isOwnerSession, requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate } from '@/lib/format'
import { AdminHeader, KeyValue, Panel, StatusBadge } from '@/components/admin/AdminUi'
import { FormAlert } from '@/components/forms/FormParts'
import { InvitePartnerForm, RegistrationStatusTools } from '@/components/admin/PartnerAdminTools'
import { must } from '@/lib/admin/must'
import {
  DRAFT_STATUS_LABEL,
  REGISTRATION_STATUSES,
  ROLE_LABEL,
  canMoveRegistration,
  ownerOnlyRegistrationMove,
  type DraftStatus,
  type PartnerRole,
  type RegistrationStatus,
} from '@/lib/supply/partner-rules'

export const metadata = { title: 'Partner registration' }

/** S6-1: one registration. Decisions are the owner's; Operations may start a review. Nothing here is ever public. */
export default async function PartnerRegistrationPage(props: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const [{ id }, searchParams] = await Promise.all([props.params, props.searchParams])
  await requireAdminPage()
  if (!z.uuid().safeParse(id).success) notFound()
  const db = getAdminSupabase()
  const { data: r } = must(await db.from('partner_registrations').select('*').eq('id', id).maybeSingle())
  if (!r) notFound()
  const owner = await isOwnerSession()
  const places = [r.city_location_id, r.subcity_location_id, r.woreda_location_id].filter((x): x is string => Boolean(x))
  const [{ data: locs }, { data: cats }, { data: invites }, { data: drafts }] = must(
    await Promise.all([
      places.length ? db.from('locations').select('id, display_name').in('id', places) : Promise.resolve({ data: [] as { id: string; display_name: string }[], error: null }),
      r.category_ids.length ? db.from('product_categories').select('id, name').in('id', r.category_ids) : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
      owner ? db.from('partner_invitations').select('id, email, created_at, expires_at, accepted_at, revoked_at').eq('org_id', r.org_id).order('created_at', { ascending: false }).limit(20) : Promise.resolve({ data: [], error: null }),
      db.from('partner_product_drafts').select('id, name, status, updated_at').eq('org_id', r.org_id).order('updated_at', { ascending: false }).limit(200),
    ]),
  )
  const place = (lid: string | null) => (lid ? (locs ?? []).find((l) => l.id === lid)?.display_name ?? '' : '')
  const status = r.status as RegistrationStatus
  const moves = REGISTRATION_STATUSES.filter((to) => canMoveRegistration(status, to) && (owner || !ownerOnlyRegistrationMove(to)))
  return (
    <div className="max-w-4xl space-y-5">
      <AdminHeader title={r.business_name} description={`${r.reference} · ${r.source === 'staff' ? 'Added by staff' : 'Public form'} · ${formatDate(r.created_at)}`} />
      {searchParams.added && <FormAlert tone="success">Registration added. Its private supply partner record was created too.</FormAlert>}
      {r.personal_data_deleted_at && <FormAlert tone="info">Contact details were cleared on {formatDate(r.personal_data_deleted_at)} (keeping period).</FormAlert>}
      <Panel title="Details">
        <KeyValue
          items={[
            ['Status', <StatusBadge key="s" status={r.status} />],
            ['What they do', r.roles.map((x) => ROLE_LABEL[x as PartnerRole] ?? x).join(', ')],
            ['Other names', r.other_names ?? ''],
            ['Product categories', (cats ?? []).map((c) => c.name).join(', ')],
            ['City', place(r.city_location_id)],
            ['Sub-city', place(r.subcity_location_id)],
            ['Woreda', place(r.woreda_location_id)],
            ['Contact name', r.contact_name],
            ['Phone', r.phone],
            ['Email', r.email ?? ''],
            ['TIN', r.tin ?? ''],
            ['Message', r.message ?? ''],
            ['Consent', r.consent_at ? `${formatDate(r.consent_at)} (wording ${r.consent_version})` : 'Added by staff'],
            ['Admin note', r.admin_note ?? ''],
            ['Supply partner record', <Link key="o" href={`/roodber8/organisations/${r.org_id}`} prefetch={false} className="underline">Open (private business, never published)</Link>],
          ]}
        />
      </Panel>
      <Panel title="Decision">
        <RegistrationStatusTools id={r.id} moves={moves} updatedAt={r.updated_at} />
      </Panel>
      {owner && status === 'approved' && (
        <Panel title="Partner area">
          <p className="mb-3 text-small text-muted">Emails a link (valid 7 days) to the business&rsquo;s private partner area, where they add products for review. Sending again withdraws the previous link.</p>
          <InvitePartnerForm registrationId={r.id} email={r.email ?? ''} name={r.contact_name} />
          {(invites ?? []).length > 0 && (
            <ul className="mt-4 space-y-1 text-small">
              {(invites ?? []).map((i) => (
                <li key={i.id}>
                  {i.email} · sent {formatDate(i.created_at)} ·{' '}
                  {i.accepted_at ? `accepted ${formatDate(i.accepted_at)}` : i.revoked_at ? 'withdrawn' : new Date(i.expires_at).getTime() < Date.now() ? 'expired' : `open until ${formatDate(i.expires_at)}`}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
      <Panel title="Product drafts">
        {(drafts ?? []).length === 0 ? (
          <p className="text-small text-muted">No product drafts yet.</p>
        ) : (
          <ul className="space-y-1">
            {(drafts ?? []).map((d) => (
              <li key={d.id}>
                <Link href={`/roodber8/supply/product-drafts/${d.id}`} prefetch={false} className="underline">
                  {d.name}
                </Link>{' '}
                · {DRAFT_STATUS_LABEL[d.status as DraftStatus] ?? d.status}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
