'use client'

import { useActionState, useState } from 'react'
import { FileCheck2 } from 'lucide-react'
import { submitVerificationAction } from '@/app/(account)/account/company/verification/actions'
import { FileDrop } from '@/components/media/FileDrop'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'
import { track } from '@/lib/analytics'
import { NoResetForm } from '@/components/forms/NoResetForm'

interface DocSlot {
  key: 'trade_licence' | 'tin_certificate' | 'contractor_licence' | 'agent_licence'
  label: string
  required: boolean
}

export function VerificationForm({ orgId, kind }: { orgId: string; kind: string }) {
  const [state, action] = useActionState(async (prev: Awaited<ReturnType<typeof submitVerificationAction>> | null, fd: FormData) => {
    const res = await submitVerificationAction(prev, fd)
    if (res.ok) track('verification_submitted', { kind })
    return res
  }, null)
  const [docs, setDocs] = useState<Record<string, { path: string; name: string }>>({})
  const slots: DocSlot[] = [
    { key: 'trade_licence', label: 'Trade licence', required: true },
    { key: 'tin_certificate', label: 'TIN certificate', required: true },
    ...(['contractor', 'professional_firm', 'sole_trader'].includes(kind) ? [{ key: 'contractor_licence' as const, label: 'Contractor / professional licence (category and grade)', required: false }] : []),
    ...(kind === 'agency' ? [{ key: 'agent_licence' as const, label: 'Broker or agent licence', required: false }] : []),
  ]
  if (state?.ok) return <FormAlert tone="success">{state.message}</FormAlert>
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  return (
    <NoResetForm action={action} className="space-y-6">
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      {slots.map((s) => (
        <div key={s.key}>
          <p className="mb-2 font-semibold">
            {s.label} {s.required ? <span className="text-error">*</span> : <span className="font-normal text-muted">(optional)</span>}
          </p>
          <input type="hidden" name={s.key} value={docs[s.key]?.path ?? ''} />
          {docs[s.key] ? (
            <p className="flex min-h-11 items-center gap-2 rounded-md bg-green-tint px-3 text-small">
              <FileCheck2 className="size-4 text-green" aria-hidden /> {docs[s.key].name}
              <button type="button" className="ml-auto font-semibold text-green underline" onClick={() => setDocs((all) => Object.fromEntries(Object.entries(all).filter(([k]) => k !== s.key)))}>
                Replace
              </button>
            </p>
          ) : (
            <FileDrop
              target={{ purpose: 'private', area: 'verification', id: orgId }}
              accept="application/pdf,image/jpeg,image/png"
              multiple={false}
              label={`Upload ${s.label.toLowerCase()}`}
              hint="Clear photo or PDF, up to 15 MB"
              onDocUploaded={(d) => setDocs((all) => ({ ...all, [s.key]: { path: d.path, name: d.name } }))}
            />
          )}
          {errors[s.key] && <p className="mt-1 text-small text-error">{errors[s.key]}</p>}
        </div>
      ))}
      <p className="text-small text-muted">Documents are stored privately and seen only by the HagerLand team. We delete them 90 days after our decision.</p>
      <SubmitButton size="lg" pendingText="Submitting…">
        Submit for verification
      </SubmitButton>
    </NoResetForm>
  )
}
