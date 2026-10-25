import { UserCheck } from 'lucide-react'
import type { IntroducedPerson } from '@/lib/jobs-desk-data'
import type { Translate } from '@/lib/i18n/translate'
import { formatDate } from '@/lib/format'
import { EmptyState } from '@/components/ui/Layout'

/**
 * Staffing requests (Jobs Phase 3, AB's approved wording W rows 4–8): the people HagerLand introduced, with only the
 * contact methods each person agreed to share. A person who withdrew consent shows only their first name and no
 * contact details. Rendered only when the recruitment desk switch is on (lib/jobs-desk-data.ts loadEmployerDesk).
 */
export function IntroducedPeople({ people, t }: { people: IntroducedPerson[]; t: Translate }) {
  return (
    <section aria-labelledby="introduced-h">
      <h2 id="introduced-h" className="hl-h3">
        {t('People introduced to you')}
      </h2>
      {people.length === 0 ? (
        <EmptyState className="mt-4" icon={<UserCheck />} title={t('No one has been introduced yet. We introduce only people who have agreed to be introduced to you.')} />
      ) : (
        <>
          <ul className="mt-4 space-y-3">
            {people.map((p) =>
              p.available ? (
                <li key={p.id} className="rounded-lg border border-border bg-white p-4">
                  <p className="font-semibold text-ink">
                    {p.name}
                    {p.role ? ` · ${p.role}` : ''} · {t('Introduced')} {formatDate(p.introducedAt)}
                  </p>
                  {p.buttons.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                      {p.buttons.map((b) => (
                        <a key={b.label} href={b.href} className="inline-flex min-h-11 items-center justify-center rounded-md border border-border-strong px-4 font-semibold text-ink hover:bg-stone-50 sm:flex-1">
                          {t(b.label)}
                        </a>
                      ))}
                    </div>
                  )}
                </li>
              ) : (
                <li key={p.id} className="rounded-lg border border-border bg-stone-50 p-4 text-muted">
                  {t('{First name} is no longer available for this request.').replace('{First name}', p.firstName)}
                </li>
              ),
            )}
          </ul>
          <p className="mt-3 text-small text-muted">{t('These people agreed to be introduced to you for this request only. Please do not share their details with anyone else. Candidates must never be asked for money.')}</p>
        </>
      )}
    </section>
  )
}
