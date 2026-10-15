import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/** Every analytics event the platform declares (spec 19) is sent from at least one place. */
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f)
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(f) ? [p] : []
  })
}

describe('analytics events', () => {
  it('sends every declared event', () => {
    const declared = Array.from(readFileSync('lib/analytics.ts', 'utf8').matchAll(/\|\s*'([a-z_]+)'/g)).map((m) => m[1])
    expect(declared.length).toBeGreaterThan(15)
    const source = ['app', 'components', 'lib'].flatMap(files).filter((f) => !f.endsWith(path.join('lib', 'analytics.ts'))).map((f) => readFileSync(f, 'utf8')).join('\n')
    const unused = declared.filter((e) => !new RegExp(`track(Server)?\\(\\s*'${e}'|'${e}'`).test(source))
    expect(unused).toEqual([])
  })
})
