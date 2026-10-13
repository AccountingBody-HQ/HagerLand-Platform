'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { FileText } from 'lucide-react'
import { issueQuoteAction, saveQuoteInternalAction, setEnquiryStatusAction, setQuoteStatusAction } from '@/app/roodber8/actions/leads'
import { Button } from '@/components/ui/Button'
import { Field, Input, Select, Textarea } from '@/components/ui/Field'
import { FileDrop, type UploadedDoc } from '@/components/media/FileDrop'
import { useToast } from '@/components/ui/Toast'

type Result = { ok: true; data: { message: string } } | { ok: false; error: string }

function useRun() {
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  const run = (fn: () => Promise<Result>, after?: () => void) =>
    start(async () => {
      const res = await fn()
      toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
      if (res.ok) {
        after?.()
        router.refresh()
      }
    })
  return { pending, run }
}

const ENQUIRY = ['new', 'contacted', 'qualified', 'won', 'lost', 'spam']
const QUOTE = ['submitted', 'in_review', 'quoted', 'accepted', 'declined', 'expired', 'cancelled']

export function LeadStatusTool({ kind, id, status }: { kind: 'enquiry' | 'quote'; id: string; status: string }) {
  const { pending, run } = useRun()
  const [value, setValue] = useState(status)
  return (
    <div className="flex flex-wrap gap-2">
      <Select aria-label="Status" value={value} onChange={(e) => setValue(e.target.value)} className="h-10 w-48">
        {(kind === 'enquiry' ? ENQUIRY : QUOTE).map((s) => (
          <option key={s} value={s}>
            {s.replace('_', ' ')}
          </option>
        ))}
      </Select>
      <Button size="sm" variant="secondary" disabled={pending || value === status} onClick={() => run(() => (kind === 'enquiry' ? setEnquiryStatusAction(id, value) : setQuoteStatusAction(id, value)))}>
        Set status
      </Button>
    </div>
  )
}

export function QuoteInternalTool({ id, assignedTo, notes }: { id: string; assignedTo: string | null; notes: string | null }) {
  const { pending, run } = useRun()
  const [assigned, setAssigned] = useState(assignedTo ?? '')
  const [text, setText] = useState(notes ?? '')
  return (
    <div className="space-y-3">
      <Field label="Assigned to" htmlFor="q-assigned" optional>
        <Input id="q-assigned" value={assigned} onChange={(e) => setAssigned(e.target.value)} placeholder="Name of the person handling it" />
      </Field>
      <Field label="Internal notes" htmlFor="q-notes" optional hint="Never shown to the customer.">
        <Textarea id="q-notes" value={text} onChange={(e) => setText(e.target.value)} rows={4} />
      </Field>
      <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => saveQuoteInternalAction(id, { assigned_to: assigned, internal_notes: text }))}>
        Save
      </Button>
    </div>
  )
}

export function IssueQuoteTool({ id, hasEmail, currentTotalEtb, hasDocument }: { id: string; hasEmail: boolean; currentTotalEtb: string; hasDocument: boolean }) {
  const { pending, run } = useRun()
  const [total, setTotal] = useState(currentTotalEtb)
  const [doc, setDoc] = useState<UploadedDoc | null>(null)
  const [notify, setNotify] = useState(hasEmail)
  return (
    <div className="space-y-3">
      <Field label="Quote total (ETB, including VAT)" htmlFor="q-total" required>
        <Input id="q-total" inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="e.g. 125000" />
      </Field>
      {doc ? (
        <p className="flex items-center gap-2 rounded-md bg-green-soft p-2 text-small">
          <FileText className="size-4" aria-hidden /> {doc.name} uploaded
          <button type="button" className="ml-auto font-semibold text-green underline" onClick={() => setDoc(null)}>
            Replace
          </button>
        </p>
      ) : (
        <FileDrop target={{ purpose: 'private', area: 'quote', id }} accept="application/pdf" multiple={false} maxFiles={1} label={hasDocument ? 'Replace the quote PDF' : 'Upload the quote PDF'} hint="Optional. PDF up to 15 MB." onDocUploaded={setDoc} />
      )}
      <label className="flex min-h-11 items-center gap-2 text-small">
        <input type="checkbox" checked={notify} disabled={!hasEmail} onChange={(e) => setNotify(e.target.checked)} className="size-5 accent-green" />
        {hasEmail ? 'Email the customer that their quote is ready' : 'No email address: call the customer'}
      </label>
      <Button disabled={pending || !total} fullWidth onClick={() => run(() => issueQuoteAction({ id, total_etb: total, document_path: doc?.path ?? null, notify }), () => setDoc(null))}>
        Issue quote
      </Button>
    </div>
  )
}
