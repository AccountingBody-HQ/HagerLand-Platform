import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/** BK-1b: a failed backup connection says why in plain English, and never prints a secret. Runs the real shell code. */

function sh(fn: string, ...args: string[]): string {
  return execFileSync('bash', ['-c', `. scripts/lib/backup-connect.sh; ${fn} "$@"`, 'bk1b', ...args], { encoding: 'utf8' }).trimEnd()
}

const PW = 'Fake-Pw_9x@z!Secret'
const PW_ENC = 'Fake-Pw_9x%40z!Secret'
const URL = `postgresql://postgres.abcdefghijklmnopqrst:${PW_ENC}@aws-0-eu-west-2.pooler.supabase.com:5432/postgres`
const KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.fakeSignature123'
const PASSPHRASE = 'fake backup passphrase 42'
const SECRETS = [URL, PW_ENC, PW, KEY, PASSPHRASE]
const reason = (err: string) => sh('connection_reason', err, ...SECRETS)
const details = (err: string) => sh('sanitise_error', err, ...SECRETS)
const AT = 'psql: error: connection to server at "aws-0-eu-west-2.pooler.supabase.com" (3.8.1.2), port 5432 failed: '

describe('the reason line for each kind of failure', () => {
  const cases: [string, string][] = [
    [`${AT}FATAL:  password authentication failed for user "postgres.abcdefghijklmnopqrst"`, 'The database refused the password. Copy the current database password into the connection string again (Supabase → Connect → Session pooler).'],
    [`${AT}FATAL:  Tenant or user not found`, 'Supabase does not recognise the project or user in the connection string. Copy the Session pooler string again; the user must be postgres.<project ref>.'],
    ['psql: error: could not translate host name "aws-0-x.pooler.supabase.com" to address: Name or service not known', 'The database address could not be found. Check the part after @ in the connection string.'],
    ['psql: error: could not translate host name "x" to address: Temporary failure in name resolution', 'The database address could not be found. Check the part after @ in the connection string.'],
    [`${AT}Connection timed out`, 'The database could not be reached from this machine (network). Check Supabase → Database → Settings → Network restrictions allow all addresses, and that you used the Session pooler (port 5432).'],
    [`${AT}Connection refused\n\tIs the server running on that host and accepting TCP/IP connections?`, 'The database could not be reached from this machine (network). Check Supabase → Database → Settings → Network restrictions allow all addresses, and that you used the Session pooler (port 5432).'],
    ['psql: error: connection to server failed: Network is unreachable', 'The database could not be reached from this machine (network). Check Supabase → Database → Settings → Network restrictions allow all addresses, and that you used the Session pooler (port 5432).'],
    [`${AT}SSL connection has been closed unexpectedly`, 'The secure connection could not be set up.'],
    [`${AT}FATAL:  sorry, too many clients already`, 'The database has too many open connections right now. Wait a few minutes and run it again.'],
    [`${AT}FATAL:  Max client connections reached`, 'The database has too many open connections right now. Wait a few minutes and run it again.'],
    [`${AT}server closed the connection unexpectedly\n\tThis probably means the server terminated abnormally`, 'The database closed the connection straight away. It may be restarting or paused: open the project in Supabase, check it is active, and run it again.'],
    [`${AT}FATAL:  project is paused`, 'Supabase refused the connection because the project is paused or restricted. Open the project in Supabase, check it is active, and run it again.'],
    [`${AT}FATAL:  Circuit breaker open: Too many authentication errors`, 'Supabase has paused new connections for a while after too many failed sign-in attempts. Wait about 30 minutes, check the password in the connection string, then run it once.'],
    ['psql: error: something nobody expected', 'Reason from the database: something nobody expected'],
    [`${AT}FATAL:  role "nosuchuser" does not exist`, 'Supabase does not recognise the project or user in the connection string. Copy the Session pooler string again; the user must be postgres.<project ref>.'],
  ]
  for (const [err, line] of cases) it(line.slice(0, 60), () => expect(reason(err)).toBe(line))
  it('only secure-connection errors trigger the sslmode=require retry', () => {
    const ssl = (e: string) => execFileSync('bash', ['-c', '. scripts/lib/backup-connect.sh; is_ssl_error "$1" && echo yes || echo no', 'bk1b', e], { encoding: 'utf8' }).trim()
    expect(ssl(`${AT}SSL connection has been closed unexpectedly`)).toBe('yes')
    expect(ssl(`${AT}FATAL:  password authentication failed for user "x"`)).toBe('no')
    expect(ssl(`${AT}Connection timed out`)).toBe('no')
  })
})

