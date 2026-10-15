'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { FormAlert } from '@/components/forms/FormParts'

type Result<T> = { ok: true; data: T } | { ok: false; error: string }

/** Choose a CSV, preview validation results, then import. */
export function CsvImport<Row extends { errors: string[]; duplicate?: boolean; line: number }>({
  preview,
  run,
  columns,
  publishLabel,
  renderRow,
}: {
  preview: (csv: string) => Promise<Result<{ rows: Row[] }>>
  run: (csv: string, publish: boolean) => Promise<Result<{ message: string }>>
  columns: readonly string[]
  publishLabel?: string
  renderRow: (row: Row) => React.ReactNode
}) {
  const [csv, setCsv] = useState('')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [publish, setPublish] = useState(false)
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  const okRows = rows?.filter((r) => r.errors.length === 0 && !r.duplicate) ?? []

  return (
    <div className="space-y-4">
      <p className="text-small text-muted">
        Columns (header row, any order): <code className="rounded bg-stone-100 px-1">{columns.join(', ')}</code>
      </p>
      <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border-strong bg-white px-4 font-semibold hover:bg-stone-50">
        <Upload className="size-4" aria-hidden /> Choose CSV file
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            const text = await file.text()
            setCsv(text)
            setError(null)
            start(async () => {
              const res = await preview(text)
              if (res.ok) setRows(res.data.rows)
              else {
                setRows(null)
                setError(res.error)
              }
            })
          }}
        />
      </label>
      {error && <FormAlert>{error}</FormAlert>}
      {rows && (
        <>
          <p className="text-small">
            {rows.length} rows · <strong>{okRows.length} ready</strong> · {rows.filter((r) => r.duplicate).length} duplicates skipped · {rows.filter((r) => r.errors.length).length} with errors
          </p>
          <div className="max-h-[420px] overflow-auto rounded-lg border border-border bg-white">
            <table className="w-full text-left text-small">
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.line} className={r.errors.length ? 'bg-error/5' : r.duplicate ? 'bg-warning/5' : ''}>
                    <td className="w-12 px-3 py-2 text-muted">{r.line}</td>
                    <td className="px-3 py-2">{renderRow(r)}</td>
                    <td className="px-3 py-2 text-caption">{r.errors.length ? <span className="text-error">{r.errors.join('; ')}</span> : r.duplicate ? <span className="text-warning-dark">Duplicate, will be skipped</span> : <span className="text-green">Ready</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {publishLabel && <Checkbox id="csv-publish" label={publishLabel} checked={publish} onChange={(e) => setPublish(e.target.checked)} />}
          <Button
            disabled={pending || okRows.length === 0}
            loading={pending}
            onClick={() =>
              start(async () => {
                const res = await run(csv, publish)
                toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
                if (res.ok) {
                  setRows(null)
                  router.refresh()
                }
              })
            }
          >
            Import {okRows.length} row{okRows.length === 1 ? '' : 's'}
          </Button>
        </>
      )}
    </div>
  )
}
