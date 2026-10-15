import { NextResponse, type NextRequest } from 'next/server'
import { getUser } from '@/lib/auth'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { rateLimit } from '@/lib/rate-limit'
import { log } from '@/lib/log'

export const dynamic = 'force-dynamic'

/**
 * "Download my data" (spec 25.4, privacy policy): everything HagerLand holds that is linked to the
 * signed-in account, as one JSON file. Secrets (tokens, password data) are never included.
 */
export async function GET(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.redirect(new URL('/login?next=/account/settings', request.url))
  if (!(await rateLimit(`export:${user.id}`, 5, 3600)).allowed) return NextResponse.json({ error: 'Please try again in an hour.' }, { status: 429 })
  const db = getAdminSupabase()
  const id = user.id
  const email = user.email?.toLowerCase() ?? ''
  try {
    const [profile, memberships, listings, enquiries, quotes, serviceRequests, saved, searches, quoteList, applications, candidate, trade, interest] = await Promise.all([
      db.from('profiles').select('*').eq('id', id).maybeSingle(),
      db.from('organisation_members').select('role, created_at, organisations(name, slug, kind)').eq('user_id', id),
      db.from('properties').select('id, title, slug, status, purpose, property_type, price_etb, created_at, updated_at').eq('lister_user_id', id),
      db.from('enquiries').select('reference, target_type, name, phone, email, message, intent, created_at').eq('sender_user_id', id),
      db.from('quote_requests').select('reference, status, name, phone, email, notes, created_at').eq('requester_user_id', id),
      db.from('service_requests').select('reference, title, details, status, created_at').eq('requester_user_id', id),
      db.from('saved_items').select('entity_type, entity_id, created_at').eq('user_id', id),
      db.from('saved_searches').select('name, params, alert_frequency, created_at').eq('user_id', id),
      db.from('quote_lists').select('items, updated_at').eq('user_id', id).maybeSingle(),
      db.from('job_applications').select('reference, name, email, phone, cover_note, status, created_at').eq('applicant_user_id', id),
      db.from('candidate_profiles').select('full_name, headline, skills, qualifications, experience_years, experience, availability, visibility, placement_wanted, created_at, updated_at').eq('user_id', id).maybeSingle(),
      db.from('trade_accounts').select('reference, business_name, trade_type, phone, tin, status, created_at').eq('user_id', id).maybeSingle(),
      email ? db.from('interest_registrations').select('reference, vertical_key, category, name, email, phone, message, marketing_consent, created_at').eq('email', email) : Promise.resolve({ data: [] }),
    ])
    const body = {
      exported_at: new Date().toISOString(),
      account: { id, email: user.email, created_at: user.created_at },
      profile: profile.data,
      organisations: memberships.data ?? [],
      listings: listings.data ?? [],
      enquiries_sent: enquiries.data ?? [],
      quote_requests: quotes.data ?? [],
      service_requests: serviceRequests.data ?? [],
      saved_items: saved.data ?? [],
      saved_searches: searches.data ?? [],
      quote_list: quoteList.data,
      job_applications: applications.data ?? [],
      candidate_profile: candidate.data,
      trade_account: trade.data,
      interest_registrations: interest.data ?? [],
    }
    return new NextResponse(JSON.stringify(body, null, 2), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="hagerland-my-data-${new Date().toISOString().slice(0, 10)}.json"`, 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    log.error('account', 'data export failed', err)
    return NextResponse.json({ error: 'We could not prepare your data. Please try again.' }, { status: 500 })
  }
}
