import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('server-only', () => ({}))

/** F-8: the house logo E1, one definition everywhere, and the icon files and links around it. */

const PATHS = ['M17 30 L32 17 L47 30 V46 H17 Z', 'M27.5 46 V39.5 A4.5 4.5 0 0 1 36.5 39.5 V46']

describe('the one definition of the mark', () => {
  it('is exactly E1', async () => {
    const { BRAND_MARK } = await import('@/lib/brand-mark')
    expect(BRAND_MARK).toEqual({ viewBox: 64, circle: { cx: 32, cy: 32, r: 32 }, green: '#1C7C4C', stroke: '#FFFFFF', strokeWidth: 2.75, faviconStrokeWidth: 4.25, paths: PATHS })
  })
  it('LogoMark draws the E1 circle and both paths with stroke 2.75, hidden from screen readers, same size class', async () => {
    const { LogoMark } = await import('@/components/brand/Logo')
    const html = renderToStaticMarkup(createElement(LogoMark))
    expect(html).toContain('viewBox="0 0 64 64"')
    expect(html).toContain('<circle cx="32" cy="32" r="32" fill="#1C7C4C"></circle>')
    expect(html).toContain('stroke="#FFFFFF" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"')
    for (const d of PATHS) expect(html).toContain(`<path d="${d}"></path>`)
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('size-8')
  })
  it('the wordmark text and styling are unchanged', async () => {
    const { Wordmark } = await import('@/components/brand/Logo')
    const html = renderToStaticMarkup(createElement(Wordmark, { inverse: true }))
    expect(html).toContain('font-display text-[1.375rem] font-extrabold tracking-tight')
    expect(html).toContain('HagerLand<sup class="ml-0.5 align-super text-[0.55em] font-bold">®</sup>')
    expect(html).toContain('text-white')
  })
  it('the share images and the icon script read the same definition; no copy of the paths anywhere else', () => {
    const og = readFileSync('lib/og.tsx', 'utf8')
    expect(og).toContain("import { BRAND_MARK } from '@/lib/brand-mark'")
    expect(og).toMatch(/strokeWidth=\{m\.strokeWidth\}/)
    expect(readFileSync('scripts/brand-icons.mjs', 'utf8')).toContain("lib/brand-mark.json")
    const hits = execFileSync('git', ['grep', '--untracked', '-l', '-F', 'M17 30 L32 17', '--', 'app', 'components', 'lib', 'public', 'scripts']).toString().trim().split('\n').sort()
    expect(hits).toEqual(['app/icon.svg', 'lib/brand-mark.json'])
  })
  it('the old three-point mark is gone from app, components, lib and public', () => {
    for (const old of ['M11 12 L21 12 L16 21', 'three connected points', 'three-node']) {
      let out = ''
      try {
        out = execFileSync('git', ['grep', '--untracked', '-n', '-F', old, '--', 'app', 'components', 'lib', 'public']).toString()
      } catch {
        out = ''
      }
      expect(out, old).toBe('')
    }
  })
})

describe('icon files and links', () => {
  it('app/icon.svg is the tab-icon variant (stroke 4.25)', () => {
    const svg = readFileSync('app/icon.svg', 'utf8')
    expect(svg).toContain('viewBox="0 0 64 64"')
    expect(svg).toContain('stroke-width="4.25"')
    for (const d of PATHS) expect(svg).toContain(d)
  })
  it('the organisation logo for search engines is /logo.png', async () => {
    const { organizationJsonLd } = await import('@/lib/seo')
    expect(String(organizationJsonLd([]).logo)).toMatch(/^https:\/\/www\.hagerland\.com\/logo\.png$/)
  })
  it('the manifest: name, colours, display and the three icons', async () => {
    const manifest = (await import('@/app/manifest')).default()
    expect(manifest).toMatchObject({ name: 'HagerLand', short_name: 'HagerLand', description: "Ethiopia's construction and property platform", start_url: '/', scope: '/', display: 'browser', background_color: '#FFFFFF', theme_color: '#152238' })
    expect(manifest.icons).toEqual([
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ])
  })
  it('the middleware skips every icon file and still runs for pages', () => {
    const src = readFileSync('middleware.ts', 'utf8')
    const matcher = /matcher: \['([^']+)'\]/.exec(src)![1]
    const re = new RegExp(`^${matcher}$`)
    for (const p of ['/favicon.ico', '/icon.svg', '/apple-icon.png', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-maskable-512.png', '/logo.png', '/robots.txt']) expect(re.test(p), p).toBe(false)
    for (const p of ['/', '/about', '/property', '/roodber8', '/og/default', '/api/health']) expect(re.test(p), p).toBe(true)
  })
})
