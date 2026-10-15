import { z } from 'zod'
import { intFromForm, optionalText, textSchema, youtubeUrl } from './common'

const blank = (v: unknown) => (v === '' || v === null ? undefined : v)

export const unitTypeSchema = z.object({
  type: z.string().trim().min(1).max(60),
  beds: z.number().int().min(0).max(20).nullable().optional(),
  area_min: z.number().min(0).max(100000).nullable().optional(),
  area_max: z.number().min(0).max(100000).nullable().optional(),
  price_from_etb: z.number().int().min(0).nullable().optional(),
})

export const developmentSchema = z.object({
  id: z.preprocess(blank, z.uuid().optional()),
  name: textSchema(160, { min: 2, label: 'Name' }),
  kind: z.enum(['development', 'condominium_site', 'building', 'compound', 'mixed_use_project']),
  summary: optionalText(300, 'Summary'),
  description: optionalText(8000, 'Description'),
  location_id: z.uuid({ error: 'Choose the location' }),
  address_line: optionalText(200, 'Address'),
  completion_status: z.preprocess(blank, z.enum(['off_plan', 'under_construction', 'ready']).optional()),
  expected_completion: z.preprocess(blank, z.iso.date().optional()),
  completed_year: intFromForm({ min: 1900, max: 2100 }),
  total_units: intFromForm({ min: 0, max: 100000 }),
  floors_label: z.preprocess(blank, z.string().trim().regex(/^(G|B)(\+\d{1,3})?$/i, 'Use the format G+12').optional()),
  price_from_etb: intFromForm({ min: 0 }),
  price_to_etb: intFromForm({ min: 0 }),
  payment_plan: optionalText(2000, 'Payment plan'),
  amenities: z.preprocess((v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : v ?? []), z.array(z.string().max(60)).max(30)),
  finishing_status: z.preprocess(blank, z.enum(['shell', 'semi_finished', 'fully_finished', 'not_applicable']).optional()),
  tenure: z.preprocess(blank, z.enum(['leasehold', 'freehold_private', 'condominium_title', 'cooperative', 'unknown']).optional()),
  video_url: youtubeUrl,
  unit_types: z.preprocess((v) => {
    if (typeof v !== 'string' || !v) return []
    try {
      return JSON.parse(v)
    } catch {
      return []
    }
  }, z.array(unitTypeSchema).max(20)),
  brochure_path: z.preprocess(blank, z.string().max(300).optional()),
})

export type DevelopmentInput = z.infer<typeof developmentSchema>

/** A construction-progress post on a development (spec 25.2j). Photos are paths returned by the upload step. */
export const developmentUpdateSchema = z
  .object({
    development_id: z.uuid(),
    title: textSchema(160, { min: 3, label: 'Title' }),
    body: textSchema(4000, { min: 10, label: 'What happened' }),
    happened_on: z.iso.date({ error: 'Enter the date' }),
    photo_paths: z.preprocess((v) => (typeof v === 'string' && v ? v.split('\n').filter(Boolean) : []), z.array(z.string().max(300)).max(12, 'Up to 12 photos')),
  })
  .refine((d) => d.photo_paths.every((p) => p.startsWith(`development/${d.development_id}/`) && p.endsWith('.webp') && !p.includes('..')), { message: 'Please upload the photos again.', path: ['photo_paths'] })
  .refine((d) => new Date(d.happened_on) <= new Date(Date.now() + 86_400_000), { message: 'The date cannot be in the future', path: ['happened_on'] })
