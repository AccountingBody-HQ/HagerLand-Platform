import 'server-only'
import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { log } from '@/lib/log'

export const OG_SIZE = { width: 1200, height: 630 }
const GREEN = '#1C7C4C'
const GOLD = '#B8862E'
const INK = '#152238'

let fonts: Promise<{ name: string; data: Buffer; weight: 500 | 800; style: 'normal' }[]> | null = null

/** Manrope (SIL Open Font License), the site's display face, bundled in lib/fonts. */
function loadFonts() {
  fonts ??= Promise.all(
    ([500, 800] as const).map(async (weight) => ({ name: 'Manrope', data: await readFile(path.join(process.cwd(), 'lib/fonts', `manrope-${weight}.ttf`)), weight, style: 'normal' as const })),
  )
  return fonts
}

/** Photos are stored as WebP, which the image renderer cannot read: fetch and convert to JPEG. */
async function photoDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000), next: { revalidate: 86400 } })
    if (!res.ok) return null
    const jpeg = await sharp(Buffer.from(await res.arrayBuffer())).resize(640, 630, { fit: 'cover' }).jpeg({ quality: 78 }).toBuffer()
    return `data:image/jpeg;base64,${jpeg.toString('base64')}`
  } catch (err) {
    log.warn('og', 'photo fetch failed', { message: err instanceof Error ? err.message : String(err) })
    return null
  }
}

function Mark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="16" fill={GREEN} />
      <path d="M11 12 L21 12 L16 21 Z" stroke="white" strokeWidth="1.4" fill="none" opacity="0.55" />
      <circle cx="11" cy="12" r="2.6" fill="white" />
      <circle cx="21" cy="12" r="2.6" fill="white" />
      <circle cx="16" cy="21" r="2.6" fill="white" />
    </svg>
  )
}

export interface OgCard {
  eyebrow: string
  title: string
  subtitle?: string | null
  highlight?: string | null
  photo?: string | null
  gold?: boolean
}

/** Branded 1200×630 share image: text on the left, photo on the right when there is one. */
export async function renderOg(card: OgCard): Promise<ImageResponse> {
  const [photo, fontList] = await Promise.all([photoDataUrl(card.photo ?? null), loadFonts().catch(() => [])])
  const accent = card.gold ? GOLD : GREEN
  const title = card.title.length > 90 ? `${card.title.slice(0, 87)}…` : card.title
  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', background: '#FFFFFF', fontFamily: 'Manrope', fontWeight: 500 }}>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: photo ? 620 : 1200, padding: '56px 56px 48px', borderTop: `12px solid ${accent}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Mark size={56} />
            <div style={{ fontSize: 36, fontWeight: 800, color: INK }}>HagerLand</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: 2 }}>{card.eyebrow}</div>
            <div style={{ fontSize: photo ? 46 : 64, fontWeight: 800, color: INK, lineHeight: 1.12 }}>{title}</div>
            {card.subtitle && <div style={{ fontSize: 28, color: '#5B6472' }}>{card.subtitle}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {card.highlight ? <div style={{ fontSize: 40, fontWeight: 800, color: INK }}>{card.highlight}</div> : <div style={{ fontSize: 24, color: '#5B6472' }}>www.hagerland.com</div>}
          </div>
        </div>
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- satori renders plain <img>
          <img src={photo} width={580} height={630} style={{ objectFit: 'cover' }} alt="" />
        )}
      </div>
    ),
    { ...OG_SIZE, fonts: fontList, headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' } },
  )
}
