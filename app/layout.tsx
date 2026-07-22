import type { Metadata } from 'next'
import { Inter, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import { HLLanguageProvider } from '@/components/HLLanguageContext'

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
      <head>
        <script
          src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          async
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              function googleTranslateElementInit() {
                new google.translate.TranslateElement(
                  { pageLanguage: 'en', includedLanguages: 'am,om,en', autoDisplay: false, layout: google.translate.TranslateElement.InlineLayout.SIMPLE },
                  'google_translate_element'
                );
              }
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${plexMono.variable} font-sans bg-bg text-ink`}
      >
        <div id="google_translate_element" style={{ display: 'none' }} />
        <HLLanguageProvider>
          {children}
        </HLLanguageProvider>
      </body>
    </html>
  )
}
