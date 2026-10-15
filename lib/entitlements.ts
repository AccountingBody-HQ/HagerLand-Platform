import 'server-only'
import { getSettingNumber } from '@/lib/data/reference'

/**
 * Plans and what they allow (spec 17.2). Every organisation is on the free plan with no limits while
 * paid plans do not exist (payments are deferred, spec 25.3). The only limit is the private-owner listing cap,
 * which AB sets in admin → Settings. New limits or plans are added here, never inside pages or actions.
 */
export const PLANS = ['free'] as const
export type Plan = (typeof PLANS)[number]

export interface Entitlements {
  /** Active (in review, live or paused) property listings; null means unlimited. */
  maxActiveListings: number | null
  maxActiveProducts: number | null
  maxActiveJobs: number | null
}

const PLAN_LIMITS: Record<Plan, Entitlements> = {
  free: { maxActiveListings: null, maxActiveProducts: null, maxActiveJobs: null },
}

export function isPlan(v: unknown): v is Plan {
  return typeof v === 'string' && (PLANS as readonly string[]).includes(v)
}

/** Limits for an organisation's plan (unknown plans fall back to free). */
export function organisationEntitlements(plan: string | null | undefined): Entitlements {
  return PLAN_LIMITS[isPlan(plan) ? plan : 'free']
}

/** Limits for a private owner listing without an organisation. */
export async function privateOwnerEntitlements(): Promise<Entitlements> {
  return { maxActiveListings: await getSettingNumber('private_owner_max_active_listings', 3), maxActiveProducts: 0, maxActiveJobs: 0 }
}

/** True when one more active item stays within the limit. */
export function withinLimit(limit: number | null, current: number): boolean {
  return limit === null || current < limit
}
