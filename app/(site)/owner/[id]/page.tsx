import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { getOwnedProperty } from '@/lib/data/owner'
import { formatDate, formatMoney } from '@/lib/format'
import { CARE_SERVICE_LABEL, INSPECTION_CONDITIONS } from '@/lib/property-care'
import { Container } from '@/components/ui/Layout'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Badge } from '@/components/ui/Badge'
import { RepairForm } from '@/components/agency/RepairForm'
import { OwnerMessageForm } from '@/components/owner/OwnerMessageForm'

export const metadata = { title: 'Your property' }

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-xl border border-border bg-white p-5">
      <h2 id={id} className="hl-h3 mb-4">
        {title}
      </h2>
      {children}
    </section>
  )
}

/** One managed property for its owner (spec 26.7). Photos and documents open through 10-minute private links. */
export default async function OwnerPropertyPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()
  const user = await requireUser(`/owner/${id}`)
  const data = await getOwnedProperty(user, id)
  if (!data) notFound()
  const { property: p, inspections, statements, maintenance, documents, messages } = data
  const loc = Array.isArray(p.location) ? p.location[0] : p.location
  return (
    <Container className="py-10">
      <Breadcrumbs items={[{ label: 'Owner portal', href: '/owner' }, { label: p.title }]} />
      <p className="mt-6 text-caption text-muted">{p.reference}</p>
      <h1 className="hl-h1">{p.title}</h1>
      <p className="mt-1 text-muted">{[loc?.display_name, p.address_line, p.start_date ? `Managed since ${formatDate(p.start_date)}` : null].filter(Boolean).join(' · ')}</p>
      {p.services.length > 0 && <p className="mt-2 text-small text-muted">Services: {p.services.map((s) => CARE_SERVICE_LABEL[s] ?? s).join(', ')}</p>}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          <Block id="inspections" title="Inspections">
            {inspections.length === 0 ? (
              <p className="text-muted">No inspection reports yet.</p>
            ) : (
              <ul className="space-y-5">
                {inspections.map((i) => (
                  <li key={i.id}>
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {formatDate(i.inspected_on)}
                      <Badge tone={i.condition === 'good' ? 'green' : i.condition === 'urgent' ? 'danger' : 'gold'}>{INSPECTION_CONDITIONS.find((c) => c.value === i.condition)?.label}</Badge>
                      {i.inspector && <span className="text-small font-normal text-muted">by {i.inspector}</span>}
                    </p>
                    {i.notes && <p className="mt-1 whitespace-pre-line text-small">{i.notes}</p>}
                    {i.photos.length > 0 && (
                      <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {i.photos.map((url, n) => (
                          <li key={url}>
                            <a href={url} target="_blank" rel="noreferrer">
                              {/* Private photos through short-lived signed links, so the optimiser cannot cache them. */}
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={url} alt={`Inspection ${formatDate(i.inspected_on)}, photo ${n + 1}`} className="aspect-square w-full rounded-md object-cover" loading="lazy" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Block>
          <Block id="statements" title="Rent statements">
            {statements.length === 0 ? (
              <p className="text-muted">No statements yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-small">
                  <thead>
                    <tr className="text-left text-muted">
                      <th className="py-2 font-semibold">Period</th>
                      <th className="py-2 font-semibold">Received</th>
                      <th className="py-2 font-semibold">Expenses</th>
                      <th className="py-2 font-semibold">Fees</th>
                      <th className="py-2 font-semibold">To you</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statements.map((s) => (
                      <tr key={s.id} className="border-t border-border tabular-nums">
                        <td className="py-2">
                          {formatDate(s.period_start)} – {formatDate(s.period_end)}
                        </td>
                        <td className="py-2">{formatMoney(s.rent_received_minor / 100, s.currency)}</td>
                        <td className="py-2">{formatMoney(s.expenses_minor / 100, s.currency)}</td>
                        <td className="py-2">{formatMoney(s.fees_minor / 100, s.currency)}</td>
                        <td className="py-2 font-semibold">{formatMoney((s.rent_received_minor - s.expenses_minor - s.fees_minor) / 100, s.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Block>
          <Block id="maintenance" title="Maintenance log">
            {maintenance.length === 0 ? (
              <p className="text-muted">Nothing recorded yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {maintenance.map((m) => (
                  <li key={m.id} className="py-2 text-small">
                    <span className="font-semibold">{m.title}</span> · {formatDate(m.logged_on)} · {m.status === 'done' ? 'Done' : m.status === 'in_progress' ? 'In progress' : 'Planned'}
                    {m.cost_minor !== null && <> · {formatMoney(m.cost_minor / 100, m.currency)}</>}
                    {m.description && <span className="block text-muted">{m.description}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Block>
        </div>
        <div className="space-y-6">
          <Block id="repair" title="Report a repair">
            <RepairForm source="owner" id={p.id} />
          </Block>
          <Block id="messages" title="Messages">
            {messages.length > 0 && (
              <ol className="mb-4 space-y-3">
                {messages.map((m) => (
                  <li key={m.id} className={`rounded-lg p-3 text-small ${m.sender === 'owner' ? 'bg-stone-100' : 'bg-green-tint'}`}>
                    <span className="block text-caption text-muted">
                      {m.sender === 'owner' ? 'You' : `HagerLand · ${m.sender_name}`} · {formatDate(m.created_at)}
                    </span>
                    <span className="whitespace-pre-line">{m.body}</span>
                  </li>
                ))}
              </ol>
            )}
            <OwnerMessageForm propertyId={p.id} />
          </Block>
          <Block id="documents" title="Documents">
            {documents.length === 0 ? (
              <p className="text-small text-muted">No documents shared yet.</p>
            ) : (
              <ul className="space-y-1 text-small">
                {documents.map((d) => (
                  <li key={d.id}>{d.url ? <a href={d.url} className="font-semibold text-green underline">{d.label}</a> : d.label}</li>
                ))}
              </ul>
            )}
          </Block>
        </div>
      </div>
    </Container>
  )
}
