'use client'

import Image, { type ImageProps } from 'next/image'
import { publicMediaUrl, thumbPath } from '@/lib/media'

/**
 * Image from the public media bucket. The upload pipeline already produced WebP at
 * 640px and up to 2400px, so the loader picks the right file instead of re-optimising.
 */
export function MediaImage({ path, alt, ...rest }: Omit<ImageProps, 'src' | 'loader'> & { path: string }) {
  const full = publicMediaUrl(path) ?? ''
  const small = publicMediaUrl(thumbPath(path)) ?? full
  return <Image {...rest} alt={alt} src={full} loader={({ width }) => (width <= 640 ? small : full)} className={`bg-stone-200 ${rest.className ?? ''}`} />
}
