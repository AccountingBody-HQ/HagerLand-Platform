import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateQuestionJson } from '@/lib/service-requests/questions'

/** Every question list seeded by a migration must pass the same checks as the admin editor. */
describe('seeded request questions', () => {
  const dir = path.join(process.cwd(), 'supabase/migrations')
  const lists = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .flatMap((f) => Array.from(readFileSync(path.join(dir, f), 'utf8').matchAll(/'(\[\{.*?\}\])'/g)).map((m) => ({ file: f, json: m[1].replace(/''/g, "'") })))
    // Question lists start with an "id"; other JSON lists (such as guide FAQs) are not request questions.
    .filter((l) => l.json.startsWith('[{"id"'))
  it('finds the seeded lists', () => expect(lists.length).toBeGreaterThanOrEqual(15))
  it.each(lists.map((l, i) => [i, l.file, l.json]))('list %i in %s is valid', (_i, _file, json) => {
    const r = validateQuestionJson(json as string)
    expect(r.ok ? 'ok' : r.error).toBe('ok')
  })
})
