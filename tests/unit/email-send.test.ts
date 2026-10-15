import { afterEach, describe, expect, it, vi } from 'vitest'
import { deliverEmail } from '@/lib/email/send'

describe('email sender and reply-to (spec 15.2, 25.4)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })
  it('sends from hello@ by default and supply@ for HagerLand Supply, with the reply-to address', async () => {
    vi.stubEnv('EMAIL_TEST_MAILPIT_URL', 'http://localhost:8025')
    vi.stubEnv('EMAIL_FROM', 'HagerLand <hello@hagerland.com>')
    vi.stubEnv('EMAIL_FROM_SUPPLY', 'HagerLand Supply <supply@hagerland.com>')
    vi.stubEnv('EMAIL_REPLY_TO', 'help@hagerland.com')
    const bodies: { From: { Email: string; Name: string }; ReplyTo?: { Email: string }[] }[] = []
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => (bodies.push(JSON.parse(String(init.body))), new Response('{}'))))
    expect((await deliverEmail({ to: 'a@test.invalid', subject: 's', html: '<p>x</p>', text: 'x' })).ok).toBe(true)
    expect((await deliverEmail({ to: 'a@test.invalid', subject: 's', html: '<p>x</p>', text: 'x', from: 'supply' })).ok).toBe(true)
    expect(bodies[0].From).toEqual({ Name: 'HagerLand', Email: 'hello@hagerland.com' })
    expect(bodies[1].From).toEqual({ Name: 'HagerLand Supply', Email: 'supply@hagerland.com' })
    expect(bodies[0].ReplyTo).toEqual([{ Email: 'help@hagerland.com' }])
  })
  it('never sends to a non-local test mailbox', async () => {
    vi.stubEnv('EMAIL_TEST_MAILPIT_URL', 'https://mail.example.com')
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    expect((await deliverEmail({ to: 'a@test.invalid', subject: 's', html: 'x', text: 'x' })).ok).toBe(false)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
