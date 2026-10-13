type Level = 'info' | 'warn' | 'error'

export function maskEmail(email: string | null | undefined): string {
  if (!email) return ''
  const [user, domain] = email.split('@')
  if (!domain) return '***'
  return `${user.slice(0, 1)}***@${domain}`
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  return digits.length <= 4 ? '***' : `***${digits.slice(-3)}`
}

function errorDetail(err: unknown): string | undefined {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message)
  return err === undefined ? undefined : String(err)
}

function write(level: Level, route: string, message: string, data?: Record<string, unknown>): void {
  const line = JSON.stringify({ level, route, message, ...data, at: new Date().toISOString() })
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

/** Structured server logging. Never pass raw emails, phones or IPs: mask or hash them first. */
export const log = {
  info: (route: string, message: string, data?: Record<string, unknown>) => write('info', route, message, data),
  warn: (route: string, message: string, data?: Record<string, unknown>) => write('warn', route, message, data),
  error: (route: string, message: string, err?: unknown, data?: Record<string, unknown>) => {
    const detail = errorDetail(err)
    write('error', route, message, { ...data, error: detail })
    // Server only: also count it in the errors table for the admin digest (loaded lazily, never awaited).
    if (typeof window === 'undefined' && process.env.NEXT_RUNTIME !== 'edge') {
      import('./error-store').then((m) => m.recordError(route, detail ? `${message}: ${detail}` : message)).catch(() => undefined)
    }
  },
}
