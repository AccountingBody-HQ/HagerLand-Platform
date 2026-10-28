import Link from 'next/link'
import { requireAdminPage } from '@/lib/admin/guard'
import { callbackQueue, type CallbackRow } from '@/lib/callbacks-data'
import { CALLBACK_MAX_TRIES, CALLBACK_OUTCOMES, CALLBACK_SCRIPT, labelForTime } from '@/lib/callbacks'
import { LANGUAGES } from '@/lib/jobs-phone'
import { labelFor } from '@/lib/jobs'
import { countryName } from '@/lib/countries'
import { formatDate, formatPhone } from '@/lib/format'
import { AdminHeader, Panel } from '@/components/admin/AdminUi'
import { RunButton } from '@/components/admin/AgencyTools'
import { ActionButton } from '@/components/forms/ActionButton'
import { recordCallbackOutcomeAction } from '@/app/roodber8/actions/jobs-callbacks'
import { FormAlert } from '@/components/forms/FormParts'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { must } from '@/lib/admin/must'

export const metadata = { title: 'Call-back requests' }

const outcomeLabel = (v: string | null) => CALLBACK_OUTCOMES.find((o) => o.value === v)?.label ?? ''

function Details({ r }: { r: CallbackRow }) {
  return (
    <dl className="grid gap-x-4 gap-y-1 text-small sm:grid-cols-[10rem_1fr] [overflow-wrap:anywhere]">
      <dt className="text-muted">Phone</dt>
      <dd>{r.phone ? <a href={`tel:${r.phone}`} className="font-semibold text-green underline">{formatPhone(r.phone)}</a> : '—'}</dd>
      <dt className="text-muted">What they need</dt>
      <dd className="whitespace-pre-line">{r.need}</dd>
      <dt className="text-muted">Area</dt>
      <dd>{r.area_text}</dd>
      <dt className="text-muted">Language</dt>
      <dd>{labelFor(LANGUAGES, r.language)}</dd>
      <dt className="text-muted">Best time (Addis Ababa)</dt>
      <dd>{labelForTime(r.time_of_day)}</dd>
      {r.based_abroad && (
        <>
          <dt className="text-muted">Based outside Ethiopia</dt>
          <dd>{r.country_code ? countryName(r.country_code) : 'Yes'}</dd>
        </>
      )}
    </dl>
  )
}

/**
 * Owner and Operations (the role map and the middleware refuse Agent and Content). Call-back requests from people
 * hiring (Jobs Phase 5). Nothing is emailed or texted to the caller: the team calls.
 */
export default async function CallbackRequestsPage(props: { searchParams: Promise<{ made?: string }> }) {
  await requireAdminPage()
  const { made } = await props.searchParams
  // Tidy T-2 (T2-4): after staff sent a staffing request for a phone-only caller (only a real one, without email).
  const madeRef = made && /^HLS-\d{4}-\d{6}$/.test(made) ? made : null
  const [{ open, closed }, { data: madeRequest }] = must(await Promise.all([
    callbackQueue(),
    madeRef ? getAdminSupabase().from('service_requests').select('reference').eq('reference', madeRef).is('email', null).maybeSingle() : Promise.resolve({ data: null }),
  ]))
  return (
    <div className="space-y-5">
      <AdminHeader title="Call-back requests" description="People hiring who asked HagerLand's recruitment team to call them. Call them at the time they chose (Addis Ababa time), then record what happened. Details are deleted 12 months after the request or the last call." />
      {madeRequest && (
        <FormAlert tone="success">
          Staffing request {madeRequest.reference} created and linked to the call-back. No email was sent: give the caller the reference by phone.
        </FormAlert>
      )}
      <Panel title="What to say">
        <p className="text-small">{CALLBACK_SCRIPT}</p>
      </Panel>
      <Panel title={`Waiting for a call (${open.length})`}>
        {open.length === 0 ? (
          <p className="text-small text-muted">No call-back requests are waiting.</p>
        ) : (
          <ul className="space-y-3">
            {open.map((r) => (
              <li key={r.id} className="rounded-md border border-border p-3">
                <p className="font-semibold">
                  {r.name} <span className="font-normal text-muted">· {r.reference} · {formatDate(r.created_at)}{r.tries > 0 ? ` · no answer ${r.tries} of ${CALLBACK_MAX_TRIES}` : ''}</span>
                </p>
                <div className="mt-2">
                  <Details r={r} />
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Link href={`/request-service/staffing?callback=${r.id}`} prefetch={false} target="_blank" className="inline-flex min-h-9 items-center justify-center rounded-md bg-green px-3 text-small font-semibold text-white hover:bg-green-dark">
                    {outcomeLabel('staffing_request')}
                  </Link>
                  <RunButton label={outcomeLabel('no_action')} fn={recordCallbackOutcomeAction.bind(null, r.id, 'no_action')} />
                  <RunButton label={outcomeLabel('no_answer')} fn={recordCallbackOutcomeAction.bind(null, r.id, 'no_answer')} />
                  <ActionButton size="sm" variant="ghost" confirm="Delete this caller's details now and block the number for 30 days?" action={recordCallbackOutcomeAction.bind(null, r.id, 'wrong_number')}>
                    {outcomeLabel('wrong_number')}
                  </ActionButton>
                  <ActionButton size="sm" variant="ghost" confirm="Close this request as spam?" action={recordCallbackOutcomeAction.bind(null, r.id, 'spam')}>
                    {outcomeLabel('spam')}
                  </ActionButton>
                </div>
                <p className="mt-2 text-caption text-muted">“{outcomeLabel('staffing_request')}” opens the staffing request form filled in with this caller’s name, phone and need. Add their email and the details from the call; sending it closes this request and links it.</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="Recently closed">
        {closed.length === 0 ? (
          <p className="text-small text-muted">None yet.</p>
        ) : (
          <ul className="space-y-2 text-small">
            {closed.map((r) => (
              <li key={r.id} className="rounded-md border border-border p-2 [overflow-wrap:anywhere]">
                <strong>{r.reference}</strong> · {outcomeLabel(r.outcome)}
                {r.handled_at ? ` · ${formatDate(r.handled_at)}` : ''}
                {r.handled_by ? ` · ${r.handled_by}` : ''}
                {r.service_request_id && (
                  <>
                    {' · '}
                    <Link href={`/roodber8/service-requests/${r.service_request_id}`} prefetch={false} className="font-semibold text-green underline">
                      Staffing request
                    </Link>
                  </>
                )}
                {r.personal_data_deleted_at ? <span className="text-muted"> · details deleted</span> : <span> · {r.name}</span>}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
