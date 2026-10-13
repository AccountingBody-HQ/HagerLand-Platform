'use client'

import { track as vercelTrack } from '@vercel/analytics'

export type AnalyticsEvent =
  | 'search_performed'
  | 'filter_applied'
  | 'listing_viewed'
  | 'contact_revealed'
  | 'enquiry_submitted'
  | 'quote_submitted'
  | 'materials_list_uploaded'
  | 'register_interest_submitted'
  | 'signup_started'
  | 'signup_completed'
  | 'listing_created'
  | 'listing_submitted'
  | 'org_created'
  | 'claim_submitted'
  | 'verification_submitted'

/** Cookieless analytics event. Never pass personal data (names, phones, emails, free text). */
export function track(event: AnalyticsEvent, props?: Record<string, string | number | boolean | null>): void {
  try {
    vercelTrack(event, props)
  } catch {
    // analytics must never break the page
  }
}
