import { BadgeCheck, CircleCheck, Circle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Tooltip } from '@/components/ui/Tooltip'
import { VERIFICATION_INFO } from '@/lib/org-labels'
import { formatDate } from '@/lib/format'

export function VerificationBadge({ level, verifiedAt }: { level: string | null; verifiedAt?: string | null }) {
  const info = VERIFICATION_INFO[level ?? 'listed'] ?? VERIFICATION_INFO.listed
  const explain = level === 'verified' && verifiedAt ? `Verified: HagerLand checked this business's trade licence on ${formatDate(verifiedAt)}.` : info.explain
  const icon = level === 'verified' ? <BadgeCheck /> : level === 'claimed' ? <CircleCheck /> : <Circle />
  return (
    <Tooltip content={explain}>
      <Badge tone={level === 'verified' ? 'gold' : level === 'claimed' ? 'green' : 'neutral'} icon={icon}>
        {info.label}
      </Badge>
    </Tooltip>
  )
}
