import { SiteHeader } from '@/components/layout/SiteHeader'
import { getVerticals } from '@/lib/data/verticals'
import { SiteFooter } from '@/components/layout/SiteFooter'
import { ErrorPanel } from '@/components/layout/ErrorPanel'
import { ButtonLink } from '@/components/ui/Button'

export const metadata = { title: 'Page not found', robots: { index: false } }

export default async function NotFound() {
  const verticals = await getVerticals()
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader verticals={verticals} />
      <main id="main" className="flex-1">
        <ErrorPanel
          code="404"
          title="We couldn't find that page"
          message="The link may be out of date, or the listing may have been removed. Try a search or start from one of the sections below."
          actions={
            <>
              <ButtonLink href="/">Go to the homepage</ButtonLink>
              <ButtonLink href="/search" variant="secondary">
                Search HagerLand
              </ButtonLink>
            </>
          }
        />
      </main>
      <SiteFooter />
    </div>
  )
}
