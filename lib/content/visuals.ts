/**
 * Photographs for the drawing slots (design round 2, ready for Phase 3). Every slot shows its original line drawing
 * until a photograph is set here; then the photograph takes its place with no other change.
 *
 * To add a photo: put the file in public/images/visuals/ (JPEG or WebP, at least 1600 px wide, landscape), then set
 * the slot below, e.g. hero: { src: '/images/visuals/hero.jpg', alt: 'Apartment buildings in Bole at dusk', focal: '60% 40%' }.
 * `focal` (optional) is the point that must stay visible when the photo is cropped, as "x% y%" from the top left.
 */
export type VisualSlot = 'hero' | 'buy-rent' | 'build' | 'care' | 'abroad'

export interface VisualImage {
  src: string
  alt: string
  focal?: string
}

export const VISUALS: Record<VisualSlot, VisualImage | null> = {
  hero: null,
  'buy-rent': null,
  build: null,
  care: null,
  abroad: null,
}
