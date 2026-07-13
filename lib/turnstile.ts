const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export async function verifyTurnstileToken(token: string | null): Promise<boolean> {
  if (!token) return false
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    console.error('TURNSTILE_SECRET_KEY is not set')
    return false
  }

  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    })
    const data = await res.json()
    if (!data.success) {
      console.log('[Turnstile] Verification failed:', JSON.stringify(data))
    }
    return data.success === true
  } catch (err) {
    console.error('Turnstile verification failed:', err)
    return false
  }
}

// Honeypot: a hidden field real users never see or fill in.
// If it has a value, the submission is almost certainly a bot.
export function isHoneypotFilled(formData: FormData): boolean {
  const value = formData.get('hl_extra_field') as string | null
  const filled = !!value && value.trim().length > 0
  if (filled) {
    console.log('[Turnstile] Honeypot triggered, value was:', value)
  }
  return filled
}
