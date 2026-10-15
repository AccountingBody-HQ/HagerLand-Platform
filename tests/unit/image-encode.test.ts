import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { encodeImage } from '@/lib/storage'

describe('uploaded photos (spec 25.4)', () => {
  it('are re-encoded as WebP without EXIF, so GPS location is never published', async () => {
    const withGps = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#1C7C4C' } })
      .jpeg()
      .withExif({ IFD0: { Make: 'TestCam', Model: 'GPS phone' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '9/1 1/1 0/1' } })
      .toBuffer()
    expect((await sharp(withGps).metadata()).exif).toBeDefined()
    const { full, thumb } = await encodeImage(withGps)
    const meta = await sharp(full.data).metadata()
    expect(meta.format).toBe('webp')
    expect(meta.exif).toBeUndefined()
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBe(2400)
    expect((await sharp(thumb).metadata()).width).toBe(640)
  })
  it('rejects corrupt files', async () => {
    await expect(encodeImage(Buffer.from('not an image at all'))).rejects.toThrow()
  })
})
