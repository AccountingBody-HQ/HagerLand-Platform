import type { Metadata, Viewport } from 'next'
import { Inter, Manrope, Noto_Sans_Ethiopic } from 'next/font/google'
import './globals.css'
import { brand } from '@/lib/brand'
import { SITE_URL } from '@/lib/site'
import { ToastProvider } from '@/components/ui/Toast'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const manrope = Manrope({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-display', display: 'swap' })
const ethiopic = Noto_Sans_Ethiopic({ subsets: ['ethiopic'], weight: ['400', '600'], variable: '--font-ethiopic', display: 'swap', preload: false })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${brand.name} — ${brand.descriptor}`, template: `%s | ${brand.name}` },
  description: brand.heroSupport,
  applicationName: brand.name,
  openGraph: { siteName: brand.name, type: 'website', locale: 'en_US' },
  formatDetection: { telephone: false },
}

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
      </body>
    </html>
  )
}
