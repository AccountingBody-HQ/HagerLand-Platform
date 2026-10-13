import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { BadgeCheck, Building2, Hammer, Inbox, MapPin } from 'lucide-react'
import { IS_PRODUCTION } from '@/lib/site'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/admin-auth'
import { formatArea, formatDate, formatETB, formatPhone, relativeTime } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'
import { Button, ButtonLink } from '@/components/ui/Button'
import { Checkbox, Field, Input, Radio, RangeInputs, Select, Textarea } from '@/components/ui/Field'
import { Card, Container, EmptyState, SectionHeader, Skeleton, Stat } from '@/components/ui/Layout'
import { Accordion } from '@/components/ui/Accordion'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { Pagination } from '@/components/ui/Pagination'
import { ChipLink, FilterChip } from '@/components/ui/Chip'
import { Tooltip } from '@/components/ui/Tooltip'
import { StyleguideDemos } from './StyleguideDemos'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Style guide', robots: { index: false, follow: false } }

const COLOURS: { name: string; className: string; hex: string }[] = [
  { name: 'green', className: 'bg-green', hex: '#1C7C4C' },
  { name: 'green-dark', className: 'bg-green-dark', hex: '#155F3A' },
  { name: 'green-darker', className: 'bg-green-darker', hex: '#0F4A2C' },
  { name: 'green-soft', className: 'bg-green-soft', hex: '#E9F5EE' },
  { name: 'green-tint', className: 'bg-green-tint', hex: '#F3FAF6' },
  { name: 'gold', className: 'bg-gold', hex: '#B8862E' },
  { name: 'gold-dark', className: 'bg-gold-dark', hex: '#805C1C' },
  { name: 'gold-soft', className: 'bg-gold-soft', hex: '#FBF1DE' },
  { name: 'ink', className: 'bg-ink', hex: '#152238' },
  { name: 'ink-2', className: 'bg-ink-2', hex: '#24324A' },
  { name: 'stone-50', className: 'bg-stone-50', hex: '#FAF9F7' },
  { name: 'stone-100', className: 'bg-stone-100', hex: '#F4F2EE' },
  { name: 'stone-200', className: 'bg-stone-200', hex: '#E8E5DF' },
  { name: 'stone-300', className: 'bg-stone-300', hex: '#D6D2CA' },
  { name: 'stone-500', className: 'bg-stone-500', hex: '#8A857C' },
  { name: 'muted', className: 'bg-muted', hex: '#5B6472' },
  { name: 'subtle', className: 'bg-subtle', hex: '#8A93A3' },
  { name: 'border', className: 'bg-border', hex: '#E4E6E3' },
  { name: 'border-strong', className: 'bg-border-strong', hex: '#CBD0CC' },
  { name: 'warning', className: 'bg-warning', hex: '#B7791F' },
  { name: 'danger', className: 'bg-danger', hex: '#C2410C' },
  { name: 'error', className: 'bg-error', hex: '#B42318' },
  { name: 'info', className: 'bg-info', hex: '#2563EB' },
]

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border py-10">
      <h2 className="hl-h3 mb-6">{title}</h2>
      {children}
    </section>
  )
}

