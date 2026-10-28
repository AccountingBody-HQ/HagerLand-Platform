import { getVerticals } from '@/lib/data/verticals'
import { getPillars } from '@/lib/data/pillars'
import { buildFooterColumns } from '@/lib/navigation'
import { getAmScope, getLocale, reviewedMessages } from '@/lib/i18n/server'
import { translator } from '@/lib/i18n/translate'
import { collectLabels, missingReviewed } from '@/lib/i18n/jobs-keys'
import { Container } from '@/components/ui/Layout'

/**
 * Jobs Phase 5 (AB's approved wording W2): on pages served by Amharic for Jobs, while any Jobs text (or menu and footer
 * text) has no native-reviewed Amharic and is shown in English. `nav` is the page's menu data; `footer` adds the footer.
 */
export async function JobsAmharicNotice({ nav, footer = false }: { nav: unknown; footer?: boolean }) {
  const [locale, scope] = await Promise.all([getLocale(), getAmScope()])
  if (locale !== 'am' || scope !== 'jobs') return null
  const reviewed = reviewedMessages()
  const extra = collectLabels(nav)
  if (footer) {
    const [pillars, verticals] = await Promise.all([getPillars(), getVerticals()])
    collectLabels(buildFooterColumns(pillars, verticals), extra)
  }
  if (missingReviewed(reviewed, extra).length === 0) return null
  const t = translator(locale, 'jobs', reviewed)
  return (
    <div className="border-b border-border bg-info/10" data-testid="jobs-am-notice">
      <Container className="py-3">
        <p role="note" className="text-small">
          {t('Some text on this page is shown in English while we finish the translation.')}
        </p>
      </Container>
    </div>
  )
}
