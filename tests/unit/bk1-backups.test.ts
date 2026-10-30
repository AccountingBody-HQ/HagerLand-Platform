import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/** BK-1: the weekly backup on GitHub Actions. The repository may be public, so its safety rules are pinned here. */

const wf = readFileSync('.github/workflows/backup.yml', 'utf8')
const code = wf.replace(/^\s*#.*$/gm, '')
const script = readFileSync('scripts/backup-supabase.sh', 'utf8')
const SECRETS = ['HL_BACKUP_DB_URL', 'HL_BACKUP_SERVICE_ROLE_KEY', 'HL_BACKUP_PASSPHRASE']
const NOT_SET_UP = 'Backup not set up: add the secrets HL_BACKUP_DB_URL, HL_BACKUP_SERVICE_ROLE_KEY and HL_BACKUP_PASSPHRASE in GitHub (Settings → Secrets and variables → Actions).'

describe('the "Weekly backup" workflow', () => {
  it('starts only on the Monday schedule or the "Run workflow" button, never on a push or pull request', () => {
    expect(code).toMatch(/^name: Weekly backup$/m)
    const on = code.slice(code.indexOf('\non:'), code.indexOf('\npermissions:'))
    expect(on.match(/^ {2}[a-z_]+:/gm)).toEqual(['  schedule:', '  workflow_dispatch:'])
    expect(on).toContain('- cron: "17 2 * * 1"')
    expect(code).not.toMatch(/pull_request|push:|workflow_run|repository_dispatch|issue_comment/)
  })
  it('reads only, never overlaps, has a time limit, and runs on main of this repository only', () => {
    expect(code).toMatch(/^permissions:\n {2}contents: read\n\n/m)
    expect(code.match(/permissions:/g)).toHaveLength(1)
    expect(code).toMatch(/concurrency:\n {2}group: weekly-backup\n {2}cancel-in-progress: false/)
    expect(code).toContain('timeout-minutes: 60')
    expect(code).toContain('runs-on: ubuntu-latest')
    expect(code).toContain("if: github.repository == 'AccountingBody-HQ/HagerLand-Platform' && github.ref == 'refs/heads/main'")
  })
  it('uses only the official checkout and upload actions, pinned to a full commit', () => {
    const uses = Array.from(code.matchAll(/uses: (\S+)(?: # (\S+))?/g)).map((m) => [m[1], m[2]])
    expect(uses.map(([u]) => u.split('@')[0])).toEqual(['actions/checkout', 'actions/upload-artifact'])
    for (const [u, version] of uses) {
      expect(u).toMatch(/@[0-9a-f]{40}$/)
      expect(version).toMatch(/^v\d+\.\d+\.\d+$/)
    }
    expect(code).toContain('persist-credentials: false')
  })
  it('the secrets reach only the check step and the backup step; missing ones stop the run with the plain message', () => {
    for (const s of SECRETS) expect(code.match(new RegExp(`secrets\\.${s}\\b`, 'g')), s).toHaveLength(2)
    const first = code.slice(code.indexOf('steps:'), code.indexOf('- name: Check out'))
    expect(first).toContain('- name: Check the backup is set up')
    expect(first).toContain(`echo "::error::${NOT_SET_UP}"`)
    for (const s of SECRETS) expect(first).toContain(`echo "::add-mask::$${s}"`)
    expect(code).toMatch(/- name: Make the encrypted backup[^\n]*\n {8}env:[\s\S]*?run: bash scripts\/backup-supabase\.sh\n/)
  })
  it('uploads only the encrypted file and its fingerprint, for 90 days, and always deletes the working folder', () => {
    const upload = code.slice(code.indexOf('uses: actions/upload-artifact'), code.indexOf('- name: Summary'))
    expect(upload).toContain('path: |\n            backups/hagerland-backup-*.tar.gz.enc\n            backups/hagerland-backup-*.tar.gz.enc.sha256\n')
    expect(upload).toContain('retention-days: 90')
    expect(upload).toContain('if-no-files-found: error')
    expect(code).toContain('echo "name=hagerland-backup-$(date -u +%Y-%m-%d)"')
    expect(code).toContain("! -name 'hagerland-backup-*.tar.gz.enc' ! -name 'hagerland-backup-*.tar.gz.enc.sha256'")
    expect(code).toMatch(/- name: Delete the working folder\n {8}if: always\(\)\n {8}run: rm -rf backups/)
  })
  it('the summary says "Self-check passed" and how to download, with no data', () => {
    const summary = code.slice(code.indexOf('- name: Summary'), code.indexOf('- name: Delete the working folder'))
    expect(summary).toContain('Self-check passed')
    expect(summary).toContain('**Artifacts**')
    expect(summary).not.toMatch(/secrets\.|manifest|Tables:|rows/)
  })
})

describe('scripts/backup-supabase.sh', () => {
  it('automatic mode needs exactly the three secrets; on GitHub without them it stops with the plain message', () => {
    expect(script).toContain('if [ -n "${HL_BACKUP_DB_URL:-}" ] && [ -n "${HL_BACKUP_SERVICE_ROLE_KEY:-}" ] && [ -n "${HL_BACKUP_PASSPHRASE:-}" ]; then\n  AUTO=1')
    expect(script).toContain('elif [ "${GITHUB_ACTIONS:-}" = true ] || [ "${CI:-}" = true ]; then')
    expect(script).toContain(`NOT_SET_UP="${NOT_SET_UP}"`)
    expect(Array.from(new Set(script.match(/HL_BACKUP_[A-Z_]+/g)))).toEqual(SECRETS)
    expect(script).toContain('unset HL_BACKUP_DB_URL HL_BACKUP_SERVICE_ROLE_KEY HL_BACKUP_PASSPHRASE')
  })
  it('never prints a secret or the connection string (only GitHub\'s hide command, on GitHub)', () => {
    expect(script).not.toMatch(/set -x|set -o xtrace/)
    const echoes = script.split('\n').filter((l) => /\b(echo|printf|say)\b/.test(l) && /\$\{?(DB_URL|SERVICE_KEY|PASSPHRASE|PGPASSWORD|HL_BACKUP_)/.test(l))
    expect(echoes.map((l) => l.trim())).toEqual([
      'if [ "${GITHUB_ACTIONS:-}" = true ]; then echo "::add-mask::$PGPASSWORD"; fi',
      "api() { curl -sS --fail --retry 2 --retry-delay 2 -H @<(printf 'apikey: %s\\nAuthorization: Bearer %s\\n' \"$SERVICE_KEY\" \"$SERVICE_KEY\") \"$@\"; }",
      'tar -czf - -C "$WORK" . | openssl enc -aes-256-cbc -pbkdf2 -iter 600000 -salt -pass fd:3 -out "$ENC.partial" 3< <(printf \'%s\' "$PASSPHRASE")',
      'openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -pass fd:3 -in "$ENC.partial" 3< <(printf \'%s\' "$PASSPHRASE") | tar -xzOf - ./SHA256SUMS | cmp -s - "$WORK/SHA256SUMS" ||',
      'openssl enc -d -aes-256-cbc -pbkdf2 -iter 600000 -in "$file" -pass fd:3 3< <(printf \'%s\' "$PASSPHRASE") 2>/dev/null | tar -xzf - -C "$CHECK_DIR" 2>/dev/null ||',
    ].sort((a, b) => script.indexOf(a) - script.indexOf(b)))
  })
  it('the self-check runs before the backup counts as done, and its decrypted copy is always wiped', () => {
    expect(script.indexOf('self_check "$ENC"')).toBeGreaterThan(script.indexOf('mv "$ENC.partial" "$ENC"'))
    expect(script.indexOf('self_check "$ENC"')).toBeLessThan(script.lastIndexOf('DONE=1'))
    expect(script).toMatch(/cleanup\(\) \{\n {2}local code=\$\?\n {2}unset [^\n]+\n {2}wipe_check_dir\n/)
    for (const part of ['manifest.json', 'SHA256SUMS', 'db/public.dump', 'db/auth.dump', 'storage/objects.json', 'storage/objects.sha256']) expect(script).toContain(part)
    expect(script).toContain("grep -q 'TABLE DATA auth users '")
  })
  it('automatic mode names no file or count in its output (the log may be public)', () => {
    expect(script).toContain('label() { if [ "$AUTO" = 1 ]; then echo "a stored file"; else echo "$1/$2"; fi; }')
    expect(script).not.toMatch(/fail "[^"]*\$bucket\/\$name/)
    expect(script).toMatch(/if \[ "\$AUTO" = 1 \]; then\n {2}echo "File: [^\n]+\n {2}exit 0\nfi\necho "\$SUMMARY"/)
  })
  it('the backup tools are the database version or newer', () => {
    expect(script).toContain('[ "$m" -lt "$SERVER_MAJOR" ]; then continue; fi')
    expect(script).toContain('matching_tools || install_client "$SERVER_MAJOR"')
  })
})
