import { notFound } from 'next/navigation'
import { requireAdminPage } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { getLocations } from '@/lib/data/reference'
import { signedDocumentUrl } from '@/lib/storage'
import { formatDate, formatMoney } from '@/lib/format'
import { CURRENCIES } from '@/lib/countries'
import { INSPECTION_CONDITIONS } from '@/lib/property-care'
import { addInspectionAction, addMaintenanceAction, addStatementAction, saveManagedPropertyAction } from '@/app/roodber8/actions/property-care'
import { AdminHeader, Panel, StatusBadge } from '@/components/admin/AdminUi'
import { ActionForm } from '@/components/forms/ActionForm'
import { ManagedPropertyFields } from '@/components/admin/ManagedPropertyFields'
import { InspectionPhotos } from '@/components/admin/CareTools'
import { AuditTrail } from '@/components/admin/AuditTrail'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { linkOwnerAccountAction, replyToOwnerAction } from '@/app/roodber8/actions/owner-portal'
import { ManagedDocumentUpload } from '@/components/admin/OwnerPortalTools'
import { must } from '@/lib/admin/must'
import { todayInAddis } from '@/lib/supply/shortlist'

export const metadata = { title: 'Managed property' }

const m = (n: number | null, c: string) => (n === null ? '—' : formatMoney(n / 100, c))

