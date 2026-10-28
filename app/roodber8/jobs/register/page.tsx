import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { formatDate, formatPhone } from '@/lib/format'
import { TRADES, labelFor, tradeLabel } from '@/lib/jobs'
import { CONTACT_METHODS, LANGUAGES } from '@/lib/jobs-phone'
import { readJobsSwitches } from '@/lib/jobs-switches'
import { updateWorkerRegisterAction } from '../../actions/jobs-phase-2'
import { AdminHeader, FilterBar, FilterField, Panel, filterInput } from '@/components/admin/AdminUi'
import { ActionForm } from '@/components/forms/ActionForm'
import { Select, Textarea } from '@/components/ui/Field'
import { must } from '@/lib/admin/must'

export const metadata = { title: 'Worker register' }

const STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'closed', label: 'Closed' },
] as const

/**
 * Owner and Operations only (the role map and the middleware refuse Agent and Content). Workers who said they are
 * available. Employers never see this list: HagerLand asks a worker before sharing their number.
 */
export default async function WorkerRegisterPage(props: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await props.searchParams
  await requireAdminPage()
  const trade = TRADES.find((t) => t.value === sp.trade)?.value
  const status = STATUSES.find((s) => s.value === sp.status)?.value
  let q = getAdminSupabase()
    .from('worker_register')
    .select('id, reference, name, phone, trades, area_text, availability, preferred_contact, language, status, admin_notes, last_updated_at, created_at')
    .is('personal_data_deleted_at', null)
    .order('last_updated_at', { ascending: false })
    .limit(300)
  if (trade) q = q.contains('trades', [trade])
  if (status) q = q.eq('status', status)
  const [{ data }, switches] = must(await Promise.all([q, readJobsSwitches()]))
  const rows = data ?? []
  return (
    <div className="space-y-5">
      <AdminHeader
        title="Worker register"
        description={`People who said they are available for work (${switches.workerRegister ? 'the form is on the jobs page' : 'the form is switched off'}). Only HagerLand staff see this list. Ask the worker before sharing their number with an employer. Entries are deleted 12 months after the worker last updated them.`}
      />
      <FilterBar action="/roodber8/jobs/register">
        <FilterField label="Trade">
          <select name="trade" defaultValue={trade ?? ''} className={filterInput}>
            <option value="">Any trade</option>
            {TRADES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Status">
          <select name="status" defaultValue={status ?? ''} className={filterInput}>
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </FilterField>
      </FilterBar>
      {rows.length === 0 ? (
        <Panel title="No entries">
          <p className="text-small text-muted">{trade || status ? 'No entry matches these filters.' : 'Nobody has joined the register yet.'}</p>
        </Panel>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Panel title={`${r.name ?? ''} · ${r.reference}`}>
                <p className="text-small">
                  {r.phone && (
                    <a href={`tel:${r.phone}`} className="font-semibold text-green underline">
                      {formatPhone(r.phone)}
                    </a>
                  )}{' '}
                  · prefers {labelFor(CONTACT_METHODS, r.preferred_contact)} · {labelFor(LANGUAGES, r.language)} · {r.availability === 'now' ? 'can start now' : 'can start within a month'}
                </p>
                <p className="mt-1 text-small">
                  {(r.trades ?? []).map((t) => tradeLabel(t)).join(', ')} · {r.area_text}
                </p>
                <p className="mt-1 text-caption text-muted">
                  Joined {formatDate(r.created_at)} · last updated by the worker {formatDate(r.last_updated_at)}
                </p>
                <ActionForm action={updateWorkerRegisterAction} submitLabel="Save" resetOnSuccess={false} className="mt-3 grid gap-3 sm:grid-cols-[200px_1fr]">
                  <input type="hidden" name="id" value={r.id} />
                  <div>
                    <label htmlFor={`wr-st-${r.id}`} className="mb-1 block text-small font-semibold">
                      Status
                    </label>
                    <Select id={`wr-st-${r.id}`} name="status" defaultValue={r.status}>
                      {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label htmlFor={`wr-nt-${r.id}`} className="mb-1 block text-small font-semibold">
                      Private notes (staff only; deleted with the entry)
                    </label>
                    <Textarea id={`wr-nt-${r.id}`} name="admin_notes" rows={2} maxLength={2000} defaultValue={r.admin_notes ?? ''} />
                  </div>
                </ActionForm>
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
