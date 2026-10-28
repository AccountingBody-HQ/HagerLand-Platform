import { ButtonLink } from '@/components/ui/Button'
import type { Translate } from '@/lib/i18n/translate'

/** Jobs Phase 6: on the customer's own building project page, a pointer to HagerLand's recruitment help. */
export function ProjectHiringHelp({ t = (s) => s }: { t?: Translate }) {
  return (
    <div className="mt-6 rounded-lg border border-gold/30 bg-gold-soft/40 p-5">
      <p className="text-ink">{t("Need workers for this project? Ask HagerLand's recruitment team to help you find them.")}</p>
      <ButtonLink href="/request-service/staffing" variant="secondary" size="sm" className="mt-3">
        {t('Submit a staffing requirement')}
      </ButtonLink>
    </div>
  )
}
