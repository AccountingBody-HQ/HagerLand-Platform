'use client'

import { cn } from '@/lib/cn'
import { useI18n } from '@/lib/i18n/client'

export function SoonBadge({ className, long }: { className?: string; long?: boolean }) {
  const { t } = useI18n()
  return <span className={cn('inline-flex items-center rounded-full bg-gold-soft px-2 py-0.5 text-caption font-semibold text-gold-dark', className)}>{long ? t('Coming soon') : t('Soon')}</span>
}
