import type { MetadataRoute } from 'next'
import { brand } from '@/lib/brand'

/** Web app manifest (F-8): the right icon and colours for phones; the site stays a website ("browser"). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.name,
    description: brand.descriptor,
    start_url: '/',
    scope: '/',
    display: 'browser',
    background_color: '#FFFFFF',
    theme_color: '#152238',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
