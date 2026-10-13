'use client'

import { CsvImport } from '@/components/admin/CsvImport'
import { applyPriceCsvAction, previewPriceCsvAction } from '../../actions/products'
import { formatETBCents } from '@/lib/format'

export function PriceImport() {
  return (
    <CsvImport
      preview={previewPriceCsvAction}
      run={(csv) => applyPriceCsvAction(csv)}
      columns={['sku', 'price', 'stock_status']}
      renderRow={(r) => (
        <span>
          <span className="font-mono">{r.sku}</span> {r.productName && <>· {r.productName}</>}
          {r.priceCents !== null && <> · {formatETBCents(r.priceCents)}</>}
          {r.stock && <> · {r.stock.replace(/_/g, ' ')}</>}
        </span>
      )}
    />
  )
}
