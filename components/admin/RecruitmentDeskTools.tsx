'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { addFeeEntryAction, cancelPlacementAction, confirmAdultAction, feeAgreementUploadAction, introduceAction, reverseFeeEntryAction, saveFeeTermsAction, setFeeStatusAction, withdrawConsentAction } from '@/app/roodber8/actions/jobs-desk'
import { CONSENT_METHODS, FEE_BASES, FEE_ENTRY_LABEL, FEE_METHODS, FEE_STATUS_LABEL } from '@/lib/jobs-desk'
import { CURRENCIES } from '@/lib/countries'
import { Button } from '@/components/ui/Button'
import { Checkbox, Field, Input, Select } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { PrivateUpload } from '@/components/admin/SupplyAgreements'

type Result = { ok: true; data: { message: string } } | { ok: false; error: string }

function useRun() {
  const [pending, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  return {
    pending,
    run: (fn: () => Promise<Result>, after?: () => void) =>
      start(async () => {
        const res = await fn()
        toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
        if (res.ok) {
          after?.()
          router.refresh()
        }
      }),
  }
}

/** Introduce the ticked people (each needs consent and 18+; the server and the database check again). */
export function IntroduceSelector({ assignmentId, people, deskOn }: { assignmentId: string; people: { id: string; label: string }[]; deskOn: boolean }) {
  const [picked, setPicked] = useState<string[]>([])
  const { pending, run } = useRun()
  if (people.length === 0) return <p className="text-small text-muted">Nobody is ready to introduce. A person needs recorded consent and a confirmed 18+ first.</p>
  return (
    <div className="space-y-2">
      {people.map((p) => (
        <Checkbox key={p.id} id={`intro-${p.id}`} label={p.label} checked={picked.includes(p.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, p.id] : picked.filter((x) => x !== p.id))} />
      ))}
      <p className="text-small text-muted">{deskOn ? 'The employer sees them on their request page and gets one email (no phone numbers or email addresses in it).' : 'The recruitment desk switch is off: this is recorded on the desk only. Nothing is shown or emailed to the employer.'}</p>
      <Button size="sm" disabled={pending || picked.length === 0} onClick={() => run(() => introduceAction(assignmentId, picked), () => setPicked([]))}>
        Introduce selected
      </Button>
    </div>
  )
}

/** Staff confirmed 18+ on the call (needed before an introduction). */
export function AdultConfirm({ candidateId }: { candidateId: string }) {
  const [method, setMethod] = useState('phone_call')
  const [sure, setSure] = useState(false)
  const { pending, run } = useRun()
  const id = `adult-${candidateId}`
  return (
    <div className="space-y-2 rounded-md bg-stone-50 p-3">
      <Field label="How did you confirm they are 18 or older?" htmlFor={`${id}-m`}>
        <Select id={`${id}-m`} value={method} onChange={(e) => setMethod(e.target.value)}>
          {CONSENT_METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
      </Field>
      <Checkbox id={`${id}-sure`} label="The person told me they are 18 or older" checked={sure} onChange={(e) => setSure(e.target.checked)} />
      <Button size="sm" variant="secondary" disabled={pending || !sure} onClick={() => run(() => confirmAdultAction(candidateId, method))}>
        Record 18 or older
      </Button>
    </div>
  )
}

/** Consent withdrawn: cannot be undone, so the button asks once more. */
export function WithdrawConsent({ candidateId, introduced }: { candidateId: string; introduced: boolean }) {
  const [sure, setSure] = useState(false)
  const { pending, run } = useRun()
  return (
    <div className="space-y-2">
      <Checkbox id={`wd-${candidateId}`} label={introduced ? 'The person changed their mind. Remove their details from the employer’s page now (this cannot be undone).' : 'The person changed their mind (this cannot be undone).'} checked={sure} onChange={(e) => setSure(e.target.checked)} />
      <Button size="sm" variant="secondary" disabled={pending || !sure} onClick={() => run(() => withdrawConsentAction(candidateId))}>
        Consent withdrawn
      </Button>
    </div>
  )
}

export function CancelPlacement({ placementId }: { placementId: string }) {
  const [reason, setReason] = useState('did_not_start')
  const [note, setNote] = useState('')
  const { pending, run } = useRun()
  return (
    <div className="grid gap-2 sm:grid-cols-[180px_1fr_auto] sm:items-end">
      <Field label="Cancel because" htmlFor={`pc-r-${placementId}`}>
        <Select id={`pc-r-${placementId}`} value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="did_not_start">Did not start</option>
          <option value="other">Other reason</option>
        </Select>
      </Field>
      <Field label="Note" htmlFor={`pc-n-${placementId}`} optional>
        <Input id={`pc-n-${placementId}`} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => cancelPlacementAction(placementId, reason, note))}>
        Cancel placement
      </Button>
    </div>
  )
}

