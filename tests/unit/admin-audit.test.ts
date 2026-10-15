import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/** Every admin action that changes something writes to the audit log (spec 24.12, 25.4). Read-only actions are listed. */
const READ_ONLY = new Set(['previewDevelopmentsCsvAction', 'previewPriceCsvAction', 'findPromotableAction'])

describe('admin actions', () => {
  it('check permission for their area and record an audit entry', () => {
    const missing: string[] = []
    for (const f of readdirSync('app/roodber8/actions').filter((x) => x.endsWith('.ts'))) {
      const src = readFileSync(`app/roodber8/actions/${f}`, 'utf8')
      for (const part of src.split('\nexport async function ').slice(1)) {
        const name = part.split('(')[0]
        const body = part.split('\nexport ')[0]
        // Every action names the admin area it belongs to, so staff roles are checked against it (spec 26.15).
        if (!/assertAdmin\((AREA|'\/roodber8\/[a-z-]+'|entityArea\(entity\))\)|assertOwner\(\)/.test(body)) missing.push(`${f} ${name}: no assertAdmin(area)`)
        if (!READ_ONLY.has(name) && !body.includes('audit(') && !body.includes('moderateAction(')) missing.push(`${f} ${name}: no audit`)
      }
    }
    expect(missing).toEqual([])
  })
})
