'use client'

import { useState, useTransition } from 'react'
import { Star } from 'lucide-react'
import { submitReviewAction } from '@/app/actions/service-request-actions'
import { Button } from '@/components/ui/Button'
import { Field, Textarea } from '@/components/ui/Field'
import { FormAlert } from '@/components/forms/FormParts'
import { cn } from '@/lib/cn'

/** "How did it go?": a verified review of the provider the customer chose (spec 26.12). */
export function ReviewBox({ requestId, token, orgName, existing }: { requestId: string; token?: string; orgName: string; existing: { status: string; rating: number } | null }) {
  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')
  const [pending, start] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)
  if (existing || result?.ok)
    return (
      <FormAlert tone="success">
        {existing?.status === 'published' ? `Thank you: your review of ${orgName} is published.` : existing?.status === 'rejected' ? 'Thank you for your review.' : result?.text ?? 'Thank you. Your review will appear once our team has checked it.'}
      </FormAlert>
    )
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const r = await submitReviewAction({ request_id: requestId, token, rating, body })
          setResult({ ok: r.ok, text: r.ok ? r.data.message : r.error })
        })
      }}
    >
      {result && !result.ok && <FormAlert>{result.text}</FormAlert>}
      <fieldset>
        <legend className="mb-2 text-small font-semibold text-ink">Your rating of {orgName}</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer">
              <input type="radio" name="rating" value={n} className="peer sr-only" checked={rating === n} onChange={() => setRating(n)} />
              <span className="flex size-11 items-center justify-center rounded-md peer-focus-visible:ring-2 peer-focus-visible:ring-green">
                <Star className={cn('size-7', n <= rating ? 'fill-gold text-gold' : 'text-stone-300')} aria-hidden />
                <span className="sr-only">
                  {n} {n === 1 ? 'star' : 'stars'}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="How did the job go?" htmlFor={`rv-${requestId}`} hint="Your first name, rating and words are shown on their profile once checked.">
        <Textarea id={`rv-${requestId}`} rows={4} maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} />
      </Field>
      <Button type="submit" disabled={pending}>
        Send my review
      </Button>
    </form>
  )
}
