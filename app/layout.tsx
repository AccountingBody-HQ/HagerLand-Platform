import type { Metadata, Viewport } from 'next'
import { Inter, Manrope, Noto_Sans_Ethiopic } from 'next/font/google'
import './globals.css'
import { brand } from '@/lib/brand'
import { SITE_URL } from '@/lib/site'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ToastProvider } from '@/components/ui/Toast'
import { UtmCapture } from '@/components/enquiry/UtmCapture'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const manrope = Manrope({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-display', display: 'swap' })
const ethiopic = Noto_Sans_Ethiopic({ subsets: ['ethiopic'], weight: ['400', '600'], variable: '--font-ethiopic', display: 'swap', preload: false })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${brand.name} — ${brand.descriptor}`, template: `%s | ${brand.name}` },
  description: brand.heroSupport,
  applicationName: brand.name,
  openGraph: { siteName: brand.name, type: 'website', locale: 'en_US', images: [{ url: '/og/default', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', images: ['/og/default'] },
  formatDetection: { telephone: false },
}

/** Vercel serves the analytics scripts; elsewhere (local builds, tests) they would 404. */
const onVercel = Boolean(process.env.VERCEL)

export const viewport: Viewport = {
  themeColor: '#152238',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable} ${ethiopic.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        <ToastProvider>{children}</ToastProvider>
        <UtmCapture />
        {onVercel && <Analytics />}
        {onVercel && <SpeedInsights />}
      </body>
    </html>
  )
}
