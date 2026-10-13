'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { CircleUserRound } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Supabase keeps the session in "sb-<project>-auth-token" cookies (split into .0, .1 … when large). */
const SESSION_COOKIE = /(?:^|;\s*)sb-[a-z0-9-]+-auth-token(?:\.\d+)?=/

/**
 * "Sign in" or "My account", decided in the browser so public pages stay cacheable.
 * Reads the session cookie instead of loading the Supabase client (keeps ~60 KB off every page);
 * re-checked on each navigation so it updates after signing in or out.
 */
export function AccountLink({ className, inverse }: { className?: string; inverse?: boolean }) {
  const [signedIn, setSignedIn] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setSignedIn(SESSION_COOKIE.test(document.cookie))
  }, [pathname])

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
