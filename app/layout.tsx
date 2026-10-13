import type { Metadata } from 'next'
import { Inter, Manrope } from 'next/font/google'
import './globals.css'
import { brand } from '@/lib/brand'
import { SITE_URL } from '@/lib/site'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
const manrope = Manrope({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-display', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${brand.name} — ${brand.descriptor}`, template: `%s | ${brand.name}` },
  description: brand.heroSupport,
  openGraph: { siteName: brand.name, type: 'website', locale: 'en_US' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body className="font-sans bg-white text-ink antialiased">{children}</body>
    </html>
  )
}
