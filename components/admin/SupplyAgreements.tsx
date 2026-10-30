'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { FileText } from 'lucide-react'
import { addAgreementAction, agreementUploadAction, setAgreementStatusAction } from '@/app/roodber8/actions/supply-agreements'
import { bpsToPercent, MODEL_LABEL } from '@/lib/supply/money'
import { formatDate } from '@/lib/format'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { FormAlert } from '@/components/forms/FormParts'
import { todayInAddis } from '@/lib/supply/shortlist'

type Result = { ok: true; data: { message: string } } | { ok: false; error: string }
type UploadResult = { ok: true; data: { path: string; signedUrl: string } } | { ok: false; error: string }

const TYPES: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif', pdf: 'application/pdf' }
export const PRIVATE_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.heic,.heif'

/** Phones sometimes leave the type of HEIC photos empty: take it from the file name. */
function fileType(file: File): string {
  return file.type || TYPES[file.name.split('.').pop()?.toLowerCase() ?? ''] || ''
}

/** Uploads one private file (photo or PDF, 10 MB) through a one-time link from the server. */
export function PrivateUpload({ label, hint, requestUpload, onUploaded }: { label: string; hint: string; requestUpload: (type: string, size: number) => Promise<UploadResult>; onUploaded: (file: { path: string; name: string }) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<{ busy: boolean; error: string; done: string }>({ busy: false, error: '', done: '' })
  async function upload(file: File) {
    setState({ busy: true, error: '', done: '' })
    const type = fileType(file)
    if (!TYPES[file.name.split('.').pop()?.toLowerCase() ?? ''] && !Object.values(TYPES).includes(type)) return setState({ busy: false, error: 'Upload a photo (JPEG, PNG, WebP or HEIC) or a PDF.', done: '' })
    if (file.size > 10 * 1024 * 1024) return setState({ busy: false, error: 'Files must be 10 MB or smaller.', done: '' })
    const link = await requestUpload(type, file.size)
    if (!link.ok) return setState({ busy: false, error: link.error, done: '' })
    const body = new FormData()
    body.append('cacheControl', '3600')
    body.append('', file)
    const res = await fetch(link.data.signedUrl, { method: 'PUT', body, headers: { 'x-upsert': 'false' } }).catch(() => null)
    if (!res?.ok) return setState({ busy: false, error: 'The upload failed. Check your connection and try again.', done: '' })
    onUploaded({ path: link.data.path, name: file.name })
    setState({ busy: false, error: '', done: file.name })
    if (input.current) input.current.value = ''
  }
  const id = `pu-${label.replace(/[^a-z]/gi, '').toLowerCase()}`
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-small font-semibold">
        {label}
      </label>
      <input
        ref={input}
        id={id}
        type="file"
        accept={PRIVATE_ACCEPT}
        disabled={state.busy}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void upload(file)
        }}
        className="block w-full text-small file:mr-3 file:min-h-11 file:rounded-md file:border-0 file:bg-stone-100 file:px-4 file:font-semibold"
      />
      <p className="text-caption text-muted">{state.busy ? 'Uploading…' : state.done ? `Uploaded: ${state.done}` : hint}</p>
      {state.error && <p className="text-small font-semibold text-error">{state.error}</p>}
    </div>
  )
}

export interface AgreementView {
  id: string
  moneyModel: string
  commissionBps: number | null
  paymentTerms: string | null
  creditDays: number | null
  startDate: string
  endDate: string | null
  status: string
  terminatedReason: string | null
  notes: string | null
  documentUrl: string | null
  createdAt: string
}

const STATUS_TONE: Record<string, 'neutral' | 'green' | 'warning' | 'danger'> = { draft: 'neutral', active: 'green', expired: 'warning', terminated: 'danger' }

