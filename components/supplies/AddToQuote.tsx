'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ClipboardPlus } from 'lucide-react'
import { useQuoteList } from './quoteStore'
import { QuantityStepper } from './QuantityStepper'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

interface Props {
  product: { id: string; slug: string; name: string; unit: string; imagePath: string | null; minOrder: number }
  withQuantity?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function AddToQuote({ product, withQuantity, size = 'md' }: Props) {
  const { add } = useQuoteList()
  const [qty, setQty] = useState(product.minOrder || 1)
  const [added, setAdded] = useState(false)
  const toast = useToast()
  return (
    <div className="flex flex-col gap-3">
      {withQuantity && <QuantityStepper id={`qty-${product.id}`} value={qty} onChange={setQty} unit={product.unit} min={product.minOrder || 1} />}
      <Button
        size={size}
        fullWidth
        onClick={() => {
          add({ productId: product.id, slug: product.slug, name: product.name, unit: product.unit, quantity: withQuantity ? qty : product.minOrder || 1, imagePath: product.imagePath })
          setAdded(true)
          toast(`${product.name} added to your quote list.`)
        }}
      >
        <ClipboardPlus /> Add to quote
      </Button>
      {added && (
        <Link href="/supplies/quote" className="text-center text-small font-semibold text-green hover:underline">
          View quote list
        </Link>
      )}
    </div>
  )
}