describe('sanitising: no secret ever reaches the output', () => {
  const nasty = [
    `psql: error: missing "=" after "${URL}" in connection info string`,
    `psql: error: invalid connection option password=${PW} host=x`,
    `FATAL: unexpected value ${PW}`,
    `could not use ${PW_ENC} or key ${KEY} with passphrase ${PASSPHRASE}`,
    `pg_dump: error: connection to postgres://postgres:${PW}@localhost:5432/postgres failed`,
    `apikey sb_secret_AbC123xyz_456 rejected`,
  ]
  it('the password (plain and %-encoded), the connection string, keys and the passphrase become [hidden]', () => {
    for (const err of nasty) {
      for (const out of [details(err), reason(err)]) {
        for (const secret of [...SECRETS, 'sb_secret_AbC123xyz_456', 'Fake-Pw']) expect(out, err).not.toContain(secret)
        expect(out).toContain('[hidden]')
      }
    }
  })
  it('at most two lines of 300 characters, without the "psql: error:" prefix', () => {
    const out = details(`psql: error: ${'x'.repeat(500)}\nline two\nline three`)
    expect(out.split('\n')).toHaveLength(2)
    expect(out.split('\n')[0]).toHaveLength(300)
    expect(out).not.toContain('psql: error:')
  })
  it('ordinary details (address, port, user) stay readable', () => {
    expect(details(`${AT}FATAL:  password authentication failed for user "postgres.abcdefghijklmnopqrst"`)).toBe(
      'connection to server at "aws-0-eu-west-2.pooler.supabase.com" (3.8.1.2), port 5432 failed: FATAL:  password authentication failed for user "postgres.abcdefghijklmnopqrst"',
    )
  })
})

describe('shape checks on HL_BACKUP_DB_URL (before connecting)', () => {
  const good = 'postgresql://postgres.abcdefghijklmnopqrst@aws-0-eu-west-2.pooler.supabase.com:5432/postgres'
  const shape = (url: string, pw = 'ok-password') => sh('url_shape_problems', url, pw)
  it('a correct Session pooler string passes', () => {
    expect(shape(good)).toBe('')
    expect(shape(good.replace('postgresql://', 'postgres://'))).toBe('')
  })
  it('each wrong part is named, without the password', () => {
    expect(shape(good.replace('postgres.abcdefghijklmnopqrst@', 'postgres@'))).toBe('the user (before the password) should be postgres.<project ref> (postgres, a dot, then 20 letters and numbers).')
    expect(shape(good.replace('aws-0-eu-west-2.pooler.supabase.com', 'db.abcdefghijklmnopqrst.supabase.co'))).toBe('the address after @ should end with .pooler.supabase.com (the Session pooler address from Supabase → Connect).')
    expect(shape(good.replace(':5432', ':6543'))).toBe('the port is 6543 (the Transaction pooler): use the Session pooler, port 5432.')
    expect(shape(good.replace(':5432', ''))).toBe('the port (after the address) should be 5432.')
    expect(shape(good.replace(':5432/postgres', ':5432/other'))).toBe('the database name at the end should be postgres (…:5432/postgres).')
    expect(shape(good, '[my-password]')).toBe('it still has square brackets [ ]: remove them (only the password goes between : and @).')
    expect(shape(good, 'YOUR-PASSWORD')).toBe('it still contains YOUR-PASSWORD: put the database password in its place.')
    expect(shape(good, 'two words')).toBe('it contains a space (a space in the password must be written as %20).')
    expect(shape('mysql://x')).toBe('it is not in the form postgresql://postgres.<project ref>:<password>@<host>:5432/postgres.')
    for (const pw of ['Secret-Pw-123', '[Secret-Pw-123]', 'Secret Pw 123']) expect(shape(good, pw)).not.toContain('Secret')
  })
})

describe('the backup script uses them', () => {
  const s = readFileSync('scripts/backup-supabase.sh', 'utf8')
  it('loads the helper and explains every failed connection (both modes), with the secrets passed for removal', () => {
    expect(s).toContain('. "$ROOT/scripts/lib/backup-connect.sh"')
    expect(s).not.toContain('could not connect to the database. Check the password')
    expect(s).toContain('reason="$(connection_reason "$out" "$RAW_URL" "$RAW_PW" "$PGPASSWORD" "$SERVICE_KEY" "$PASSPHRASE")"')
    expect(s).toContain('sanitise_error "$out" "$RAW_URL" "$RAW_PW" "$PGPASSWORD" "$SERVICE_KEY" "$PASSPHRASE" | sed \'s/^/  Details: /\' >&2')
    expect(s).toContain('if out2="$(PGSSLMODE=require q \'show server_version_num\' 2>&1)"; then')
    expect(s).toContain('connect_or_explain\nunset RAW_URL RAW_PW')
  })
  it('checks the shape of HL_BACKUP_DB_URL before connecting (not for the local copy)', () => {
    expect(s).toContain('problems="$(url_shape_problems "$DB_URL" "$RAW_PW")"')
    expect(s.indexOf('url_shape_problems "$DB_URL"')).toBeLessThan(s.indexOf('connect_or_explain\n'))
    expect(s).toContain('if [ "${GITHUB_ACTIONS:-}" = true ]; then echo "::add-mask::$PGPASSWORD"; fi')
  })
})
