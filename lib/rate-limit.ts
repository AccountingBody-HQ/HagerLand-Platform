import { createClient } from '@supabase/supabase-js'

export async function isRateLimited(email: string, maxCount = 3, windowMinutes = 60): Promise<boolean> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
  const key = 'resend:' + email.toLowerCase().trim()
  const now = new Date()

  const { data } = await supabase
    .from('rate_limits')
    .select('count, reset_at')
    .eq('key', key)
    .single()

  if (!data || new Date(data.reset_at) < now) {
    // No entry or window expired — create/reset
    await supabase.from('rate_limits').upsert({
      key,
      count: 1,
      reset_at: new Date(now.getTime() + windowMinutes * 60 * 1000).toISOString(),
    })
    return false
  }

  if (data.count >= maxCount) return true

  await supabase.from('rate_limits')
    .update({ count: data.count + 1 })
    .eq('key', key)

  return false
}

export async function isAdminLoginRateLimited(ip: string, maxAttempts = 5, windowMinutes = 15): Promise<boolean> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
  const key = 'admin-login:' + ip
  const now = new Date()

  const { data } = await supabase
    .from('rate_limits')
    .select('count, reset_at')
    .eq('key', key)
    .single()

  if (!data || new Date(data.reset_at) < now) {
    await supabase.from('rate_limits').upsert({
      key,
      count: 1,
      reset_at: new Date(now.getTime() + windowMinutes * 60 * 1000).toISOString(),
    })
    return false
  }

  if (data.count >= maxAttempts) return true

  await supabase.from('rate_limits')
    .update({ count: data.count + 1 })
    .eq('key', key)

  return false
}

export async function clearAdminLoginRateLimit(ip: string): Promise<void> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
  await supabase.from('rate_limits').delete().eq('key', 'admin-login:' + ip)
}
