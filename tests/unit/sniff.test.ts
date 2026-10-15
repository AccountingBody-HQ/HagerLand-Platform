import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { isAllowedUpload, sniffType } from '@/lib/storage'

describe('upload checks', () => {
  it('detects real image types from their bytes', async () => {
    const jpeg = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#fff' } }).jpeg().toBuffer()
    const png = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#fff' } }).png().toBuffer()
    expect(sniffType(jpeg)).toBe('image/jpeg')
    expect(sniffType(png)).toBe('image/png')
    expect(sniffType(Buffer.from('%PDF-1.7 rest of file'))).toBe('application/pdf')
    expect(sniffType(Buffer.from('<html><script>alert(1)</script>'))).toBeNull()
  })
  it('enforces types and sizes', () => {
    expect(isAllowedUpload('image', 'image/jpeg', 1000)).toBeNull()
    expect(isAllowedUpload('image', 'image/gif', 1000)).not.toBeNull()
    expect(isAllowedUpload('image', 'image/jpeg', 13 * 1024 * 1024)).not.toBeNull()
    expect(isAllowedUpload('private', 'application/pdf', 1000)).toBeNull()
  })
})
