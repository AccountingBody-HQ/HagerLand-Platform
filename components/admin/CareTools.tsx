'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { FileCheck2 } from 'lucide-react'
import { createManagedFromRequestAction, updateCareRequestAction } from '@/app/roodber8/actions/property-care'
import { Button } from '@/components/ui/Button'
import { Field, Select, Textarea } from '@/components/ui/Field'
import { FileDrop, type UploadedDoc } from '@/components/media/FileDrop'
import { useToast } from '@/components/ui/Toast'
import { CARE_STATUSES, CARE_STATUS_LABEL } from '@/lib/property-care'

export function CareRequestTool({ id, status, notes }: { id: string; status: string; notes: string | null }) {
  const [pending, start] = useTransition()
  const [s, setS] = useState(status)
  const [n, setN] = useState(notes ?? '')
  const toast = useToast()
  const router = useRouter()
  return (
    <div className="space-y-3">
      <Field label="Stage" htmlFor="care-status">
        <Select id="care-status" value={s} onChange={(e) => setS(e.target.value)} className="h-10">
          {CARE_STATUSES.map((x) => (
            <option key={x} value={x}>
              {CARE_STATUS_LABEL[x]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Private notes" htmlFor="care-notes">
        <Textarea id="care-notes" rows={4} value={n} maxLength={4000} onChange={(e) => setN(e.target.value)} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await updateCareRequestAction(id, { status: s, admin_notes: n })
              toast(res.ok ? res.data.message : res.error, res.ok ? 'success' : 'error')
              if (res.ok) router.refresh()
            })
          }
        >
          Save
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await createManagedFromRequestAction(id)
              if (!res.ok) toast(res.error, 'error')
            })
          }
        >
          Create managed property
        </Button>
      </div>
    </div>
  )
}

/** Inspection photo uploads (private, admin only) that add hidden "photos" fields to the surrounding form. */
export function InspectionPhotos({ propertyId }: { propertyId: string }) {
  const [files, setFiles] = useState<UploadedDoc[]>([])
  return (
    <div className="sm:col-span-2">
      {files.map((f) => (
        <input key={f.path} type="hidden" name="photos" value={f.path} />
      ))}
      <FileDrop target={{ purpose: 'private', area: 'inspection', id: propertyId }} accept="image/jpeg,image/png,image/webp" maxFiles={20} label="Add inspection photos" hint="Photos are private: only HagerLand staff can see them until the owner portal opens." onDocUploaded={(d) => setFiles((all) => [...all, d])} />
      {files.length > 0 && (
        <ul className="mt-2 space-y-1 text-small">
          {files.map((f) => (
            <li key={f.path} className="flex items-center gap-2">
              <FileCheck2 className="size-4 text-green" aria-hidden /> {f.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
