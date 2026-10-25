import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

describe('the "new link" email states the link’s real lifetime (tidy T-1)', () => {
  it('reads the days from the token’s own expiry, never 0', async () => {
    const { linkDaysLeft, newRequestToken } = await import('@/lib/service-requests/token')
    const now = Date.parse('2026-10-25T09:00:00Z')
    const link = newRequestToken(now)
    expect(linkDaysLeft(link.expiresAt, now)).toBe(30)
    expect(linkDaysLeft(new Date(now + 10 * 60_000).toISOString(), now)).toBe(1)
    expect(linkDaysLeft(new Date(now - 86_400_000).toISOString(), now)).toBe(1)
  })
  it('the action uses one fresh link for guests and signed-in customers alike', async () => {
    const { readFileSync } = await import('node:fs')
    const src = readFileSync('app/actions/service-request-actions.ts', 'utf8')
    const resend = src.slice(src.indexOf('export async function resendRequestLinkAction'))
    expect(resend).not.toContain('linkDays: 0')
    expect(resend).toContain('const days = linkDaysLeft(link.expiresAt)')
    expect(resend).toContain('linkDays: days, ...wording(days)')
  })
})
