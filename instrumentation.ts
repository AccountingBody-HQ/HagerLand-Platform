/** Runs once when a server starts: reports missing or malformed environment variables clearly in the logs. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { serverEnv } = await import('./lib/env')
  try {
    serverEnv()
  } catch (err) {
    console.error(JSON.stringify({ level: 'error', route: 'startup', message: err instanceof Error ? err.message : String(err), at: new Date().toISOString() }))
  }
}
