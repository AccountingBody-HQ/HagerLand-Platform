'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { CircleUserRound } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/browser'
import { cn } from '@/lib/cn'

/** "Sign in" or "My account", decided in the browser so public pages stay cacheable. */
export function AccountLink({ className, inverse }: { className?: string; inverse?: boolean }) {
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)))
    return () => data.subscription.unsubscribe()
  }, [])

  return (
    <Link
      href={signedIn ? '/account' : '/login'}
      className={cn(
        'inline-flex h-11 items-center gap-2 rounded-md px-3 text-[0.9375rem] font-semibold transition-colors',
        inverse ? 'text-white hover:bg-white/10' : 'text-ink hover:bg-stone-100',
        className,
      )}
    >
      {signedIn && <CircleUserRound className="size-5" aria-hidden />}
      {signedIn ? 'My account' : 'Sign in'}
    </Link>
  )
}
