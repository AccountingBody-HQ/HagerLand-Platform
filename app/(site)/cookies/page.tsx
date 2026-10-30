import Link from 'next/link'
import { buildMetadata } from '@/lib/seo'
import { brand } from '@/lib/brand'
import { legalUpdated } from '@/lib/content/legal'
import { Container } from '@/components/ui/Layout'
import { PageHero, TextSection } from '@/components/content/PageHero'

export const revalidate = 3600
export const metadata = buildMetadata({ title: 'Cookies', description: 'HagerLand uses only essential cookies for signing in and security, plus cookieless analytics. No advertising or tracking cookies.', path: '/cookies' })

export default async function CookiesPage() {
  const updated = await legalUpdated('cookies')
  return (
    <>
      <PageHero crumb="Cookies" title="Cookies" intro={`Last updated ${updated}`} />
      <Container className="max-w-3xl space-y-10 py-12 sm:py-16">
        <TextSection title="The short version">
          <p>{brand.name} uses only essential cookies, the ones needed to keep you signed in and the site secure. We do not use advertising or tracking cookies, so there is nothing to accept or reject.</p>
        </TextSection>
        <TextSection title="Essential cookies we use">
          <ul>
            <li><strong>Sign-in cookies</strong> (names starting with <code>sb-</code>): keep you signed in to your account (up to 400 days).</li>
            <li><strong>Business switcher</strong> (<code>hl_org</code>): remembers which of your businesses you are working as (1 year).</li>
            <li><strong>View counter</strong> (<code>hl_seen</code>): stops one visit being counted as many views of a listing. It holds short codes, not personal details (until you close your browser).</li>
            <li><strong>Security check</strong> (Cloudflare Turnstile): may set a cookie when a form is shown, to tell people from bots.</li>
            <li><strong>Staff sign-in</strong>: HagerLand staff have a separate sign-in cookie for the admin area (8 hours). Visitors never get it.</li>
          </ul>
        </TextSection>
        <TextSection title="Things stored in your browser">
          <p>Your quote list, the properties you are comparing, your recent searches, the currency you chose for approximate prices and any campaign link you arrived from are kept in your browser’s storage on your device. They are not sent to us until you submit a form (a signed-in quote list is also kept in your account so you can use it on other devices).</p>
        </TextSection>
        <TextSection title="Maps and videos">
          <p>If you open a Google map on a listing or play a development video, Google or YouTube may set its own cookies. Map pages load map images from our map image provider, which receives your internet address. These load only when you use them.</p>
        </TextSection>
        <TextSection title="Analytics">
          <p>We use Vercel Web Analytics and Speed Insights, which measure page visits and loading speed without cookies and without identifying you.</p>
        </TextSection>
        <TextSection title="Questions">
          <p>
            See our <Link href="/privacy">privacy policy</Link> or <Link href="/contact">contact us</Link>.
          </p>
        </TextSection>
      </Container>
    </>
  )
}
