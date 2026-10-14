import Link from 'next/link'
import { ArrowRight, ClipboardList, FileText, Truck } from 'lucide-react'
import { getProductCategories } from '@/lib/data/reference'
import { getSpecialBuys, searchProducts } from '@/lib/data/products'
import { SpecialBuyCard } from '@/components/supplies/SpecialBuyCard'
import { TradeAccountNote } from '@/components/supplies/TradeAccountNote'
import { buildMetadata } from '@/lib/seo'
import { brand } from '@/lib/brand'
import { Container, Section, SectionHeader } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { DynamicIcon } from '@/components/ui/DynamicIcon'
import { ProductCard } from '@/components/supplies/ProductCard'
import { QuoteListLink } from '@/components/supplies/QuoteListLink'
import { EnquiryForm } from '@/components/enquiry/EnquiryForm'

export const revalidate = 300

export const metadata = buildMetadata({
  title: 'Construction materials, quoted fast',
  description: 'Cement, steel, roofing, plumbing, electrical, tiles and more. Send your materials list to HagerLand Supply and get one clear price with delivery.',
  path: '/supplies',
})

export default async function SuppliesHub() {
  const [categories, featured, specials] = await Promise.all([getProductCategories(), searchProducts({ sort: 'popular', pageSize: 8 }), getSpecialBuys(4)])
  return (
    <>
      <section className="hl-blueprint bg-ink text-white">
        <Container className="py-12 sm:py-16">
          <Breadcrumbs inverse items={[{ label: 'Supplies' }]} />
          <p className="hl-eyebrow mt-8 text-gold">{brand.divisions.supply}</p>
          <h1 className="hl-display mt-3 max-w-3xl text-white">Construction materials, quoted fast.</h1>
          <p className="mt-5 max-w-2xl text-[1.0625rem] text-white/80">Tell us what you need — from a box of screws to a full bill of quantities. We&apos;ll come back with a clear price and delivery.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row [&>*]:sm:min-w-56">
            <ButtonLink href="/supplies/materials-list" size="lg">
              Send your materials list
            </ButtonLink>
            <ButtonLink href="#categories" variant="outline-inverse" size="lg">
              Browse categories
            </ButtonLink>
          </div>
        </Container>
      </section>

      {specials.length > 0 && (
        <Section tone="stone">
          <SectionHeader
            title="Special Buys"
            description="Surplus and clearance stock, for a limited time."
            action={
              <Link href="/supplies/special-buys" className="text-small font-semibold text-green hover:underline">
                See all Special Buys
              </Link>
            }
          />
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {specials.map((s) => (
              <li key={s.id}>
                <SpecialBuyCard item={s} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section id="categories">
        <SectionHeader title="Shop by category" action={<QuoteListLink />} />
        <div className="-mt-2 mb-5">
          <TradeAccountNote />
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((c) => (
            <li key={c.id} className="rounded-lg border border-border bg-white p-5">
              <Link href={`/supplies/${c.slug}`} className="flex items-center gap-3 font-display text-h3 font-bold text-ink hover:text-green">
                <span className="flex size-10 items-center justify-center rounded-md bg-green-soft text-green">
                  <DynamicIcon name={c.icon} className="size-5" />
                </span>
                {c.name}
              </Link>
              <ul className="mt-3 space-y-0.5">
                {c.children.slice(0, 5).map((s) => (
                  <li key={s.id}>
                    <Link href={`/supplies/${c.slug}/${s.slug}`} className="flex min-h-9 items-center text-small text-muted hover:text-ink">
                      {s.name}
                    </Link>
                  </li>
                ))}
                {c.children.length > 5 && (
                  <li>
                    <Link href={`/supplies/${c.slug}`} className="flex min-h-9 items-center text-small font-semibold text-green">
                      All {c.name.toLowerCase()}
                    </Link>
                  </li>
                )}
              </ul>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="stone">
        <SectionHeader title="How it works" />
        <ol className="grid gap-4 md:grid-cols-3">
          {[
            { icon: FileText, title: 'Send your list', text: 'Add products to your quote list, upload a bill of quantities, or simply type what you need.' },
            { icon: ClipboardList, title: 'Get a clear quote', text: 'We check prices and availability and send you one quote, including delivery.' },
            { icon: Truck, title: 'Delivered to site', text: 'You confirm, and we arrange payment and delivery directly with you.' },
          ].map((s, i) => (
            <li key={s.title} className="rounded-lg border border-border bg-white p-6">
              <span className="flex size-10 items-center justify-center rounded-full bg-green-soft font-display font-bold text-green">{i + 1}</span>
              <h3 className="hl-h3 mt-4 flex items-center gap-2">
                <s.icon className="size-5 text-green" aria-hidden /> {s.title}
              </h3>
              <p className="mt-2 text-muted">{s.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      {featured.items.length > 0 && (
        <Section>
          <SectionHeader title="Popular items" />
          <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {featured.items.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section tone={featured.items.length > 0 ? 'stone' : 'white'}>
        <div className="grid gap-8 lg:grid-cols-[1fr_480px]">
          <div>
            <h2 className="hl-h2">Buying for a project?</h2>
            <p className="mt-3 max-w-lg text-muted">Talk to our trade team about larger orders, scheduled deliveries and materials for a whole build.</p>
          </div>
          <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
            <EnquiryForm
              target={{ type: 'general', recipientLabel: brand.divisions.supply }}
              topic="Trade enquiry"
              intents={[{ value: 'quote', label: 'Trade enquiry', message: "I'm buying materials for a project and would like to talk to your trade team about:" }]}
              submitLabel="Talk to our trade team"
              idPrefix="trade"
            />
          </div>
        </div>
      </Section>

      <Section compact>
        <div className="grid gap-4 md:grid-cols-2">
          <Link href="/suppliers" className="group flex items-center justify-between rounded-xl border border-border bg-white p-6 hover:border-green">
            <div>
              <h2 className="hl-h3">Find suppliers</h2>
              <p className="mt-1 text-muted">Merchants and manufacturers across Ethiopia.</p>
            </div>
            <ArrowRight className="size-5 text-green transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
          <Link href="/list-with-us#suppliers" className="group flex items-center justify-between rounded-xl bg-green-darker p-6 text-white">
            <div>
              <h2 className="hl-h3 text-white">Become a supplier</h2>
              <p className="mt-1 text-white/80">Reach builders, contractors and homeowners.</p>
            </div>
            <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" aria-hidden />
          </Link>
        </div>
      </Section>
    </>
  )
}
