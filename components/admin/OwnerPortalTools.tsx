'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { addManagedDocumentAction } from '@/app/roodber8/actions/owner-portal'
import { FileDrop } from '@/components/media/FileDrop'
import { Field, Input } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'

/** Upload a private document for a managed property, shared with the owner or kept staff-only. */
export function ManagedDocumentUpload({ id }: { id: string }) {
  const [label, setLabel] = useState('')
  const [visible, setVisible] = useState(true)
  const [, start] = useTransition()
  const toast = useToast()
  const router = useRouter()
  return (
    <div className="space-y-3">
      <Field label="Document name" htmlFor={`md-label-${id}`} hint="For example: Tenancy agreement 2026">
        <Input id={`md-label-${id}`} value={label} maxLength={160} onChange={(e) => setLabel(e.target.value)} />
      </Field>
      <label className="flex min-h-11 items-center gap-2 text-small">
        <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} className="size-5 accent-green" /> Show it to the owner in the owner portal
      </label>
      <FileDrop
        target={{ purpose: 'private', area: 'agency', id }}
        accept="application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        maxFiles={1}
        disabled={label.trim().length < 2}
        label="Upload a document"
        onDocUploaded={(d) =>
          start(async () => {
            const res = await addManagedDocumentAction(id, d.path, label.trim(), visible)
            toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
            if (res.ok) router.refresh()
          })
        }
      />
    </div>
  )
}
