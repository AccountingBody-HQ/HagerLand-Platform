'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Languages } from 'lucide-react'
import { cn } from '@/lib/cn'
import { AM_PREFIX, stripLocale } from '@/lib/i18n/config'
import { useI18n } from '@/lib/i18n/client'

/** Switches the current page between English and Amharic (only rendered while Amharic is switched on). */
export function LanguageSwitch({ className, inverse }: { className?: string; inverse?: boolean }) {
  const pathname = usePathname() ?? '/'
  const { locale } = useI18n()
  const page = stripLocale(pathname)
  const href = locale === 'am' ? page : page === '/' ? AM_PREFIX : `${AM_PREFIX}${page}`
  return (
    <Link href={href} hrefLang={locale === 'am' ? 'en' : 'am'} lang={locale === 'am' ? 'en' : 'am'} className={cn('inline-flex min-h-11 items-center gap-2 font-semibold', inverse ? 'text-white/80 hover:text-white' : 'text-ink hover:text-green', className)}>
      <Languages className="size-4" aria-hidden />
      {locale === 'am' ? 'English' : 'አማርኛ'}
    </Link>
  )
}
