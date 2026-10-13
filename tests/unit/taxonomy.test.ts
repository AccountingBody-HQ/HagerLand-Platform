import { describe, expect, it } from 'vitest'
import { categorySchema, childLevel, locationSchema, reorder } from '@/lib/validation/taxonomy'

describe('taxonomy', () => {
  it('derives child levels', () => {
    expect(childLevel(null)).toBe('region')
    expect(childLevel('region')).toBe('city')
    expect(childLevel('city')).toBe('sub_city')
    expect(childLevel('sub_city')).toBe('area')
    expect(childLevel('area')).toBe('area')
  })

  it('reorders siblings and renumbers', () => {
    const rows = [
      { id: 'a', sort: 10 },
      { id: 'b', sort: 20 },
      { id: 'c', sort: 30 },
    ]
    expect(reorder(rows, 'b', 'up')).toEqual([
      { id: 'b', sort: 10 },
      { id: 'a', sort: 20 },
    ])
    expect(reorder(rows, 'a', 'up')).toEqual([])
    expect(reorder(rows, 'c', 'down')).toEqual([])
  })

  it('renumbers duplicate sort values', () => {
    const rows = [
      { id: 'a', sort: 0 },
      { id: 'b', sort: 0 },
    ]
    expect(reorder(rows, 'b', 'up')).toEqual([
      { id: 'b', sort: 10 },
      { id: 'a', sort: 20 },
    ])
  })

  it('validates categories and locations', () => {
    expect(categorySchema.safeParse({ name: 'C', parent_id: '' }).success).toBe(false)
    const c = categorySchema.parse({ name: 'Cement', parent_id: '', is_active: 'true', seo_intro: '' })
    expect(c).toMatchObject({ parent_id: null, is_active: true, seo_intro: null, sort: 0 })
    const l = locationSchema.parse({ name: 'Bole', name_am: 'ቦሌ', parent_id: '' })
    expect(l).toMatchObject({ name_am: 'ቦሌ', is_active: false })
  })
})
