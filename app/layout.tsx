import type { Metadata } from 'next'
import { Inter, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-plex-mono',
})

export const metadata: Metadata = {
  title: {
    default: 'HagerLand — The global network for Ethiopian business',
    template: '%s | HagerLand',
  },
  description:
    'Find and support verified community businesses, jobs, housing, events, and community across the diaspora.',
  metadataBase: new URL('https://hagerland.com'),
  openGraph: {
    siteName: 'HagerLand',
    type: 'website',
    locale: 'en_GB',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${plexMono.variable} font-sans bg-bg text-ink`}
      >
        {children}
      </body>
    </html>
  )
}
