import { describe, expect, it, vi } from 'vitest'
import { LicenceNote, licenceText } from '@/components/content/LicenceNote'
import { formatDate } from '@/lib/format'

vi.mock('server-only', () => ({}))

const full = { number: 'RA-123', authority: 'Ministry of Labour and Skills', holder: 'HagerLand PLC', date: '2026-10-01' }

describe('recruitment licence line on /jobs and the Terms (Jobs Phase 1)', () => {
  it('shows only the parts that are filled in', () => {
    expect(licenceText('recruitment', full)).toBe(`Recruitment and placement licence RA-123, issued by Ministry of Labour and Skills, to HagerLand PLC, on ${formatDate('2026-10-01')}`)
    expect(licenceText('recruitment', { ...full, authority: '', holder: '', date: '' })).toBe('Recruitment and placement licence RA-123')
    expect(licenceText('recruitment', { ...full, holder: '', date: '' })).toBe('Recruitment and placement licence RA-123, issued by Ministry of Labour and Skills')
    expect(licenceText('recruitment', { ...full, authority: '' })).toBe(`Recruitment and placement licence RA-123, to HagerLand PLC, on ${formatDate('2026-10-01')}`)
    expect(licenceText('recruitment', { ...full, authority: '', holder: '' })).toBe(`Recruitment and placement licence RA-123, on ${formatDate('2026-10-01')}`)
  })
  it('hides the whole line when there is no number', () => {
    expect(LicenceNote({ kind: 'recruitment', licence: undefined })).toBeNull()
    expect(LicenceNote({ kind: 'recruitment', licence: { ...full, number: '' } })).toBeNull()
    const shown = LicenceNote({ kind: 'recruitment', licence: full })
    expect(shown?.props).toMatchObject({ 'data-testid': 'licence-recruitment' })
  })
})
