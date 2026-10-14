import Link from 'next/link'
import { FileText } from 'lucide-react'
import { requireAdminPage } from '@/lib/admin/guard'
import { queueCounts } from '@/lib/admin/counts'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { signedDocumentUrl } from '@/lib/storage'
import { formatDate, formatETB, formatPhone, relativeTime } from '@/lib/format'
import { propertyHeadline } from '@/lib/labels'
import { ORG_KIND_LABEL } from '@/lib/org-labels'
import { cn } from '@/lib/cn'
import { AdminHeader, KeyValue, Panel } from '@/components/admin/AdminUi'
import { ModerationControls, DecisionButtons } from '@/components/admin/ModerationControls'
import { BulkApprove } from '@/components/admin/BulkApprove'
import { ChangesDiff } from '@/components/admin/ChangesDiff'
import { MediaImage } from '@/components/media/MediaImage'
import { claimDecisionAction, mediaDecisionAction, reportDecisionAction, verificationDecisionAction } from '../actions/moderation'
import { developmentUpdateDecisionAction, jobDecisionAction } from '../actions/jobs'
import { EMPLOYMENT_TYPES, categoryLabel, formatSalary, labelFor } from '@/lib/jobs'

export const metadata = { title: 'Review queue' }

const TABS = [
  ['properties', 'Properties'],
  ['developments', 'Developments'],
  ['organisations', 'Organisations'],
  ['portfolio', 'Portfolio'],
  ['products', 'Products'],
  ['media', 'Photos'],
  ['changes', 'Pending changes'],
  ['claims', 'Claims'],
  ['verification', 'Verification'],
  ['reports', 'Reports'],
  ['jobs', 'Jobs'],
  ['updates', 'Progress updates'],
] as const
type Tab = (typeof TABS)[number][0]

async function docLinks(paths: string[]): Promise<{ label: string; url: string | null }[]> {
  return Promise.all(paths.map(async (p, i) => ({ label: `Document ${i + 1}`, url: await signedDocumentUrl(p) })))
}

function DocList({ docs }: { docs: { label: string; url: string | null }[] }) {
  if (!docs.length) return <p className="text-small text-muted">No documents uploaded.</p>
  return (
    <ul className="flex flex-wrap gap-2">
      {docs.map((d) => (
        <li key={d.label}>
          {d.url ? (
            <a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border-strong px-3 text-small font-semibold hover:bg-stone-50">
              <FileText className="size-4" aria-hidden /> {d.label}
            </a>
          ) : (
            <span className="text-small text-error">{d.label} unavailable</span>
          )}
        </li>
      ))}
    </ul>
  )
}

