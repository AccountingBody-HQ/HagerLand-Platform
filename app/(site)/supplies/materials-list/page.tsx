import { buildMetadata } from '@/lib/seo'
import { brand } from '@/lib/brand'
import { Container } from '@/components/ui/Layout'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { MaterialsListForm } from '@/components/supplies/MaterialsListForm'

export const metadata = buildMetadata({
  title: 'Send your materials list for a quote',
  description: 'Upload a materials list or bill of quantities, or type what you need. HagerLand Supply replies with one clear price and delivery details.',
  path: '/supplies/materials-list',
})

export default function MaterialsListPage() {
  return (
    <Container className="py-6 lg:py-10">
      <Breadcrumbs items={[{ label: 'Supplies', href: '/supplies' }, { label: 'Send your materials list' }]} />
      <div className="mt-4 grid gap-10 lg:grid-cols-[1fr_520px]">
        <div>
          <h1 className="hl-h1">Send us your materials list</h1>
          <p className="mt-3 max-w-xl text-muted">From a box of screws to a full bill of quantities. Upload your list, a photo of it, or type it in. {brand.divisions.supply} replies with a clear price and delivery details.</p>
          <ol className="mt-8 space-y-4">
            {['Send your list', 'Get a clear quote', 'Delivered to site'].map((s, i) => (
              <li key={s} className="flex items-center gap-4">
                <span className="flex size-10 items-center justify-center rounded-full bg-green-soft font-display font-bold text-green">{i + 1}</span>
                <span className="font-semibold">{s}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6">
          <MaterialsListForm />
        </div>
      </div>
    </Container>
  )
}
