'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { Field, Input, Textarea } from '@/components/ui/Field'
import { FormAlert, SubmitButton } from '@/components/forms/FormParts'
import { FileDrop } from '@/components/media/FileDrop'
import { MediaImage } from '@/components/media/MediaImage'
import type { ActionResult } from '@/lib/action-result'

type State = ActionResult | null

/** Post a dated construction-progress update with up to 12 photos (spec 25.2j). */
export function UpdateForm({ developmentId, action, note }: { developmentId: string; action: (prev: State, formData: FormData) => Promise<State>; note: string }) {
  const [state, formAction] = useActionState(action, null)
  const [photos, setPhotos] = useState<string[]>([])
  const router = useRouter()
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset()
      setPhotos([])
      router.refresh()
    }
  }, [state, router])
  const errors = state && !state.ok ? state.fieldErrors ?? {} : {}
  return (
    <form ref={ref} action={formAction} className="space-y-4" noValidate>
      {state && !state.ok && <FormAlert>{state.error}</FormAlert>}
      {state?.ok && <FormAlert tone="success">{state.message}</FormAlert>}
      <input type="hidden" name="development_id" value={developmentId} />
      <input type="hidden" name="photo_paths" value={photos.join('\n')} />
      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <Field label="Title" htmlFor="du-title" required error={errors.title}>
          <Input id="du-title" name="title" maxLength={160} required placeholder="e.g. Ground-floor slab poured" invalid={Boolean(errors.title)} />
        </Field>
        <Field label="Date" htmlFor="du-date" required error={errors.happened_on}>
          <Input id="du-date" name="happened_on" type="date" required invalid={Boolean(errors.happened_on)} />
        </Field>
      </div>
      <Field label="What happened" htmlFor="du-body" required error={errors.body}>
        <Textarea id="du-body" name="body" rows={4} maxLength={4000} required invalid={Boolean(errors.body)} />
      </Field>
      <div>
        <FileDrop
          target={{ purpose: 'update-photo', development_id: developmentId }}
          accept="image/jpeg,image/png,image/webp"
          maxFiles={12 - photos.length}
          disabled={photos.length >= 12}
          label="Add progress photos"
          hint="JPEG, PNG or WebP, up to 12 photos"
          onDocUploaded={(d) => setPhotos((all) => (all.length < 12 ? [...all, d.path] : all))}
        />
        {errors.photo_paths && <p className="mt-2 text-small text-error">{errors.photo_paths}</p>}
        {photos.length > 0 && (
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((p, i) => (
              <li key={p} className="relative aspect-[4/3] overflow-hidden rounded-md">
                <MediaImage path={p} alt={`Progress photo ${i + 1}`} fill sizes="160px" className="object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos((all) => all.filter((x) => x !== p))}
                  className="absolute right-1 top-1 inline-flex size-11 items-center justify-center rounded-full bg-ink/70 text-white"
                  aria-label={`Remove photo ${i + 1}`}
                >
                  <X className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-small text-muted">{note}</p>
      <SubmitButton pendingText="Posting…">Post update</SubmitButton>
    </form>
  )
}
