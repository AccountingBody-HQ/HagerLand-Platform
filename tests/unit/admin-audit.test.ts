import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/** Every admin action that changes something writes to the audit log (spec 24.12, 25.4). Read-only actions are listed. */
const READ_ONLY = new Set(['previewDevelopmentsCsvAction', 'previewPriceCsvAction', 'findPromotableAction'])

describe('admin actions', () => {
  it('check permission and record an audit entry', () => {
    const missing: string[] = []
    for (const f of readdirSync('app/roodber8/actions').filter((x) => x.endsWith('.ts'))) {
      const src = readFileSync(`app/roodber8/actions/${f}`, 'utf8')
      for (const part of src.split('\nexport async function ').slice(1)) {
        const name = part.split('(')[0]
        const body = part.split('\nexport ')[0]
        if (!body.includes('assertAdmin()')) missing.push(`${f} ${name}: no assertAdmin`)
        if (!READ_ONLY.has(name) && !body.includes('audit(') && !body.includes('moderateAction(')) missing.push(`${f} ${name}: no audit`)
      }
    }
    expect(missing).toEqual([])
  })
})
