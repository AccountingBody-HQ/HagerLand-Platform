import { ArrowRight, MessageSquareQuote } from 'lucide-react'
import { getRequestableCategory } from '@/lib/data/service-requests'
import { ButtonLink } from '@/components/ui/Button'

/** "Get quotes from up to three providers" for a service, shown only when that service can be requested. */
export async function RequestCta({ serviceSlug, serviceName, abroad }: { serviceSlug: string; serviceName: string; abroad?: boolean }) {
  const category = await getRequestableCategory(serviceSlug)
  if (!category) return null
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-green/25 bg-green-tint p-5 sm:flex-row sm:items-center">
      <MessageSquareQuote className="size-8 shrink-0 text-green" aria-hidden />
      <div className="flex-1">
        <p className="font-semibold text-ink">Don&apos;t want to call around?</p>
        <p className="text-small text-muted">Describe the job once and get quotes from up to three {serviceName.toLowerCase()}. Free, with no obligation.</p>
      </div>
      <ButtonLink href={`/request-service/${category.slug}${abroad ? '?abroad=1' : ''}`} className="shrink-0">
        Get quotes <ArrowRight />
      </ButtonLink>
    </div>
  )
}
