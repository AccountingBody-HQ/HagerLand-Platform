import { Factory, Ship, Store, type LucideIcon } from 'lucide-react'
import { Container } from '@/components/ui/Layout'
import { ButtonLink } from '@/components/ui/Button'
import { REGISTER_PATH } from '@/lib/supply/partner-rules'

type T = (s: string) => string

const CARDS: { key: string; icon: LucideIcon; title: string; line: string; actions: { label: string; href: string }[] }[] = [
  {
    key: 'manufacturers',
    icon: Factory,
    title: 'Manufacturers',
    line: 'Make building products? Register with HagerLand Supply, and we will talk to you about offering them to our customers.',
    actions: [
      { label: 'Register as a manufacturer', href: `${REGISTER_PATH}?role=manufacturer` },
      { label: 'How it works', href: `${REGISTER_PATH}#how-it-works` },
    ],
  },
  {
    key: 'importers',
    icon: Ship,
    title: 'Importers',
    line: 'Import building materials into Ethiopia? Register your business, and we will talk to you about supplying our customers.',
    actions: [
      { label: 'Register as an importer', href: `${REGISTER_PATH}?role=importer` },
      { label: 'How it works', href: `${REGISTER_PATH}#how-it-works` },
    ],
  },
  {
    key: 'suppliers',
    icon: Store,
    title: 'Suppliers & shops',
    line: 'Supply products through HagerLand Supply, or buy from us at trade prices. You can do both.',
    actions: [
      { label: 'Register as a supplier', href: `${REGISTER_PATH}?role=supplier` },
      { label: 'Open a trade account', href: '/supplies/trade' },
    ],
  },
]

/**
 * S6-1 homepage row 2, "Sell through HagerLand" (AB's approved text), in the "Start here" card style. Shown only while
 * the owner's home_business_row and partner registration switches are both on; row 1 is unchanged.
 */
export function BusinessRow({ t, lh }: { t: T; lh: (h: string) => string }) {
  return (
    <section aria-labelledby="business-title" className="bg-white pt-12 sm:pt-16">
      <Container>
        <h2 id="business-title" className="hl-h2">
          {t('Sell through HagerLand')}
        </h2>
        <p className="mt-3 max-w-3xl text-[1.0625rem] text-muted">{t('Reach builders, homeowners and contractors across Ethiopia through HagerLand Supply.')}</p>
        <ul className="mt-8 grid gap-4 sm:mt-10 md:grid-cols-3">
          {CARDS.map((card) => (
            <li key={card.key} className="flex flex-col rounded-xl border border-green/15 bg-green-tint p-6 sm:p-8">
              <span className="flex size-14 items-center justify-center rounded-xl bg-white text-green">
                <card.icon className="size-7" aria-hidden />
              </span>
              <h3 className="mt-6 font-display text-h3 font-bold text-ink lg:text-h3-lg">{t(card.title)}</h3>
              <p className="mt-2 flex-1 text-muted">{t(card.line)}</p>
              <div className="mt-6 flex flex-col gap-3">
                {card.actions.map((a, i) => (
                  <ButtonLink key={a.label} href={lh(a.href)} variant={i === 0 ? 'primary' : 'secondary'}>
                    {t(a.label)}
                  </ButtonLink>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
