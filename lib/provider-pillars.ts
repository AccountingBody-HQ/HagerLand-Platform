import type { PillarKey } from '@/lib/pillars'

/**
 * The pillars a business can say it serves (spec 26.12), with the default ticks for each kind of business.
 * Advice is HagerLand's own content, so it is not offered here.
 */
export const PROVIDER_PILLAR_KEYS = ['buy', 'rent', 'build', 'maintain', 'manage', 'finance', 'insurance', 'supplies', 'jobs'] as const satisfies readonly PillarKey[]
export type ProviderPillarKey = (typeof PROVIDER_PILLAR_KEYS)[number]

export const PROVIDER_PILLAR_LABEL: Record<ProviderPillarKey, string> = {
  buy: 'Buying and selling property',
  rent: 'Renting and letting',
  build: 'Design, building and development',
  maintain: 'Repairs and maintenance',
  manage: 'Property management',
  finance: 'Property finance',
  insurance: 'Property insurance',
  supplies: 'Building and construction supplies',
  jobs: 'Jobs, recruitment and staffing',
}

export function defaultPillarsForKind(kind: string): ProviderPillarKey[] {
  switch (kind) {
    case 'agency':
      return ['buy', 'rent']
    case 'developer':
      return ['buy', 'build']
    case 'supplier':
    case 'manufacturer':
      return ['supplies']
    case 'contractor':
    case 'professional_firm':
      return ['build']
    case 'sole_trader':
      return ['maintain']
    default:
      return []
  }
}
