import { BadgeCheck } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { brand } from '@/lib/brand'

const NEW_DAYS = 7

export function isNew(publishedAt: string | null | undefined): boolean {
  return Boolean(publishedAt && Date.now() - new Date(publishedAt).getTime() < NEW_DAYS * 86_400_000)
}

export function PropertyBadges({
  purpose,
  publishedAt,
  isFeatured,
  isHagerland,
  listerVerification,
  className,
  onImage,
}: {
  purpose: string | null
  publishedAt: string | null
  isFeatured: boolean | null
  isHagerland: boolean | null
  listerVerification: string | null
  className?: string
  onImage?: boolean
}) {
  return (
    <div className={`flex flex-wrap gap-1.5 ${className ?? ''}`}>
      {isHagerland && <Badge tone="gold">{brand.divisions.developments.replace('Developments', 'Development')}</Badge>}
      {isFeatured && <Badge tone="ink">Featured</Badge>}
      <Badge tone={onImage ? 'white' : 'neutral'}>{purpose === 'rent' ? 'To rent' : 'For sale'}</Badge>
      {isNew(publishedAt) && <Badge tone="green">New</Badge>}
      {listerVerification === 'verified' && !isHagerland && (
        <Badge tone={onImage ? 'white' : 'gold'} icon={<BadgeCheck className="text-gold" />}>
          Verified agent
        </Badge>
      )}
    </div>
  )
}
