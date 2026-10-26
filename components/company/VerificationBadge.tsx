import { BadgeCheck, CircleCheck, Circle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Tooltip } from '@/components/ui/Tooltip'
import { VERIFICATION_INFO } from '@/lib/org-labels'
import { formatDate } from '@/lib/format'
import { badgeExplain } from '@/lib/verification'

/**
 * The business's verification level. `record` is the live recorded check (Jobs Phase 4): only then the new wording
 * with the next check date is shown; legacy badges keep their original wording (AB's fix F5).
 */
export function VerificationBadge({ level, verifiedAt, record = null }: { level: string | null; verifiedAt?: string | null; record?: { verified_at: string; ends_on: string } | null }) {
  const info = VERIFICATION_INFO[level ?? 'listed'] ?? VERIFICATION_INFO.listed
  const explain = badgeExplain(level, verifiedAt, record, formatDate, info.explain)
  const icon = level === 'verified' ? <BadgeCheck /> : level === 'claimed' ? <CircleCheck /> : <Circle />
  return (
    <Tooltip content={explain}>
      <Badge tone={level === 'verified' ? 'gold' : level === 'claimed' ? 'green' : 'neutral'} icon={icon}>
        {info.label}
      </Badge>
    </Tooltip>
  )
}
