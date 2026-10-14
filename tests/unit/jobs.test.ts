import { describe, expect, it } from 'vitest'
import { JOB_CATEGORIES, candidateSchema, formatSalary, isOwnCvPath, jobColumns, jobSchema } from '@/lib/jobs'
import { developmentUpdateSchema } from '@/lib/validation/development'

const USER = '11111111-2222-4333-8444-555555555555'
const LOC = '66666666-7777-4888-8999-000000000000'
const valid = { title: 'Site engineer', category: 'engineering', employment_type: 'full_time', location_id: LOC, description: 'Supervise concrete works on a residential building in Bole.' }

describe('jobs (spec 24.9)', () => {
  it('offers every job category named in PLATFORM_VISION §10', () => {
    const labels = JOB_CATEGORIES.map((c) => c.label)
    for (const c of ['Construction', 'Engineering', 'Architecture', 'Skilled trades', 'Project management', 'Property', 'Estate agency', 'Sales', 'Site management', 'Quantity surveying', 'Procurement', 'Administration', 'Finance', 'Graduate opportunities', 'Temporary labour', 'Permanent recruitment', 'Executive recruitment', 'International placements'])
      expect(labels).toContain(c)
  })

  it('formats optional salaries in the job currency', () => {
    expect(formatSalary(3_000_000, 4_500_000, 'ETB', 'month')).toBe('ETB 30,000 – 45,000 per month')
    expect(formatSalary(300_000, null, 'GBP', 'year')).toBe('From £3,000 per year')
    expect(formatSalary(null, 200_000, 'USD', 'month')).toBe('Up to US$2,000 per month')
    expect(formatSalary(null, null, 'ETB', null)).toBeNull()
  })

  it('validates jobs and stores salaries in minor units', () => {
    const ok = jobSchema.safeParse({ ...valid, salary_min: '30000', salary_max: '45000', salary_period: 'month' })
    expect(ok.success).toBe(true)
    if (ok.success) expect(jobColumns(ok.data)).toMatchObject({ salary_min_minor: 3_000_000, salary_max_minor: 4_500_000, salary_period: 'month', requirements: null })
    expect(jobSchema.safeParse({ ...valid, salary_min: '50000', salary_max: '40000', salary_period: 'month' }).success).toBe(false)
    expect(jobSchema.safeParse({ ...valid, salary_min: '50000' }).success).toBe(false)
    expect(jobSchema.safeParse({ ...valid, closing_date: '2020-01-01' }).success).toBe(false)
    expect(jobSchema.safeParse({ ...valid, category: 'astronaut' }).success).toBe(false)
  })

  it('accepts only CVs in the user’s own private folder', () => {
    expect(isOwnCvPath(`docs/cv/${USER}/a.pdf`, USER)).toBe(true)
    expect(isOwnCvPath(`docs/cv/${USER}/a.docx`, USER)).toBe(true)
    expect(isOwnCvPath(`docs/cv/${USER}/a.exe`, USER)).toBe(false)
    expect(isOwnCvPath(`docs/cv/someone-else/a.pdf`, USER)).toBe(false)
    expect(isOwnCvPath(`docs/cv/${USER}/../x/a.pdf`, USER)).toBe(false)
  })

  it('keeps candidate profiles private unless chosen, and de-duplicates skills', () => {
    const r = candidateSchema.safeParse({ full_name: 'Selam', skills: 'AutoCAD, formwork, AutoCAD', availability: 'immediately', visibility: 'private' })
    expect(r.success && r.data).toMatchObject({ skills: ['AutoCAD', 'formwork'], visibility: 'private', placement_wanted: false })
    expect(candidateSchema.safeParse({ full_name: 'Selam', availability: 'immediately', visibility: 'public' }).success).toBe(false)
  })
})

describe('development progress updates (spec 25.2j)', () => {
  const dev = '99999999-8888-4777-8666-555555555555'
  const base = { development_id: dev, title: 'Slab poured', body: 'The ground-floor slab was poured.', happened_on: '2026-10-01' }
  it('accepts photos uploaded for that development only', () => {
    expect(developmentUpdateSchema.safeParse({ ...base, photo_paths: `development/${dev}/a.webp\ndevelopment/${dev}/b.webp` }).success).toBe(true)
    expect(developmentUpdateSchema.safeParse({ ...base, photo_paths: 'development/other/a.webp' }).success).toBe(false)
    expect(developmentUpdateSchema.safeParse({ ...base, happened_on: '2999-01-01', photo_paths: '' }).success).toBe(false)
  })
})
