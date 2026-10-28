'use client'

import { useEffect, useState } from 'react'
import { Link2, MessageCircle, Send, Share2 } from 'lucide-react'

/** Text for the share box, translated on the server (AB's approved wording W3–W5). */
export interface ShareJobText {
  heading: string
  whatsapp: string
  telegram: string
  share: string
  copy: string
  copied: string
}

const BUTTON = 'inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-border-strong px-3 text-small font-semibold text-ink hover:bg-stone-50'

/** "Share this job" (Jobs Phase 5): WhatsApp, Telegram, the phone's own share sheet (when it has one) and Copy link. */
export function ShareJob({ link, message, whatsapp, telegram, text }: { link: string; message: string; whatsapp: string; telegram: string; text: ShareJobText }) {
  const [canShare, setCanShare] = useState(false)
  const [copied, setCopied] = useState(false)
  useEffect(() => setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function'), [])
  return (
    <section aria-labelledby="share-job-h" className="rounded-lg border border-border bg-white p-5">
      <h2 id="share-job-h" className="font-semibold text-ink">
        {text.heading}
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={BUTTON}>
          <MessageCircle className="size-4" aria-hidden /> {text.whatsapp}
        </a>
        <a href={telegram} target="_blank" rel="noopener noreferrer" className={BUTTON}>
          <Send className="size-4" aria-hidden /> {text.telegram}
        </a>
        {canShare && (
          <button type="button" className={BUTTON} onClick={() => navigator.share({ text: message }).catch(() => undefined)}>
            <Share2 className="size-4" aria-hidden /> {text.share}
          </button>
        )}
        <button
          type="button"
          className={BUTTON}
          onClick={() =>
            navigator.clipboard
              ?.writeText(link)
              .then(() => setCopied(true))
              .catch(() => undefined)
          }
        >
          <Link2 className="size-4" aria-hidden /> {text.copy}
        </button>
      </div>
      <p role="status" aria-live="polite" className="mt-2 min-h-5 text-small text-green">
        {copied ? text.copied : ''}
      </p>
    </section>
  )
}
