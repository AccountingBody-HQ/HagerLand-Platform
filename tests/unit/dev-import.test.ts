import { describe, expect, it } from 'vitest'
import { prepareImport, resolveLocation, type LocationRef } from '@/lib/admin/dev-import'

const L: LocationRef[] = [
  { id: 'aa', parent_id: null, name: 'Addis Ababa', level: 'region' },
  { id: 'bole', parent_id: 'aa', name: 'Bole', level: 'sub_city' },
  { id: 'cmc', parent_id: 'bole', name: 'CMC', level: 'area' },
  { id: 'or', parent_id: null, name: 'Oromia', level: 'region' },
  { id: 'adama', parent_id: 'or', name: 'Adama', level: 'city' },
]

describe('development CSV import', () => {
  it('resolves the deepest location', () => {
    expect(resolveLocation(L, 'Addis Ababa', 'bole', 'CMC')?.id).toBe('cmc')
    expect(resolveLocation(L, 'adama', '', '')?.id).toBe('adama')
    expect(resolveLocation(L, 'Addis Ababa', 'Nowhere', '')).toBeNull()
  })
  it('validates rows and flags duplicates', () => {
    const rows = prepareImport(
      [
        { name: 'Bole Heights', kind: 'building', city: 'Addis Ababa', sub_city: 'Bole', floors_label: 'g+12', total_units: '120', developer_name: 'Acme Dev' },
        { name: 'Bole Heights', kind: 'building', city: 'Addis Ababa', sub_city: 'Bole' },
        { name: 'X', kind: 'castle', city: 'Mars' },
        { name: 'Adama Gardens', city: 'Adama', completion_status: 'soon' },
      ],
      L,
      [{ id: 'dev1', name: 'Acme Dev' }],
      [{ name: 'adama gardens', location_id: 'adama' }],
    )
    expect(rows[0].errors).toEqual([])
    expect(rows[0].floors).toBe('G+12')
    expect(rows[0].developerOrgId).toBe('dev1')
    expect(rows[1].duplicate).toBe(true)
    expect(rows[2].errors.length).toBeGreaterThanOrEqual(3)
    expect(rows[3].duplicate).toBe(true)
    expect(rows[3].errors).toContain('completion_status must be off_plan, under_construction or ready')
  })
})
