import Link from 'next/link'
import { KeyRound } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { getMyAgencyRecords } from '@/lib/data/my-agency'
import { formatAppointment, formatDate, formatETB, formatMoney } from '@/lib/format'
import { STATUS_LABEL, VIEWING_MODE_LABEL } from '@/lib/agency'
import { AccountPageHeader } from '@/components/account/PageHeader'
import { EmptyState } from '@/components/ui/Layout'
import { Badge } from '@/components/ui/Badge'
import { ButtonLink } from '@/components/ui/Button'
import { RepairForm } from '@/components/agency/RepairForm'

export const metadata = { title: 'Viewings, offers and tenancies' }

function Group({ title, children, count }: { title: string; children: React.ReactNode; count: number }) {
  if (count === 0) return null
  return (
    <section className="mt-8" aria-labelledby={`g-${title}`}>
      <h2 id={`g-${title}`} className="hl-h3 mb-3">
        {title}
      </h2>
      <ul className="divide-y divide-border rounded-lg border border-border bg-white">{children}</ul>
    </section>
  )
}

function Row({ title, meta, status, href }: { title: string; meta: string; status: string; href?: string | null }) {
  const body = (
    <>
      <span className="min-w-0">
        <span className="block font-semibold text-ink">{title}</span>
        <span className="text-small text-muted">{meta}</span>
      </span>
      <Badge tone={['accepted', 'approved', 'confirmed', 'active', 'completed'].includes(status) ? 'green' : ['rejected', 'cancelled', 'withdrawn', 'no_show'].includes(status) ? 'neutral' : 'gold'}>{STATUS_LABEL[status] ?? status}</Badge>
    </>
  )
  return <li>{href ? <Link href={href} className="flex flex-col gap-2 p-4 hover:bg-stone-50 sm:flex-row sm:items-center sm:justify-between">{body}</Link> : <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">{body}</div>}</li>
}

const one = <T,>(x: T | T[] | null): T | null => (Array.isArray(x) ? (x[0] ?? null) : x)

/** The customer's valuations, viewings, offers, applications and tenancies with HagerLand's agency (spec 26.5). */
export default async function MyAgencyPage() {
  const user = await requireUser('/account/agency')
  const r = await getMyAgencyRecords(user)
  const total = r.valuations.length + r.viewings.length + r.offers.length + r.applications.length + r.tenancies.length
  return (
    <div>
      <AccountPageHeader title="Viewings, offers and tenancies" description="Everything you have arranged with HagerLand's estate agency, including requests you sent before you signed in with this email." />
      {total === 0 && (
        <EmptyState
          icon={<KeyRound />}
          title="Nothing here yet"
          description="Book a market appraisal, or a viewing on a property marketed by HagerLand, and you can follow it here."
          actions={<ButtonLink href="/agency/valuation">Book a market appraisal</ButtonLink>}
        />
      )}
      <Group title="Market appraisals" count={r.valuations.length}>
        {r.valuations.map((v) => (
          <Row key={v.id} title={`Market appraisal for ${v.purpose === 'sale' ? 'sale' : 'letting'}`} meta={[v.reference, v.appointment_at ? `Visit ${formatAppointment(v.appointment_at)}` : `Requested ${formatDate(v.created_at)}`, v.value_low_etb && v.value_high_etb ? `${formatETB(v.value_low_etb)} – ${formatETB(v.value_high_etb)}` : null].filter(Boolean).join(' · ')} status={v.status} />
        ))}
      </Group>
      <Group title="Viewings" count={r.viewings.length}>
        {r.viewings.map((v) => {
          const p = one(v.property)
          return <Row key={v.id} title={p?.title ?? 'Property'} href={p?.slug ? `/property/${p.slug}` : null} meta={[v.reference, VIEWING_MODE_LABEL[v.mode as 'video'], v.scheduled_at ? formatAppointment(v.scheduled_at) : `You asked for: ${v.preferred_times ?? ''}`, v.status === 'confirmed' && v.video_link ? 'Video link in your confirmation email' : null].filter(Boolean).join(' · ')} status={v.status} />
        })}
      </Group>
      <Group title="Offers" count={r.offers.length}>
        {r.offers.map((o) => {
          const p = one(o.property)
          return <Row key={o.id} title={p?.title ?? 'Property'} href={p?.slug ? `/property/${p.slug}` : null} meta={[o.reference, `Your offer ${formatETB(o.amount_etb)}`, o.status === 'countered' && o.counter_amount_etb ? `Owner suggested ${formatETB(o.counter_amount_etb)}` : null, formatDate(o.created_at)].filter(Boolean).join(' · ')} status={o.status} />
        })}
      </Group>
      <Group title="Applications to rent" count={r.applications.length}>
        {r.applications.map((a) => {
          const p = one(a.property)
          return <Row key={a.id} title={p?.title ?? 'Property'} href={p?.slug ? `/property/${p.slug}` : null} meta={[a.reference, a.move_in_date ? `Move in ${formatDate(a.move_in_date)}` : null, formatDate(a.created_at)].filter(Boolean).join(' · ')} status={a.status} />
        })}
      </Group>
      <Group title="Tenancies" count={r.tenancies.length}>
        {r.tenancies.map((t) => (
          <Row key={t.id} title={t.title} meta={[t.reference, `${formatDate(t.start_date)}${t.end_date ? ` to ${formatDate(t.end_date)}` : ''}`, `${formatMoney(t.rent_minor / 100, t.currency)} per ${t.rent_period}`, t.renewal_date ? `Renewal ${formatDate(t.renewal_date)}` : null].filter(Boolean).join(' · ')} status={t.status} />
        ))}
      </Group>
      {r.tenancies
        .filter((t) => t.managed_property_id && t.status === 'active')
        .map((t) => (
          <section key={`repair-${t.id}`} className="mt-6 rounded-lg border border-border bg-white p-5" aria-labelledby={`repair-${t.id}`}>
            <h2 id={`repair-${t.id}`} className="hl-h3">
              Report a repair: {t.title}
            </h2>
            <p className="mb-3 mt-1 text-small text-muted">HagerLand manages this property. Tell us what needs fixing and we will arrange it.</p>
            <RepairForm source="tenancy" id={t.id} />
          </section>
        ))}
    </div>
  )
}