export default async function ReviewPage({ searchParams }: { searchParams: { tab?: string } }) {
  requireAdminPage()
  const tab: Tab = (TABS.find(([k]) => k === searchParams.tab)?.[0] ?? 'properties') as Tab
  const counts = await queueCounts()
  const db = getAdminSupabase()
  const countFor: Record<Tab, number> = { properties: counts.properties, developments: counts.developments, organisations: counts.organisations, portfolio: counts.portfolio, products: counts.products, media: counts.media, changes: counts.changes, claims: counts.claims, verification: counts.verification, reports: counts.reports, jobs: counts.jobs, updates: counts.updates }

  let body: React.ReactNode = null

  if (tab === 'properties') {
    const { data } = await db
      .from('properties')
      .select('id, short_id, slug, title, purpose, property_type, bedrooms, price_etb, price_on_request, lister_user_id, lister_org_id, lister_type, location_id, created_at, updated_at, description, contact_phone')
      .eq('status', 'pending_review')
      .order('updated_at')
      .limit(100)
    const rows = data ?? []
    const ids = rows.map((r) => r.id)
    const [{ data: media }, { data: locs }, { data: orgs }, { data: profiles }, { data: notes }, { data: similar }] = await Promise.all([
      ids.length ? db.from('media').select('entity_id, storage_path, status').eq('entity_type', 'property').in('entity_id', ids).eq('kind', 'image').order('sort') : Promise.resolve({ data: [] }),
      db.from('locations').select('id, display_name'),
      db.from('organisations').select('id, name, verification_level').in('id', rows.map((r) => r.lister_org_id).filter((x): x is string => Boolean(x))),
      db.from('profiles').select('id, full_name, phone').in('id', rows.map((r) => r.lister_user_id).filter((x): x is string => Boolean(x))),
      ids.length ? db.from('admin_notes').select('entity_id, note, created_at').eq('entity_type', 'property').in('entity_id', ids) : Promise.resolve({ data: [] }),
      db.from('properties').select('id, title, lister_user_id, location_id, price_etb, status').in('status', ['published', 'pending_review', 'paused']).limit(2000),
    ])
    const dup = (r: (typeof rows)[number]) =>
      (similar ?? []).find(
        (s) =>
          s.id !== r.id &&
          s.lister_user_id === r.lister_user_id &&
          s.location_id === r.location_id &&
          s.title.toLowerCase().slice(0, 20) === r.title.toLowerCase().slice(0, 20) &&
          (r.price_etb === null || s.price_etb === null || Math.abs(s.price_etb - r.price_etb) <= r.price_etb * 0.05),
      )
    body = (
      <BulkApprove
        entity="property"
        items={rows.map((r) => {
          const photos = (media ?? []).filter((m) => m.entity_id === r.id)
          const org = (orgs ?? []).find((o) => o.id === r.lister_org_id)
          const person = (profiles ?? []).find((p) => p.id === r.lister_user_id)
          const d = dup(r)
          return {
            id: r.id,
            node: (
              <Panel>
                <div className="grid gap-4 md:grid-cols-[200px_1fr]">
                  <div className="grid grid-cols-3 gap-1 md:grid-cols-2">
                    {photos.slice(0, 4).map((m) => (
                      <div key={m.storage_path} className="relative aspect-[4/3] overflow-hidden rounded bg-stone-100">
                        <MediaImage path={m.storage_path} alt="" fill sizes="100px" className="object-cover" />
                      </div>
                    ))}
                    {photos.length === 0 && <p className="text-caption text-error">No photos</p>}
                  </div>
                  <div className="min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/roodber8/properties/${r.id}`} className="font-semibold text-ink hover:underline">
                        {r.title}
                      </Link>
                      {d && <span className="rounded-full bg-warning/15 px-2 py-0.5 text-caption font-semibold text-warning">Possible duplicate of “{d.title}”</span>}
                    </div>
                    <KeyValue
                      items={[
                        ['Type', `${propertyHeadline(r.property_type, r.bedrooms)} · ${r.purpose === 'rent' ? 'to rent' : 'for sale'}`],
                        ['Price', r.price_on_request ? 'On request' : formatETB(r.price_etb)],
                        ['Location', (locs ?? []).find((l) => l.id === r.location_id)?.display_name ?? ''],
                        ['Lister', org ? `${org.name} (${org.verification_level})` : `${person?.full_name ?? 'Private owner'} · ${r.lister_type}`],
                        ['Contact', formatPhone(r.contact_phone)],
                        ['Photos', `${photos.length} (${photos.filter((p) => p.status === 'pending').length} awaiting approval)`],
                        ['Submitted', relativeTime(r.updated_at)],
                      ]}
                    />
                    <p className="line-clamp-3 text-small text-muted">{r.description}</p>
                    {(notes ?? []).filter((n) => n.entity_id === r.id).map((n) => (
                      <p key={n.created_at} className="rounded bg-gold-soft px-2 py-1 text-caption">
                        Note: {n.note}
                      </p>
                    ))}
                    <ModerationControls entity="property" id={r.id} />
                  </div>
                </div>
              </Panel>
            ),
          }
        })}
      />
    )
    if (rows.length === 0) body = <Empty />
  }

  if (tab === 'developments' || tab === 'organisations' || tab === 'portfolio') {
    const table = tab === 'developments' ? 'developments' : tab === 'organisations' ? 'organisations' : 'portfolio_projects'
    const { data } = await db.from(table).select('*').eq('status', 'pending_review').order('updated_at').limit(100)
    const rows = (data ?? []) as Record<string, unknown>[]
    const entity = tab === 'developments' ? 'development' : tab === 'organisations' ? 'organisation' : 'portfolio'
    body =
      rows.length === 0 ? (
        <Empty />
      ) : (
        <BulkApprove
          entity={entity}
          items={rows.map((r) => ({
            id: String(r.id),
            node: (
              <Panel>
                <div className="space-y-3">
                  <Link href={entity === 'portfolio' ? `/roodber8/organisations/${String(r.org_id)}` : `/roodber8/${table}/${String(r.id)}`} className="font-semibold text-ink hover:underline">
                    {String(r.name ?? r.title)}
                  </Link>
                  <KeyValue
                    items={[
                      ['Kind', entity === 'organisation' ? ORG_KIND_LABEL[String(r.kind)] : entity === 'development' ? String(r.kind) : 'Portfolio project'],
                      ['Phone', r.phone ? formatPhone(String(r.phone)) : ''],
                      ['Email', r.email ? String(r.email) : ''],
                      ['Website', r.website ? String(r.website) : ''],
                      ['Licence', [r.licence_category, r.licence_grade].filter(Boolean).join(' · ')],
                      ['Submitted', relativeTime(String(r.updated_at))],
                    ]}
                  />
                  {(r.description || r.summary) ? <p className="line-clamp-4 text-small text-muted">{String(r.description ?? r.summary)}</p> : null}
                  <ModerationControls entity={entity} id={String(r.id)} />
                </div>
              </Panel>
            ),
          }))}
        />
      )
  }

  if (tab === 'media') {
    const { data } = await db.from('media').select('id, entity_type, entity_id, storage_path, kind, created_at').eq('status', 'pending').order('created_at').limit(120)
    const rows = data ?? []
    body =
      rows.length === 0 ? (
        <Empty />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((m) => (
            <li key={m.id} className="overflow-hidden rounded-lg border border-border bg-white">
              <div className="relative aspect-[4/3] bg-stone-100">
                <MediaImage path={m.storage_path} alt={`${m.entity_type} ${m.kind}`} fill sizes="300px" className="object-cover" />
              </div>
              <div className="space-y-2 p-3">
                <p className="text-caption text-muted">
                  {m.entity_type} · {m.kind} · {relativeTime(m.created_at)}
                </p>
                <DecisionButtons onApprove={mediaDecisionAction.bind(null, m.id, true)} onReject={mediaDecisionAction.bind(null, m.id, false)} />
              </div>
            </li>
          ))}
        </ul>
      )
  }

  if (tab === 'changes') {
    const [{ data: props }, { data: devs }, { data: orgs }, { data: prods }] = await Promise.all([
      db.from('properties').select('*').not('pending_changes', 'is', null).in('status', ['published', 'paused']).limit(50),
      db.from('developments').select('*').not('pending_changes', 'is', null).in('status', ['published', 'paused']).limit(50),
      db.from('organisations').select('*').not('pending_changes', 'is', null).eq('status', 'published').limit(50),
      db.from('products').select('*').not('pending_changes', 'is', null).in('status', ['published', 'paused']).limit(50),
    ])
    const items: { entity: 'property' | 'development' | 'organisation' | 'product'; row: Record<string, unknown>; name: string; href: string }[] = [
      ...(props ?? []).map((r) => ({ entity: 'property' as const, row: r as Record<string, unknown>, name: r.title, href: `/roodber8/properties/${r.id}` })),
      ...(devs ?? []).map((r) => ({ entity: 'development' as const, row: r as Record<string, unknown>, name: r.name, href: `/roodber8/developments/${r.id}` })),
      ...(orgs ?? []).map((r) => ({ entity: 'organisation' as const, row: r as Record<string, unknown>, name: r.name, href: `/roodber8/organisations/${r.id}` })),
      ...(prods ?? []).map((r) => ({ entity: 'product' as const, row: r as Record<string, unknown>, name: r.name, href: `/roodber8/products/${r.id}` })),
    ]
    body =
      items.length === 0 ? (
        <Empty />
      ) : (
        <ul className="space-y-3">
          {items.map((i) => (
            <li key={String(i.row.id)}>
              <Panel title={`${i.entity}: ${i.name}`} actions={<Link href={i.href} className="text-small font-semibold text-green">Open</Link>}>
                <ChangesDiff live={i.row} changes={(i.row.pending_changes as Record<string, unknown>) ?? {}} />
                <div className="mt-3">
                  <ModerationControls entity={i.entity} id={String(i.row.id)} mode="changes" />
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      )
  }

  if (tab === 'claims') {
    const { data } = await db.from('claims').select('*, org:organisations(id, name, slug)').eq('status', 'pending').order('created_at')
    const rows = data ?? []
    body =
      rows.length === 0 ? (
        <Empty />
      ) : (
        <ul className="space-y-3">
          {await Promise.all(
            rows.map(async (c) => (
              <li key={c.id}>
                <Panel title={`${c.claimant_name} claims ${c.org?.name ?? 'a business'}`}>
                  <KeyValue items={[['Role', c.relationship], ['Phone', formatPhone(c.claimant_phone)], ['Email', c.claimant_email ?? ''], ['Message', c.message ?? ''], ['Sent', formatDate(c.created_at)]]} />
                  <div className="my-3">
                    <DocList docs={await docLinks(c.evidence_paths)} />
                  </div>
                  <DecisionButtons askNote onApprove={claimDecisionAction.bind(null, c.id, true)} onReject={claimDecisionAction.bind(null, c.id, false)} />
                </Panel>
              </li>
            )),
          )}
        </ul>
      )
  }

  if (tab === 'verification') {
    const { data } = await db.from('verification_requests').select('*, org:organisations(id, name, kind, licence_category, licence_grade, trade_licence_number, tin)').eq('status', 'pending').order('created_at')
    const rows = data ?? []
    body =
      rows.length === 0 ? (
        <Empty />
      ) : (
        <ul className="space-y-3">
          {await Promise.all(
            rows.map(async (v) => {
              const docs = Object.entries((v.documents as Record<string, string>) ?? {})
              const links = await Promise.all(docs.map(async ([k, p]) => ({ label: k.replace(/_/g, ' '), url: await signedDocumentUrl(p) })))
              return (
                <li key={v.id}>
                  <Panel title={v.org?.name ?? 'Organisation'} actions={v.org ? <Link href={`/roodber8/organisations/${v.org.id}`} className="text-small font-semibold text-green">Open profile</Link> : undefined}>
                    <KeyValue items={[['Kind', ORG_KIND_LABEL[v.org?.kind ?? ''] ?? ''], ['Licence', [v.org?.licence_category, v.org?.licence_grade].filter(Boolean).join(' · ')], ['Licence no.', v.org?.trade_licence_number ?? ''], ['TIN', v.org?.tin ?? ''], ['Sent', formatDate(v.created_at)]]} />
                    <div className="my-3">
                      <DocList docs={links} />
                    </div>
                    <DecisionButtons askNote approveLabel="Mark Verified" rejectLabel="Decline" onApprove={verificationDecisionAction.bind(null, v.id, true)} onReject={verificationDecisionAction.bind(null, v.id, false)} />
                  </Panel>
                </li>
              )
            }),
          )}
        </ul>
      )
  }

  if (tab === 'reports') {
    const { data } = await db.from('reports').select('*').eq('status', 'open').order('created_at')
    const rows = data ?? []
    const hrefFor = (t: string, id: string) => `/roodber8/${t === 'property' ? 'properties' : t === 'development' ? 'developments' : t === 'product' ? 'products' : 'organisations'}/${id}`
    body =
      rows.length === 0 ? (
        <Empty />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Panel title={`${r.reason.replace(/_/g, ' ')} · ${r.entity_type}`} actions={<Link href={hrefFor(r.entity_type, r.entity_id)} className="text-small font-semibold text-green">Open {r.entity_type}</Link>}>
                <KeyValue items={[['Details', r.details ?? ''], ['Reporter', r.reporter_contact ?? ''], ['Sent', formatDate(r.created_at)]]} />
                <div className="mt-3">
                  <DecisionButtons approveLabel="Dealt with" rejectLabel="Dismiss" onApprove={reportDecisionAction.bind(null, r.id, 'actioned')} onReject={reportDecisionAction.bind(null, r.id, 'dismissed')} />
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      )
  }

  if (tab === 'products') {
    const { data } = await db.from('products').select('id, name, summary, description, price_type, price_etb_cents, seller_org_id, category_id').eq('status', 'pending_review').order('updated_at').limit(100)
    const rows = data ?? []
    const ids = rows.map((r) => r.id)
    const [{ data: orgs }, { data: cats }, { data: media }] = await Promise.all([
      db.from('organisations').select('id, name, verification_level').in('id', rows.map((r) => r.seller_org_id)),
      db.from('product_categories').select('id, name').in('id', rows.map((r) => r.category_id)),
      ids.length ? db.from('media').select('entity_id, storage_path').eq('entity_type', 'product').in('entity_id', ids).eq('kind', 'image').order('sort') : Promise.resolve({ data: [] }),
    ])
    body =
      rows.length === 0 ? (
        <Empty />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const org = (orgs ?? []).find((o) => o.id === r.seller_org_id)
            const photos = (media ?? []).filter((m) => m.entity_id === r.id)
            return (
              <li key={r.id}>
                <Panel title={r.name} actions={<Link href={`/roodber8/products/${r.id}`} className="text-small font-semibold text-green">Open product</Link>}>
                  <div className="grid gap-4 md:grid-cols-[160px_1fr]">
                    <div className="grid grid-cols-3 gap-1 md:grid-cols-2">
                      {photos.slice(0, 4).map((m) => (
                        <div key={m.storage_path} className="relative aspect-square overflow-hidden rounded bg-stone-100">
                          <MediaImage path={m.storage_path} alt="" fill sizes="80px" className="object-cover" />
                        </div>
                      ))}
                      {photos.length === 0 && <p className="text-caption text-error">No photos</p>}
                    </div>
                    <div className="min-w-0 space-y-2">
                      <KeyValue
                        items={[
                          ['Supplier', `${org?.name ?? ''}${org ? ` (${org.verification_level})` : ''}`],
                          ['Category', (cats ?? []).find((c) => c.id === r.category_id)?.name ?? ''],
                          ['Price', r.price_type === 'on_request' || r.price_etb_cents === null ? 'On request' : `${r.price_type === 'from' ? 'From ' : ''}${formatETB(r.price_etb_cents / 100)}`],
                        ]}
                      />
                      {(r.summary || r.description) && <p className="line-clamp-4 text-small">{r.summary ?? r.description}</p>}
                      <ModerationControls entity="product" id={r.id} />
                    </div>
                  </div>
                </Panel>
              </li>
            )
          })}
        </ul>
      )
  }

  if (tab === 'jobs') {
    const { data } = await db.from('jobs').select('id, title, category, employment_type, description, requirements, salary_min_minor, salary_max_minor, salary_period, currency, closing_date, employer_org_id, location_id, updated_at').eq('status', 'pending_review').order('updated_at').limit(100)
    const rows = data ?? []
    const [{ data: orgs }, { data: locs }] = await Promise.all([
      db.from('organisations').select('id, name, status, verification_level').in('id', rows.map((r) => r.employer_org_id)),
      db.from('locations').select('id, display_name').in('id', rows.map((r) => r.location_id).filter((x): x is string => Boolean(x))),
    ])
    body =
      rows.length === 0 ? (
        <Empty />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const org = (orgs ?? []).find((o) => o.id === r.employer_org_id)
            return (
              <li key={r.id}>
                <Panel title={r.title} actions={<Link href={`/roodber8/jobs/${r.id}`} className="text-small font-semibold text-green">Open job</Link>}>
                  <KeyValue
                    items={[
                      ['Employer', `${org?.name ?? ''}${org && org.status !== 'published' ? ' (profile not live yet)' : ''}`],
                      ['Category', categoryLabel(r.category)],
                      ['Type', labelFor(EMPLOYMENT_TYPES, r.employment_type)],
                      ['Location', (locs ?? []).find((l) => l.id === r.location_id)?.display_name ?? ''],
                      ['Salary', formatSalary(r.salary_min_minor, r.salary_max_minor, r.currency, r.salary_period) ?? 'Not given'],
                      ['Closes', r.closing_date ? formatDate(r.closing_date) : '60 days after approval'],
                    ]}
                  />
                  <p className="mt-3 line-clamp-6 whitespace-pre-line text-small">{r.description}</p>
                  <div className="mt-3">
                    <DecisionButtons askNote onApprove={jobDecisionAction.bind(null, r.id, true)} onReject={jobDecisionAction.bind(null, r.id, false)} />
                  </div>
                </Panel>
              </li>
            )
          })}
        </ul>
      )
  }

  if (tab === 'updates') {
    const { data } = await db.from('development_updates').select('id, development_id, title, body, happened_on, photo_paths').eq('status', 'pending_review').order('created_at').limit(100)
    const rows = data ?? []
    const { data: devs } = await db.from('developments').select('id, name').in('id', rows.map((r) => r.development_id))
    body =
      rows.length === 0 ? (
        <Empty />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Panel title={`${r.title} · ${formatDate(r.happened_on)}`} actions={<Link href={`/roodber8/developments/${r.development_id}`} className="text-small font-semibold text-green">{(devs ?? []).find((d) => d.id === r.development_id)?.name ?? 'Development'}</Link>}>
                <p className="whitespace-pre-line text-small">{r.body}</p>
                {r.photo_paths.length > 0 && (
                  <div className="mt-3 grid grid-cols-4 gap-1 sm:grid-cols-6">
                    {r.photo_paths.map((p) => (
                      <div key={p} className="relative aspect-[4/3] overflow-hidden rounded bg-stone-100">
                        <MediaImage path={p} alt="" fill sizes="100px" className="object-cover" />
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3">
                  <DecisionButtons askNote approveLabel="Publish" onApprove={developmentUpdateDecisionAction.bind(null, r.id, true)} onReject={developmentUpdateDecisionAction.bind(null, r.id, false)} />
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      )
  }

  return (
    <div>
      <AdminHeader title="Review queue" description="Everything waiting for a decision. Owners are emailed automatically." />
      <nav aria-label="Queue" className="-mx-1 mb-5 flex flex-wrap gap-1">
        {TABS.map(([key, label]) => (
          <Link key={key} href={`/roodber8/review?tab=${key}`} aria-current={tab === key ? 'page' : undefined} className={cn('inline-flex min-h-10 items-center gap-1.5 rounded-md px-3 text-small font-semibold', tab === key ? 'bg-ink text-white' : 'bg-white text-ink hover:bg-stone-50')}>
            {label}
            {countFor[key] > 0 && <span className={cn('rounded-full px-1.5 text-caption', tab === key ? 'bg-gold text-ink' : 'bg-stone-200')}>{countFor[key]}</span>}
          </Link>
        ))}
      </nav>
      {body}
    </div>
  )
}

function Empty() {
  return <p className="rounded-lg border border-dashed border-border-strong bg-white p-10 text-center text-muted">Nothing waiting here. Nice work.</p>
}