export default function StyleguidePage() {
  const isAdmin = verifySessionToken(cookies().get(SESSION_COOKIE)?.value)
  if (IS_PRODUCTION && !isAdmin) notFound()

  return (
    <Container className="py-10">
      <SectionHeader as="h1" eyebrow="Design system" title="HagerLand style guide" description="Tokens and components from spec Section 5. Shown on previews and in development only." />

      <Block title="Colours">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {COLOURS.map((c) => (
            <li key={c.name} className="overflow-hidden rounded-lg border border-border">
              <div className={`h-16 ${c.className}`} />
              <div className="p-2 text-caption">
                <p className="font-semibold">{c.name}</p>
                <p className="text-muted">{c.hex}</p>
              </div>
            </li>
          ))}
        </ul>
      </Block>

      <Block title="Typography">
        <div className="space-y-4">
          <p className="hl-display">From the first brick to the front door.</p>
          <p className="hl-h1">Heading one — Apartments for sale in Bole</p>
          <p className="hl-h2">Heading two — Hire trusted professionals</p>
          <p className="hl-h3">Heading three — Key facts</p>
          <p className="text-body">Body text, 16px. Find homes and land, source construction materials, and hire trusted professionals across Ethiopia.</p>
          <p className="text-small text-muted">Small text, 14px, muted.</p>
          <p className="text-caption text-subtle">Caption, 12px, subtle.</p>
          <p className="font-ethiopic text-h3">ሀገር — ቤት፣ መሬት እና የግንባታ እቃዎች</p>
          <p className="font-display text-h2 font-bold tabular-nums">{formatETB(4500000)} · {formatArea(120)}</p>
          <p className="text-small text-muted">
            {formatDate('2026-10-12')} · Added {relativeTime(new Date(Date.now() - 3 * 86400000))} · {formatPhone('+251911234567')}
          </p>
        </div>
      </Block>

      <Block title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="gold">Gold</Button>
          <Button variant="danger">Danger</Button>
          <Button loading>Saving</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </div>
        <div className="mt-4 flex max-w-md gap-3 [&>*]:flex-1">
          <ButtonLink href="/property">Equal width</ButtonLink>
          <ButtonLink href="/supplies" variant="secondary">
            Paired buttons
          </ButtonLink>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 rounded-lg bg-ink p-4">
          <Button variant="inverse">Inverse</Button>
          <Button variant="outline-inverse">Outline inverse</Button>
        </div>
      </Block>

      <Block title="Badges, chips and tooltip">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>For sale</Badge>
          <Badge tone="green">New</Badge>
          <Badge tone="gold" icon={<BadgeCheck />}>Verified</Badge>
          <Badge tone="gold">HagerLand Development</Badge>
          <Badge tone="ink">Featured</Badge>
          <Badge tone="info">In review</Badge>
          <Badge tone="warning">Expiring soon</Badge>
          <Badge tone="danger">Rejected</Badge>
          <Badge tone="outline">Negotiable</Badge>
          <Tooltip content="Verified: HagerLand checked this business's trade licence on 12 Oct 2026.">
            <Badge tone="gold" icon={<BadgeCheck />}>Verified</Badge>
          </Tooltip>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <ChipLink href="/dev/styleguide" active>Architects</ChipLink>
          <ChipLink href="/dev/styleguide" icon={<Hammer />}>Contractors</ChipLink>
          <FilterChip label="2+ beds" removeHref="/dev/styleguide" />
          <FilterChip label="Bole" removeHref="/dev/styleguide" />
        </div>
      </Block>

      <Block title="Form controls">
        <div className="grid max-w-3xl gap-5 sm:grid-cols-2">
          <Field label="Full name" htmlFor="sg-name" required>
            <Input id="sg-name" placeholder="Abebe Kebede" />
          </Field>
          <Field label="Email" htmlFor="sg-email" optional hint="We only use it to reply.">
            <Input id="sg-email" type="email" />
          </Field>
          <Field label="Property type" htmlFor="sg-type">
            <Select id="sg-type" defaultValue="apartment">
              <option value="apartment">Apartment</option>
              <option value="house">House</option>
              <option value="land">Land</option>
            </Select>
          </Field>
          <Field label="Title" htmlFor="sg-err" error="Enter a title of at least 5 characters">
            <Input id="sg-err" invalid aria-describedby="sg-err-error" defaultValue="Flat" />
          </Field>
          <Field label="Message" htmlFor="sg-msg" className="sm:col-span-2">
            <Textarea id="sg-msg" placeholder="I'm interested in this property…" />
          </Field>
          <RangeInputs name="sg_price" label="Price" unit="ETB" />
          <div>
            <Checkbox id="sg-cb" label="Title deed available" description="Carta is ready to view" />
            <Radio id="sg-r1" name="sg-r" label="For sale" defaultChecked />
            <Radio id="sg-r2" name="sg-r" label="To rent" />
          </div>
        </div>
      </Block>

      <Block title="Interactive components">
        <StyleguideDemos />
      </Block>

      <Block title="Cards, stats, skeletons">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <Building2 className="size-6 text-green" aria-hidden />
            <p className="mt-3 font-semibold">Card</p>
            <p className="text-small text-muted">Rounded-lg, border and a soft shadow at rest.</p>
          </Card>
          <Stat label="New enquiries" value="12" hint="Last 7 days" />
          <div className="space-y-2 rounded-lg border border-border p-4">
            <Skeleton className="aspect-[4/3] w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </Block>

      <Block title="Empty state">
        <EmptyState
          icon={<Inbox />}
          title="No properties match these filters yet"
          description="Try widening your search, or tell us what you're looking for and we'll help."
          actions={
            <>
              <ButtonLink href="/property/for-sale">Clear filters</ButtonLink>
              <ButtonLink href="/contact" variant="secondary">
                Tell us what you need
              </ButtonLink>
            </>
          }
        />
      </Block>

      <Block title="Navigation helpers">
        <Breadcrumbs items={[{ label: 'Property', href: '/property' }, { label: 'For sale', href: '/property/for-sale' }, { label: 'Bole' }]} />
        <Pagination className="mt-6" page={3} totalPages={9} hrefFor={(p) => `/dev/styleguide?page=${p}`} />
        <div className="mt-6 max-w-2xl">
          <Accordion
            items={[
              { id: 'faq-1', title: 'When does my listing go live?', content: 'After a quick check by the HagerLand team. We email you as soon as it is live.' },
              { id: 'faq-2', title: 'How are businesses verified?', content: 'We check the trade licence and TIN certificate.' },
            ]}
          />
        </div>
        <p className="mt-6 flex items-center gap-1.5 text-small text-muted">
          <MapPin className="size-4" aria-hidden /> Icons: lucide-react, 1.75 stroke, 20px default.
        </p>
      </Block>
    </Container>
  )
}
