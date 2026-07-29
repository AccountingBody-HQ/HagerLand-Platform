import type { Metadata } from 'next'
import { Inter, IBM_Plex_Mono, Manrope } from 'next/font/google'
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

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-manrope',
})
export const metadata: Metadata = {
  title: {
    default: 'HagerLand — Where Ethiopia Does Business',
    template: '%s | HagerLand',
  },
  description:
    "Financial markets, verified businesses, products made in Ethiopia, and opportunities across the diaspora. Ethiopia's business and financial platform — built for Ethiopia, open to the world.",
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
        className={`${inter.variable} ${plexMono.variable} ${manrope.variable} font-sans bg-bg text-ink`}
      >
        <div id="google_translate_element" style={{ display: 'none' }} />
        <HLLanguageProvider>
          {children}
        </HLLanguageProvider>
      </body>
    </html>
  )
}
