import { Phone } from 'lucide-react'
import { ButtonLink } from '@/components/ui/Button'
import { CALLBACK_PATH, CALLBACK_TEXT } from '@/lib/callbacks'
import type { Translate } from '@/lib/i18n/translate'

/** "Prefer to talk? Ask us to call you" (Jobs Phase 5, W8–W9, W12): only while the owner's call-back switch is on. */
export function CallbackBox({ t, href }: { t: Translate; href: (h: string) => string }) {
  return (
    <section aria-labelledby="callback-h" className="rounded-lg border border-border bg-white p-5" data-testid="callback-box">
      <h2 id="callback-h" className="flex items-center gap-2 font-semibold text-ink">
        <Phone className="size-5 text-green" aria-hidden /> {t(CALLBACK_TEXT.boxHeading)}
      </h2>
      <p className="mt-1 text-small text-muted">{t(CALLBACK_TEXT.boxText)}</p>
      <ButtonLink href={href(CALLBACK_PATH)} variant="secondary" className="mt-3 w-full sm:w-auto">
        {t(CALLBACK_TEXT.submit)}
      </ButtonLink>
    </section>
  )
}
