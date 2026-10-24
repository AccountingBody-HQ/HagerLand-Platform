import { describe, expect, it } from 'vitest'
import { safeNextPath } from '@/lib/return-path'
import { safeNextPath as fromValidation } from '@/lib/validation/common'

describe('return path after sign-in (Jobs Phase 1)', () => {
  it('keeps same-site relative paths, with their query', () => {
    expect(safeNextPath('/account/jobs/new')).toBe('/account/jobs/new')
    expect(safeNextPath('/jobs/site-engineer-1a2b/apply')).toBe('/jobs/site-engineer-1a2b/apply')
    expect(safeNextPath('/account/jobs?tab=open&q=site%20engineer')).toBe('/account/jobs?tab=open&q=site%20engineer')
    expect(safeNextPath('/am/account/candidate')).toBe('/am/account/candidate')
    expect(safeNextPath('/')).toBe('/')
  })
  it('falls back for other hosts, schemes and slash tricks', () => {
    for (const bad of ['//evil.com', 'https://evil.com', 'http:/evil.com', 'javascript:alert(1)', '/\\evil.com', '\\\\evil.com', '/account\\..\\evil', 'evil.com', 'account/jobs', ' /account', '/account /x', '/acc\tount', '/a\nb', '/a\u0000b'])
      expect(safeNextPath(bad), bad).toBe('/account')
  })
  it('falls back for encoded variants', () => {
    for (const bad of ['%2F%2Fevil.com', '/%2F%2Fevil.com', '/%2Fevil.com', '/%5Cevil.com', '/%252F%252Fevil.com', '/%0d%0aSet-Cookie:x', '/%E0%A4%A', '/%25252525252F'])
      expect(safeNextPath(bad), bad).toBe('/account')
  })
  it('never returns to admin', () => {
    for (const bad of ['/roodber8', '/roodber8/jobs', '/roodber8-login', '/ROODBER8', '/am/roodber8', '/%72oodber8', '/x/../roodber8', '/./roodber8/settings'])
      expect(safeNextPath(bad), bad).toBe('/account')
  })
  it('falls back for empty, non-text and very long values, and honours the fallback', () => {
    expect(safeNextPath('')).toBe('/account')
    expect(safeNextPath(null)).toBe('/account')
    expect(safeNextPath(undefined)).toBe('/account')
    expect(safeNextPath(42)).toBe('/account')
    expect(safeNextPath(`/account/${'a'.repeat(600)}`)).toBe('/account')
    expect(safeNextPath(`/account/${'a'.repeat(400)}`)).toBe(`/account/${'a'.repeat(400)}`)
    expect(safeNextPath('//evil.com', '/onboarding')).toBe('/onboarding')
  })
  it('is the same check every sign-in path uses', () => {
    expect(fromValidation).toBe(safeNextPath)
  })
})
