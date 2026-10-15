import { describe, expect, it, vi } from 'vitest'
import { parseSessionPayload, roleCanAccess, roleCanExport } from '@/lib/admin/roles'

vi.mock('server-only', () => ({}))

describe('staff roles (spec 26.15)', () => {
  it('owners reach everything; other roles only their areas and the dashboard', () => {
    expect(roleCanAccess('owner', '/roodber8/settings')).toBe(true)
    expect(roleCanAccess('agent', '/roodber8')).toBe(true)
    expect(roleCanAccess('agent', '/roodber8/agency/offers/1')).toBe(true)
    expect(roleCanAccess('agent', '/roodber8/properties')).toBe(true)
    expect(roleCanAccess('agent', '/roodber8/settings')).toBe(false)
    expect(roleCanAccess('agent', '/roodber8/staff')).toBe(false)
    expect(roleCanAccess('agent', '/roodber8/pillars')).toBe(false)
    expect(roleCanAccess('agent', '/roodber8/agencyx')).toBe(false)
    expect(roleCanAccess('operations', '/roodber8/service-requests/abc')).toBe(true)
    expect(roleCanAccess('operations', '/roodber8/property-care')).toBe(true)
    expect(roleCanAccess('operations', '/roodber8/quotes')).toBe(true)
    expect(roleCanAccess('operations', '/roodber8/guides')).toBe(false)
    expect(roleCanAccess('content', '/roodber8/guides/new')).toBe(true)
    expect(roleCanAccess('content', '/roodber8/locations')).toBe(true)
    expect(roleCanAccess('content', '/roodber8/agency')).toBe(false)
    expect(roleCanAccess('content', '/api/admin')).toBe(false)
  })
  it('exports follow the role', () => {
    expect(roleCanExport('agent', 'agency-report')).toBe(true)
    expect(roleCanExport('agent', 'demand')).toBe(false)
    expect(roleCanAccess('agent', '/roodber8/export/agency-report')).toBe(true)
    expect(roleCanAccess('content', '/roodber8/export/audit')).toBe(false)
  })
  it('session payloads: master or staff, anything else refused', () => {
    expect(parseSessionPayload('1792000000000')).toEqual({ expires: 1792000000000, staffId: null, role: null })
    expect(parseSessionPayload('1792000000000~00000000-0000-4000-8000-000000000001~agent')).toEqual({ expires: 1792000000000, staffId: '00000000-0000-4000-8000-000000000001', role: 'agent' })
    expect(parseSessionPayload('1792000000000~00000000-0000-4000-8000-000000000001~superuser')).toBeNull()
    expect(parseSessionPayload('abc')).toBeNull()
    expect(parseSessionPayload('12e3')).toBeNull()
  })
})

describe('authenticator secret encryption', () => {
  it('round-trips and rejects tampering', async () => {
    process.env.ADMIN_TOTP_SECRET = 'JBSWY3DPEHPK3PXP'
    const { decryptSecret, encryptSecret } = await import('@/lib/admin/staff-crypto')
    const blob = encryptSecret('SECRETVALUE')
    expect(blob).not.toContain('SECRETVALUE')
    expect(decryptSecret(blob)).toBe('SECRETVALUE')
    expect(decryptSecret(blob.slice(0, -2) + 'AA')).toBeNull()
  })
})