export interface FeeTermsView {
  fee_type: string
  currency: string
  amount: string
  percent: string
  basis: string
  basis_note: string
  basis_amount: string
  agreed_in_writing_on: string
  status: string
  waived_reason: string | null
  notes: string
  documentUrl: string | null
  computedFee: string | null
}
export interface FeeEntryView {
  id: string
  type: string
  amount: string
  date: string
  method: string | null
  reference: string | null
  reason: string | null
  reversed: boolean
  canReverse: boolean
}

const NEXT: Record<string, { to: string; label: string }[]> = {
  draft: [{ to: 'agreed', label: 'Mark as agreed in writing' }],
  agreed: [{ to: 'invoiced', label: 'Mark as invoiced' }],
  invoiced: [{ to: 'paid', label: 'Mark as paid' }],
}

/** OWNER ONLY (the page renders it only for the owner; every action checks the owner again on the server). */
export function FeeTools({ placementId, terms, entries, totals }: { placementId: string; terms: FeeTermsView | null; entries: FeeEntryView[]; totals: { due: string; received: string; waived: string; outstanding: string } | null }) {
  const { pending, run } = useRun()
  const editable = !terms || terms.status === 'draft'
  const [v, setV] = useState({
    fee_type: terms?.fee_type ?? 'fixed',
    currency: terms?.currency ?? 'ETB',
    amount: terms?.amount ?? '',
    percent: terms?.percent ?? '',
    basis: terms?.basis ?? 'first_year_salary',
    basis_note: terms?.basis_note ?? '',
    basis_amount: terms?.basis_amount ?? '',
    agreed_in_writing_on: terms?.agreed_in_writing_on ?? '',
    notes: terms?.notes ?? '',
  })
  const [doc, setDoc] = useState<{ path: string; name: string } | null>(null)
  const [waive, setWaive] = useState('')
  const [entry, setEntry] = useState({ type: 'fee_due', amount: '', date: '', method: '', reference: '', reason: '', note: '' })
  const [reverseWhy, setReverseWhy] = useState<Record<string, string>>({})
  const id = (n: string) => `fee-${placementId}-${n}`
  return (
    <div className="space-y-4 rounded-md border border-gold bg-white p-3">
      <p className="text-small font-semibold">Fee (owner only)</p>
      {terms && (
        <p className="text-small">
          Status: <strong>{FEE_STATUS_LABEL[terms.status] ?? terms.status}</strong>
          {terms.waived_reason ? ` · ${terms.waived_reason}` : ''}
          {terms.computedFee ? ` · fee worked out: ${terms.computedFee}` : ''}
          {terms.documentUrl && (
            <>
              {' · '}
              <a href={terms.documentUrl} className="font-semibold text-green underline">
                Signed agreement (link works for 10 minutes)
              </a>
            </>
          )}
        </p>
      )}
      {editable && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Fee type" htmlFor={id('type')}>
            <Select id={id('type')} value={v.fee_type} onChange={(e) => setV({ ...v, fee_type: e.target.value })}>
              <option value="fixed">Fixed amount (trades, daily labour)</option>
              <option value="percentage">Percentage of pay (professionals)</option>
            </Select>
          </Field>
          <Field label="Currency" htmlFor={id('cur')}>
            <Select id={id('cur')} value={v.currency} onChange={(e) => setV({ ...v, currency: e.target.value })}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          {v.fee_type === 'fixed' ? (
            <Field label="Fixed fee" htmlFor={id('amount')}>
              <Input id={id('amount')} inputMode="decimal" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} />
            </Field>
          ) : (
            <>
              <Field label="Percentage" htmlFor={id('pct')}>
                <Input id={id('pct')} inputMode="decimal" value={v.percent} onChange={(e) => setV({ ...v, percent: e.target.value })} />
              </Field>
              <Field label="Based on" htmlFor={id('basis')}>
                <Select id={id('basis')} value={v.basis} onChange={(e) => setV({ ...v, basis: e.target.value })}>
                  {FEE_BASES.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </Select>
              </Field>
              {v.basis === 'other' && (
                <Field label="Based on what?" htmlFor={id('bnote')}>
                  <Input id={id('bnote')} maxLength={300} value={v.basis_note} onChange={(e) => setV({ ...v, basis_note: e.target.value })} />
                </Field>
              )}
              <Field label="Pay it is based on" htmlFor={id('bamount')} optional hint="Then the fee is worked out and shown.">
                <Input id={id('bamount')} inputMode="decimal" value={v.basis_amount} onChange={(e) => setV({ ...v, basis_amount: e.target.value })} />
              </Field>
            </>
          )}
          <Field label="Agreed in writing on" htmlFor={id('agreed')} optional hint="Needed before the terms can be marked as agreed.">
            <Input id={id('agreed')} type="date" value={v.agreed_in_writing_on} onChange={(e) => setV({ ...v, agreed_in_writing_on: e.target.value })} />
          </Field>
          <Field label="Notes" htmlFor={id('notes')} optional>
            <Input id={id('notes')} maxLength={1000} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <PrivateUpload label="Signed fee agreement (photo or PDF)" hint="Private: only the owner can open it." requestUpload={(type, size) => feeAgreementUploadAction(placementId, type, size)} onUploaded={setDoc} />
          </div>
          <div className="sm:col-span-2">
            <Button size="sm" disabled={pending} onClick={() => run(() => saveFeeTermsAction(placementId, { ...v, fee_type: v.fee_type as 'fixed' | 'percentage', currency: v.currency as (typeof CURRENCIES)[number], basis: v.fee_type === 'percentage' ? (v.basis as 'first_year_salary' | 'first_month_pay' | 'other') : undefined, document_path: doc?.path ?? '' }))}>
              Save fee terms
            </Button>
          </div>
        </div>
      )}
      {terms && terms.status !== 'paid' && terms.status !== 'waived' && (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          {(NEXT[terms.status] ?? []).map((n) => (
            <Button key={n.to} size="sm" variant="secondary" disabled={pending} onClick={() => run(() => setFeeStatusAction(placementId, n.to))}>
              {n.label}
            </Button>
          ))}
          <Field label="Waive because" htmlFor={id('waive')}>
            <Input id={id('waive')} maxLength={500} value={waive} onChange={(e) => setWaive(e.target.value)} />
          </Field>
          <Button size="sm" variant="ghost" disabled={pending || waive.trim().length < 3} onClick={() => run(() => setFeeStatusAction(placementId, 'waived', waive))}>
            Waive the fee
          </Button>
        </div>
      )}
      {terms && (
        <div className="space-y-2">
          <p className="text-small font-semibold">Fee record</p>
          {totals && (
            <p className="text-small">
              Due {totals.due} · received {totals.received} · waived {totals.waived} · <strong>still owed {totals.outstanding}</strong>
            </p>
          )}
          {entries.length === 0 ? (
            <p className="text-small text-muted">No entries yet. Add “Fee due” when the fee becomes due.</p>
          ) : (
            <ul className="space-y-2 text-small">
              {entries.map((e) => (
                <li key={e.id} className="rounded border border-border p-2">
                  <span className={e.reversed ? 'line-through' : ''}>
                    {FEE_ENTRY_LABEL[e.type] ?? e.type} · {e.amount} · {e.date}
                    {e.method ? ` · ${FEE_METHODS.find((m) => m.value === e.method)?.label ?? e.method}` : ''}
                    {e.reference ? ` · ${e.reference}` : ''}
                    {e.reason ? ` · ${e.reason}` : ''}
                  </span>
                  {e.canReverse && (
                    <span className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                      <Input aria-label="Why reverse it" placeholder="Why reverse it" className="h-10" value={reverseWhy[e.id] ?? ''} onChange={(ev) => setReverseWhy({ ...reverseWhy, [e.id]: ev.target.value })} />
                      <Button size="sm" variant="ghost" disabled={pending || (reverseWhy[e.id] ?? '').trim().length < 3} onClick={() => run(() => reverseFeeEntryAction(e.id, reverseWhy[e.id] ?? ''))}>
                        Reverse
                      </Button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-2 sm:grid-cols-3">
            <Field label="Entry" htmlFor={id('etype')}>
              <Select id={id('etype')} value={entry.type} onChange={(e) => setEntry({ ...entry, type: e.target.value })}>
                <option value="fee_due">Fee due</option>
                <option value="fee_received">Fee received</option>
                <option value="waived">Waived</option>
              </Select>
            </Field>
            <Field label="Amount" htmlFor={id('eamount')}>
              <Input id={id('eamount')} inputMode="decimal" value={entry.amount} onChange={(e) => setEntry({ ...entry, amount: e.target.value })} />
            </Field>
            <Field label="Date" htmlFor={id('edate')}>
              <Input id={id('edate')} type="date" value={entry.date} onChange={(e) => setEntry({ ...entry, date: e.target.value })} />
            </Field>
            {entry.type === 'fee_received' && (
              <Field label="Paid by" htmlFor={id('emethod')}>
                <Select id={id('emethod')} value={entry.method} onChange={(e) => setEntry({ ...entry, method: e.target.value })}>
                  <option value="">Choose</option>
                  {FEE_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <Field label="Reference" htmlFor={id('eref')} optional>
              <Input id={id('eref')} maxLength={120} value={entry.reference} onChange={(e) => setEntry({ ...entry, reference: e.target.value })} />
            </Field>
            {entry.type === 'waived' && (
              <Field label="Why waived" htmlFor={id('ereason')}>
                <Input id={id('ereason')} maxLength={500} value={entry.reason} onChange={(e) => setEntry({ ...entry, reason: e.target.value })} />
              </Field>
            )}
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={pending || !entry.amount || !entry.date}
            onClick={() => run(() => addFeeEntryAction(placementId, { ...entry, type: entry.type as 'fee_due' | 'fee_received' | 'waived' }), () => setEntry({ type: 'fee_due', amount: '', date: '', method: '', reference: '', reason: '', note: '' }))}
          >
            Add entry
          </Button>
        </div>
      )}
    </div>
  )
}