export default async function ManagedPropertyPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  await requireAdminPage()
  if (!/^[0-9a-f-]{36}$/.test(params.id)) notFound()
  const db = getAdminSupabase()
  const { data: p } = must(await db.from('managed_properties').select('*').eq('id', params.id).maybeSingle())
  if (!p) notFound()
  const [{ data: inspections }, { data: statements }, { data: log }, { data: history }, locs] = must(await Promise.all([
    db.from('property_inspections').select('*').eq('managed_property_id', p.id).order('inspected_on', { ascending: false }),
    db.from('rent_statements').select('*').eq('managed_property_id', p.id).order('period_start', { ascending: false }),
    db.from('maintenance_log').select('*').eq('managed_property_id', p.id).order('logged_on', { ascending: false }),
    db.from('audit_log').select('id, action, created_at, diff').eq('entity_id', p.id).order('created_at', { ascending: false }).limit(50),
    getLocations(),
  ]))
  const [{ data: docRows }, { data: messages }] = must(await Promise.all([
    db.from('managed_property_documents').select('id, label, storage_path, visible_to_owner').eq('managed_property_id', p.id).order('created_at', { ascending: false }),
    db.from('owner_messages').select('id, sender, sender_name, body, created_at').eq('managed_property_id', p.id).order('created_at').limit(200),
  ]))
  // F-5: a document whose file was deleted under the keeping period has no path: its label shows without a link.
  const docs = await Promise.all((docRows ?? []).map(async (d) => ({ ...d, url: d.storage_path ? await signedDocumentUrl(d.storage_path, d.label) : null })))
  const ownerEmail = p.owner_user_id ? ((await db.auth.admin.getUserById(p.owner_user_id)).data.user?.email ?? null) : null
  const photos = await Promise.all((inspections ?? []).map(async (i) => Promise.all(i.photo_paths.map((path) => signedDocumentUrl(path)))))
  const today = todayInAddis()
  const locations = locs.filter((l) => l.country_code === 'ET').map((l) => ({ id: l.id, label: l.display_name })).sort((a, b) => a.label.localeCompare(b.label))
  return (
    <div className="space-y-5">
      <AdminHeader title={p.title} description={<span className="flex items-center gap-2">{p.reference} <StatusBadge status={p.status} /></span>} />
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          <Panel title="Inspections">
            <ActionForm action={addInspectionAction} submitLabel="Add inspection">
              <input type="hidden" name="managed_property_id" value={p.id} />
              <Field label="Date" htmlFor="in-date" required>
                <Input id="in-date" name="inspected_on" type="date" defaultValue={today} />
              </Field>
              <Field label="Condition" htmlFor="in-cond">
                <Select id="in-cond" name="condition" defaultValue="good">
                  {INSPECTION_CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Inspector" htmlFor="in-who" optional>
                <Input id="in-who" name="inspector" />
              </Field>
              <Field label="Notes" htmlFor="in-notes" optional className="sm:col-span-2">
                <Textarea id="in-notes" name="notes" rows={3} />
              </Field>
              <InspectionPhotos propertyId={p.id} />
            </ActionForm>
            <ul className="mt-6 space-y-4">
              {(inspections ?? []).map((i, n) => (
                <li key={i.id} className="rounded-md border border-border p-3 text-small">
                  <p className="font-semibold">
                    {formatDate(i.inspected_on)} · {INSPECTION_CONDITIONS.find((c) => c.value === i.condition)?.label}
                    {i.inspector ? ` · ${i.inspector}` : ''}
                  </p>
                  {i.notes && <p className="mt-1 whitespace-pre-line">{i.notes}</p>}
                  {photos[n].length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {photos[n].map((url, k) =>
                        url ? (
                          <li key={k}>
                            <a href={url} className="font-semibold text-green underline">
                              Photo {k + 1}
                            </a>
                          </li>
                        ) : null,
                      )}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Rent statements">
            <ActionForm action={addStatementAction} submitLabel="Add statement">
              <input type="hidden" name="managed_property_id" value={p.id} />
              <Field label="From" htmlFor="st-from" required>
                <Input id="st-from" name="period_start" type="date" />
              </Field>
              <Field label="To" htmlFor="st-to" required>
                <Input id="st-to" name="period_end" type="date" />
              </Field>
              <Field label="Currency" htmlFor="st-cur">
                <Select id="st-cur" name="currency" defaultValue={p.currency}>
                  {CURRENCIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Rent due" htmlFor="st-due">
                <Input id="st-due" name="rent_due" inputMode="decimal" />
              </Field>
              <Field label="Rent received" htmlFor="st-rec">
                <Input id="st-rec" name="rent_received" inputMode="decimal" />
              </Field>
              <Field label="Expenses" htmlFor="st-exp">
                <Input id="st-exp" name="expenses" inputMode="decimal" />
              </Field>
              <Field label="Our fees" htmlFor="st-fee">
                <Input id="st-fee" name="fees" inputMode="decimal" />
              </Field>
              <Field label="Notes" htmlFor="st-notes" optional className="sm:col-span-2">
                <Textarea id="st-notes" name="notes" rows={2} />
              </Field>
            </ActionForm>
            <ul className="mt-6 divide-y divide-border text-small">
              {(statements ?? []).map((s) => (
                <li key={s.id} className="py-2">
                  <span className="font-semibold">
                    {formatDate(s.period_start)} – {formatDate(s.period_end)}
                  </span>
                  : due {m(s.rent_due_minor, s.currency)}, received {m(s.rent_received_minor, s.currency)}, expenses {m(s.expenses_minor, s.currency)}, fees {m(s.fees_minor, s.currency)}, to owner{' '}
                  <strong>{m(s.rent_received_minor - s.expenses_minor - s.fees_minor, s.currency)}</strong>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Maintenance log">
            <ActionForm action={addMaintenanceAction} submitLabel="Add entry">
              <input type="hidden" name="managed_property_id" value={p.id} />
              <Field label="Date" htmlFor="ml-date" required>
                <Input id="ml-date" name="logged_on" type="date" defaultValue={today} />
              </Field>
              <Field label="What was done" htmlFor="ml-title" required>
                <Input id="ml-title" name="title" maxLength={160} />
              </Field>
              <Field label="Status" htmlFor="ml-status">
                <Select id="ml-status" name="status" defaultValue="done">
                  <option value="planned">Planned</option>
                  <option value="in_progress">In progress</option>
                  <option value="done">Done</option>
                </Select>
              </Field>
              <Field label="Cost" htmlFor="ml-cost" optional>
                <Input id="ml-cost" name="cost" inputMode="decimal" />
              </Field>
              <input type="hidden" name="currency" value={p.currency} />
              <Field label="Details" htmlFor="ml-desc" optional className="sm:col-span-2">
                <Textarea id="ml-desc" name="description" rows={2} />
              </Field>
            </ActionForm>
            <ul className="mt-6 divide-y divide-border text-small">
              {(log ?? []).map((l) => (
                <li key={l.id} className="py-2">
                  <span className="font-semibold">{formatDate(l.logged_on)}</span> · {l.title} · {l.status.replace('_', ' ')}
                  {l.cost_minor !== null ? ` · ${m(l.cost_minor, l.currency)}` : ''}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
        <div className="space-y-5">
          <Panel title="Owner portal">
            {ownerEmail ? <p className="mb-3 text-small">Linked account: <strong>{ownerEmail}</strong></p> : <p className="mb-3 text-small text-muted">No account linked: the owner portal does not show this property to anyone.</p>}
            <ActionForm action={linkOwnerAccountAction.bind(null, p.id)} submitLabel={ownerEmail ? 'Change' : 'Link account'} className="grid gap-3" resetOnSuccess={false}>
              <Field label="Owner's account email" htmlFor="op-email" hint="Leave empty and save to unlink.">
                <Input id="op-email" name="email" type="email" defaultValue={ownerEmail ?? p.owner_email ?? ''} />
              </Field>
            </ActionForm>
            <h3 className="mb-2 mt-5 text-small font-semibold">Documents</h3>
            <ul className="mb-3 space-y-1 text-small">
              {docs.map((d) => (
                <li key={d.id}>
                  {d.url ? <a href={d.url} className="text-green underline">{d.label}</a> : d.label} <span className="text-caption text-muted">· {d.visible_to_owner ? 'shared with the owner' : 'staff only'}</span>
                </li>
              ))}
              {docs.length === 0 && <li className="text-muted">None yet.</li>}
            </ul>
            <ManagedDocumentUpload id={p.id} />
            <h3 className="mb-2 mt-5 text-small font-semibold">Messages</h3>
            <ol className="mb-3 max-h-80 space-y-2 overflow-y-auto">
              {(messages ?? []).map((m) => (
                <li key={m.id} className={`rounded-md p-2 text-small ${m.sender === 'owner' ? 'bg-stone-100' : 'bg-green-tint'}`}>
                  <span className="block text-caption text-muted">
                    {m.sender === 'owner' ? `Owner · ${m.sender_name}` : `HagerLand · ${m.sender_name}`} · {formatDate(m.created_at)}
                  </span>
                  <span className="whitespace-pre-line">{m.body}</span>
                </li>
              ))}
              {(messages ?? []).length === 0 && <li className="text-small text-muted">No messages.</li>}
            </ol>
            <ActionForm action={replyToOwnerAction.bind(null, p.id)} submitLabel="Send reply" className="grid gap-3">
              <Field label="Your name (shown to the owner)" htmlFor="op-name">
                <Input id="op-name" name="sender_name" maxLength={120} />
              </Field>
              <Field label="Reply" htmlFor="op-body">
                <Textarea id="op-body" name="body" rows={3} maxLength={4000} />
              </Field>
            </ActionForm>
          </Panel>
          <Panel title="Details">
            <ActionForm action={saveManagedPropertyAction} submitLabel="Save" resetOnSuccess={false} className="grid gap-3">
              <ManagedPropertyFields
                d={{ ...p, monthly_fee: p.monthly_fee_minor !== null ? String(p.monthly_fee_minor / 100) : '' }}
                locations={locations}
              />
            </ActionForm>
          </Panel>
          <Panel title="History">
            <AuditTrail entries={history ?? []} />
          </Panel>
        </div>
      </div>
    </div>
  )
}