/** The partner's signed agreements: the active one, drafts and history. Owner only (decided on the server). */
export function AgreementsPanel({ orgId, agreements }: { orgId: string; agreements: AgreementView[] }) {
  const [adding, setAdding] = useState(false)
  const [v, setV] = useState({ money_model: '', commission: '', payment_terms: '', credit_days: '', start_date: todayInAddis(), end_date: '', status: 'active', notes: '' })
  const [doc, setDoc] = useState<{ path: string; name: string } | null>(null)
  const [error, setError] = useState('')
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  const run = (fn: () => Promise<Result>, after?: () => void) =>
    start(async () => {
      setError('')
      const res = await fn()
      if (res.ok) {
        toast(res.data.message, 'success')
        after?.()
        router.refresh()
      } else setError(res.error)
    })
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value })
  const active = agreements.find((a) => a.status === 'active')

  return (
    <div className="space-y-4">
      <p className="text-small text-muted">Owner only. Type in the terms from the signed agreement and attach the signed copy.</p>
      {error && <FormAlert>{error}</FormAlert>}
      {!active && <p className="text-small font-semibold text-error">No active agreement. Orders need “Proceed without an agreement” until one is added.</p>}
      {agreements.length > 0 && (
        <ul className="space-y-2">
          {agreements.map((a) => (
            <li key={a.id} className="rounded-md border border-border p-3 text-small">
              <p className="flex flex-wrap items-center gap-2">
                <Badge tone={STATUS_TONE[a.status] ?? 'neutral'}>{a.status}</Badge>
                <span className="font-semibold">{MODEL_LABEL[a.moneyModel as 'A' | 'B' | 'both']}</span>
                {a.commissionBps !== null && <span>Commission {bpsToPercent(a.commissionBps)}</span>}
              </p>
              <p className="text-muted">
                From {formatDate(a.startDate)}
                {a.endDate ? ` to ${formatDate(a.endDate)}` : ', no end date'}
                {a.creditDays !== null ? ` · ${a.creditDays} days’ credit` : ''}
              </p>
              {a.paymentTerms && <p>Payment terms: {a.paymentTerms}</p>}
              {a.notes && <p className="text-muted">{a.notes}</p>}
              {a.terminatedReason && <p className="text-error">Terminated: {a.terminatedReason}</p>}
              {a.documentUrl && (
                <a href={a.documentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1 font-semibold text-green underline">
                  <FileText className="size-4" aria-hidden /> Signed agreement
                </a>
              )}
              <div className="mt-1 flex flex-wrap gap-3">
                {a.status === 'draft' && (
                  <button type="button" className="min-h-9 font-semibold text-green" disabled={pending} onClick={() => run(() => setAgreementStatusAction(orgId, a.id, 'active'))}>
                    Make active
                  </button>
                )}
                {a.status === 'active' && (
                  <button type="button" className="min-h-9 font-semibold text-green" disabled={pending} onClick={() => window.confirm('Mark this agreement as expired?') && run(() => setAgreementStatusAction(orgId, a.id, 'expired'))}>
                    Mark expired
                  </button>
                )}
                {['draft', 'active'].includes(a.status) && (
                  <button
                    type="button"
                    className="min-h-9 font-semibold text-error"
                    disabled={pending}
                    onClick={() => {
                      const reason = window.prompt('Why is the agreement being terminated?')
                      if (reason) run(() => setAgreementStatusAction(orgId, a.id, 'terminated', reason))
                    }}
                  >
                    Terminate
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {adding ? (
        <div role="group" aria-label="Add agreement" className="space-y-3 rounded-md border border-border p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Money model" htmlFor="ag-model" required>
              <Select id="ag-model" value={v.money_model} onChange={set('money_model')}>
                <option value="">Choose…</option>
                <option value="A">{MODEL_LABEL.A}</option>
                <option value="B">{MODEL_LABEL.B}</option>
                <option value="both">{MODEL_LABEL.both}</option>
              </Select>
            </Field>
            {v.money_model && v.money_model !== 'A' && (
              <Field label="Commission rate %" htmlFor="ag-commission" required>
                <Input id="ag-commission" value={v.commission} onChange={set('commission')} inputMode="decimal" placeholder="e.g. 5" />
              </Field>
            )}
            <Field label="Start date" htmlFor="ag-start" required>
              <Input id="ag-start" type="date" value={v.start_date} onChange={set('start_date')} />
            </Field>
            <Field label="End date" htmlFor="ag-end" hint="Leave empty if it has none">
              <Input id="ag-end" type="date" value={v.end_date} onChange={set('end_date')} />
            </Field>
            <Field label="Payment terms" htmlFor="ag-terms" className="sm:col-span-2">
              <Input id="ag-terms" value={v.payment_terms} onChange={set('payment_terms')} maxLength={1000} placeholder="e.g. Bank transfer within 7 days of delivery" />
            </Field>
            <Field label="Credit days" htmlFor="ag-credit">
              <Input id="ag-credit" value={v.credit_days} onChange={set('credit_days')} inputMode="numeric" />
            </Field>
            <Field label="Save as" htmlFor="ag-status">
              <Select id="ag-status" value={v.status} onChange={set('status')}>
                <option value="active">Active (signed and in force)</option>
                <option value="draft">Draft (not signed yet)</option>
              </Select>
            </Field>
            <Field label="Notes" htmlFor="ag-notes" className="sm:col-span-2">
              <Textarea id="ag-notes" rows={2} value={v.notes} onChange={set('notes')} maxLength={2000} />
            </Field>
          </div>
          <PrivateUpload label="Signed agreement (photo or PDF)" hint="Private: only the owner can open it." requestUpload={(type, size) => agreementUploadAction(orgId, type, size)} onUploaded={setDoc} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" disabled={pending || !v.money_model} onClick={() => run(() => addAgreementAction(orgId, { ...v, status: v.status as 'active' | 'draft', money_model: v.money_model as 'A' | 'B' | 'both', document_path: doc?.path ?? '' }), () => setAdding(false))}>
              Save agreement
            </Button>
            <Button className="flex-1" variant="secondary" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
          Add agreement
        </Button>
      )}
    </div>
  )
}
