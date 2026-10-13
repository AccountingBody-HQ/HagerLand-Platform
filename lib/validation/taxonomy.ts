import { z } from 'zod'

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null))

export const categoryKind = z.enum(['product', 'service'])

export const categorySchema = z.object({
  id: z.uuid().optional(),
  parent_id: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(z.uuid().nullable()),
  name: z.string().trim().min(2, 'Enter a name.').max(80),
  description: optText(400),
  seo_title: optText(70),
  seo_intro: optText(1200),
  sort: z.coerce.number().int().min(0).max(9999).default(0),
  is_active: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
})

export const locationSchema = z.object({
  id: z.uuid().optional(),
  parent_id: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(z.uuid().nullable()),
  name: z.string().trim().min(2, 'Enter a name.').max(120),
  name_am: optText(120),
  seo_intro_sale: optText(1200),
  seo_intro_rent: optText(1200),
  seo_intro_professionals: optText(1200),
  sort: z.coerce.number().int().min(0).max(9999).default(0),
  is_active: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
})

/** The level a new child location gets, from its parent's level. */
export function childLevel(parent: 'region' | 'city' | 'sub_city' | 'area' | null): 'region' | 'city' | 'sub_city' | 'area' {
  if (!parent) return 'region'
  if (parent === 'region') return 'city'
  if (parent === 'city') return 'sub_city'
  return 'area'
}

/** Swaps a row with its neighbour in a sibling list, returning only the sort values that change. */
export function reorder<T extends { id: string; sort: number }>(siblings: T[], id: string, dir: 'up' | 'down'): { id: string; sort: number }[] {
  const list = [...siblings].sort((a, b) => a.sort - b.sort)
  const i = list.findIndex((s) => s.id === id)
  const j = dir === 'up' ? i - 1 : i + 1
  if (i < 0 || j < 0 || j >= list.length) return []
  ;[list[i], list[j]] = [list[j], list[i]]
  const before = new Map(siblings.map((s) => [s.id, s.sort]))
  return list.map((s, idx) => ({ id: s.id, sort: (idx + 1) * 10 })).filter((s) => before.get(s.id) !== s.sort)
}
