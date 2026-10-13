import { expect, test } from '@playwright/test'
import { db, seedPublishedProperty, uniqueEmail } from './helpers'

test.describe('daily job', () => {
  test('refuses requests without the secret', async ({ request }) => {
    expect((await request.get('/api/cron/daily')).status()).toBe(401)
    expect((await request.get('/api/cron/daily', { headers: { authorization: 'Bearer wrong' } })).status()).toBe(401)
  })

  test('expires listings and quotes, sends reminders and purges old verification documents', async ({ request }) => {
    const d = db()
    const day = 86_400_000
    const expiring = await seedPublishedProperty({ title: `E2E apartment expiring ${Date.now()}` })
    const soon = await seedPublishedProperty({ title: `E2E apartment soon ${Date.now()}` })
    await d.from('properties').update({ expires_at: new Date(Date.now() - day).toISOString() }).eq('id', expiring.id)
    await d.from('properties').update({ expires_at: new Date(Date.now() + 3 * day).toISOString(), expiry_reminder_sent_at: null }).eq('id', soon.id)

    const { data: q } = await d.from('quote_requests').insert({ name: 'E2E Old Quote', phone: '+251911234567', email: uniqueEmail('oldquote'), source: 'basket', status: 'quoted', quoted_at: new Date(Date.now() - 15 * day).toISOString(), quoted_total_etb_cents: 100 }).select('id').single()

    const { data: org } = await d.from('organisations').insert({ kind: 'contractor', name: `E2E Verify Org ${Date.now()}`, slug: `e2e-verify-${Date.now()}`, source: 'admin', status: 'published' }).select('id').single()
    const { data: user } = await d.auth.admin.createUser({ email: uniqueEmail('verify'), password: 'correct-horse-battery', email_confirm: true })
    const docPath = `docs/verification/${org!.id}/licence.pdf`
    await d.storage.from('private-docs').upload(docPath, Buffer.from('%PDF-1.4 test'), { contentType: 'application/pdf', upsert: true })
    const { data: vr } = await d.from('verification_requests').insert({ org_id: org!.id, submitted_by: user.user!.id, documents: { trade_licence: docPath }, status: 'approved', decided_at: new Date(Date.now() - 91 * day).toISOString() }).select('id').single()

    const res = await request.get('/api/cron/daily', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(body.expired).toBeGreaterThanOrEqual(1)
    expect(body.reminded).toBeGreaterThanOrEqual(1)
    expect(body.quotesExpired).toBeGreaterThanOrEqual(1)
    expect(body.verificationDocsPurged).toBeGreaterThanOrEqual(1)
    expect(body.rateLimitsPurged).toBe(false)

    expect((await d.from('properties').select('status').eq('id', expiring.id).single()).data?.status).toBe('expired')
    expect((await d.from('properties').select('expiry_reminder_sent_at').eq('id', soon.id).single()).data?.expiry_reminder_sent_at).not.toBeNull()
    expect((await d.from('quote_requests').select('status').eq('id', q!.id).single()).data?.status).toBe('expired')
    const purged = (await d.from('verification_requests').select('documents, documents_purged_at').eq('id', vr!.id).single()).data
    expect(purged?.documents).toEqual({})
    expect(purged?.documents_purged_at).not.toBeNull()
    expect((await d.storage.from('private-docs').list(`docs/verification/${org!.id}`)).data ?? []).toHaveLength(0)

    // Running again changes nothing for these records (no second reminder).
    const again = await (await request.get('/api/cron/daily', { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })).json()
    expect(again.reminded).toBe(0)

    await d.from('properties').delete().in('id', [expiring.id, soon.id])
    await d.from('quote_requests').delete().eq('id', q!.id)
    await d.from('organisations').delete().eq('id', org!.id)
    await d.auth.admin.deleteUser(user.user!.id)
  })
})
