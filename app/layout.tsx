import type { Metadata, Viewport } from 'next'
import { Inter, Manrope, Newsreader, Noto_Sans_Ethiopic } from 'next/font/google'
import './globals.css'
import { brand } from '@/lib/brand'
import { SITE_URL } from '@/lib/site'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ToastProvider } from '@/components/ui/Toast'
import { UtmCapture } from '@/components/enquiry/UtmCapture'
import { InputModality } from '@/components/layout/InputModality'
import { getLocale } from '@/lib/i18n/server'
import { LocaleProvider } from '@/lib/i18n/client'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'optional' })
const manrope = Manrope({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-display', display: 'optional' })
// Round 2: serif voice for headings (self-hosted, no layout shift: the fallback stays if the font is late).
const newsreader = Newsreader({ subsets: ['latin'], weight: ['400', '500'], style: ['normal'], variable: '--font-serif', display: 'optional' })
const ethiopic = Noto_Sans_Ethiopic({ subsets: ['ethiopic'], weight: ['400', '600'], variable: '--font-ethiopic', display: 'swap', preload: false })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${brand.name} — ${brand.titleLine}`, template: `%s | ${brand.name}` },
  description: `${brand.masterLine} ${brand.audienceLine}`,
  applicationName: brand.name,
  openGraph: { siteName: brand.name, type: 'website', locale: 'en_US', images: [{ url: '/og/default', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', images: ['/og/default'] },
  formatDetection: { telephone: false },
}

/** Vercel serves the analytics scripts; elsewhere (local builds, tests) they would 404. */
const onVercel = Boolean(process.env.VERCEL)

export const viewport: Viewport = {
  themeColor: '#0D3A24',
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()
  return (
    <html lang={locale} className={`${inter.variable} ${manrope.variable} ${newsreader.variable} ${ethiopic.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <LocaleProvider locale={locale}>
          <ToastProvider>{children}</ToastProvider>
        </LocaleProvider>
        <UtmCapture />
        <InputModality />
        {onVercel && <Analytics />}
        {onVercel && <SpeedInsights />}
      </body>
    </html>
  )
}
