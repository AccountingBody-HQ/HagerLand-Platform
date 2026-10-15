import { NextResponse, type NextRequest } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { audit } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { toCsv } from '@/lib/admin/csv'
import { enquiriesPerOrg, listingReport, periodFrom, quoteReport, signupSeries } from '@/lib/admin/reports'
import { lastMonths, monthlyReport } from '@/lib/admin/aggregate'
import { agencyKpis } from '@/lib/admin/agency-reports'
import { demandReport, SOURCE_LABEL } from '@/lib/admin/demand'
import { pillarKpis } from '@/lib/admin/performance'

export const dynamic = 'force-dynamic'

/** CSV exports for admin lists (spec 18.2: enquiries, quotes, sales leads, catalogue, reports). */
export async function GET(request: NextRequest, props: { params: Promise<{ kind: string }> }) {
  const params = await props.params
  if (!(await isAdminRequest())) return new NextResponse('Unauthorized', { status: 401 })
  const db = getAdminSupabase()
  const sp = request.nextUrl.searchParams
  let rows: Record<string, unknown>[] = []
  let columns: string[] | undefined

  switch (params.kind) {
    case 'properties': {
      const { data } = await db.from('properties').select('short_id, title, status, purpose, property_type, price_etb, price_on_request, bedrooms, bathrooms, area_m2, lister_type, is_hagerland, is_featured, views_count, enquiries_count, published_at, expires_at, created_at').order('created_at', { ascending: false }).limit(20000)
      rows = data ?? []
      break
    }
    case 'organisations': {
      const { data } = await db.from('organisations').select('short_id, name, kind, status, verification_level, phone, whatsapp, email, website, source, plan, views_count, enquiries_count, created_at').order('created_at', { ascending: false }).limit(20000)
      rows = data ?? []
      break
    }
    case 'developments': {
      const { data } = await db.from('developments').select('short_id, name, kind, status, is_hagerland, completion_status, floors_label, total_units, price_from_etb, price_to_etb, created_at').order('created_at', { ascending: false }).limit(20000)
      rows = data ?? []
      break
    }
    case 'products': {
      const { data } = await db.from('products').select('sku, name, status, unit, price_type, price_etb_cents, stock_status, lead_time_days, price_updated_at, category:product_categories(slug)').order('name').limit(20000)
      rows = (data ?? []).map((p) => ({ ...p, category: (p.category as { slug: string } | null)?.slug ?? '', price_etb: p.price_etb_cents === null ? '' : (p.price_etb_cents / 100).toFixed(2), price_etb_cents: undefined }))
      columns = ['sku', 'name', 'category', 'status', 'unit', 'price_type', 'price_etb', 'stock_status', 'lead_time_days', 'price_updated_at']
      break
    }
    case 'enquiries':
    case 'sales': {
      let q = db.from('enquiries').select('reference, created_at, status, target_type, intent, name, phone, email, preferred_contact, message, details, source_url, utm, first_viewed_at').order('created_at', { ascending: false }).limit(20000)
      if (params.kind === 'sales') q = q.or('target_type.eq.hagerland_development,intent.eq.register_interest,details->>topic.like.Agency:*')
      if (sp.get('status')) q = q.eq('status', sp.get('status') as 'new')
      const { data } = await q
      rows = data ?? []
      break
    }
    case 'quotes': {
      const { data } = await db.from('quote_requests').select('reference, created_at, status, source, name, phone, email, company_name, delivery_address, needed_by, quoted_total_etb_cents, quoted_at, assigned_to, notes').order('created_at', { ascending: false }).limit(20000)
      rows = (data ?? []).map((q) => ({ ...q, quoted_total_etb: q.quoted_total_etb_cents === null ? '' : (q.quoted_total_etb_cents / 100).toFixed(2), quoted_total_etb_cents: undefined }))
      columns = ['reference', 'created_at', 'status', 'source', 'name', 'phone', 'email', 'company_name', 'delivery_address', 'needed_by', 'quoted_total_etb', 'quoted_at', 'assigned_to', 'notes']
      break
    }
    case 'interest': {
      let q = db.from('interest_registrations').select('reference, created_at, vertical_key, audience, category, name, email, phone, country_code, city, message, marketing_consent, consent_at, status, source_url').order('created_at', { ascending: false }).limit(50000)
      const v = sp.get('vertical')
      if (v) q = q.eq('vertical_key', v)
      if (sp.get('category')) q = q.eq('category', sp.get('category') ?? '')
      if (sp.get('status')) q = q.eq('status', sp.get('status') ?? '')
      const { data } = await q
      rows = data ?? []
      break
    }
    case 'partners': {
      const { data } = await db.from('partner_applications').select('reference, created_at, vertical_key, partner_type, organisation_name, contact_name, email, phone, country_code, website, licence_details, message, status').order('created_at', { ascending: false }).limit(20000)
      rows = data ?? []
      break
    }
    case 'service-requests': {
      let q = db.from('service_requests').select('reference, created_at, status, closed_reason, urgency, vertical_key, title, budget_band, country_code, currency, name, phone, email, source_url').order('created_at', { ascending: false }).limit(50000)
      const st = sp.get('status')
      if (st === 'open') q = q.in('status', ['submitted', 'triaged', 'matched', 'quoted'])
      else if (st) q = q.eq('status', st)
      if (sp.get('vertical')) q = q.eq('vertical_key', sp.get('vertical') ?? '')
      if (sp.get('urgency')) q = q.eq('urgency', sp.get('urgency') ?? '')
      const { data } = await q
      rows = data ?? []
      break
    }
    case 'deals': {
      const { data } = await db.from('deals').select('reference, created_at, closed_at, source_type, title, status, currency, value_minor, commission_minor, lead_fee_minor, notes').order('created_at', { ascending: false }).limit(50000)
      const major = (n: number | null) => (n === null ? '' : (n / 100).toFixed(2))
      rows = (data ?? []).map((d) => ({ ...d, value: major(d.value_minor), commission: major(d.commission_minor), lead_fee: major(d.lead_fee_minor) }))
      columns = ['reference', 'created_at', 'closed_at', 'source_type', 'title', 'status', 'currency', 'value', 'commission', 'lead_fee', 'notes']
      break
    }
    case 'report-revenue': {
      const months = lastMonths(12)
      const since = `${months[0]}-01T00:00:00Z`
      const [{ data: deals }, { data: reqs }, { data: enqs }, { data: quotes }] = await Promise.all([
        db.from('deals').select('closed_at, created_at, status, currency, value_minor, commission_minor, lead_fee_minor').limit(50000),
        db.from('service_requests').select('created_at').gte('created_at', since).limit(50000),
        db.from('enquiries').select('created_at').gte('created_at', since).limit(50000),
        db.from('quote_requests').select('created_at').gte('created_at', since).limit(50000),
      ])
      const report = monthlyReport(months, { requests: (reqs ?? []).map((r) => r.created_at), enquiries: (enqs ?? []).map((r) => r.created_at), quoteRequests: (quotes ?? []).map((r) => r.created_at), deals: deals ?? [] })
      rows = report.flatMap((r) => {
        const base = { month: r.month, service_requests: r.requests, enquiries: r.enquiries, supply_quotes: r.quoteRequests, deals_won: r.dealsWon }
        const money = Object.entries(r.money)
        return money.length
          ? money.map(([currency, m]) => ({ ...base, currency, deal_value: (m.value / 100).toFixed(2), commission: (m.commission / 100).toFixed(2), lead_fees: (m.leadFees / 100).toFixed(2) }))
          : [{ ...base, currency: '', deal_value: '', commission: '', lead_fees: '' }]
      })
      break
    }
    case 'property-care': {
      const { data } = await db.from('property_care_requests').select('reference, created_at, status, name, email, phone, country_code, city, time_zone, contact_time, property_type, occupancy, services, message, marketing_consent').order('created_at', { ascending: false }).limit(20000)
      rows = (data ?? []).map((r) => ({ ...r, services: r.services.join('; ') }))
      break
    }
    case 'audit': {
      const { data } = await db.from('audit_log').select('created_at, actor, action, entity_type, entity_label, entity_id, diff').order('created_at', { ascending: false }).limit(20000)
      rows = data ?? []
      break
    }
    case 'search-misses': {
      const { data } = await db.from('search_misses').select('q_normalised, vertical, count, last_seen_at').order('count', { ascending: false }).limit(5000)
      rows = data ?? []
      break
    }
    case 'report-listings': {
      const r = await listingReport()
      rows = [...r.byStatus.map((x) => ({ group: 'status', value: x.key, count: x.count })), ...r.byType.map((x) => ({ group: 'live by type', value: x.key, count: x.count })), ...r.byLocation.map((x) => ({ group: 'live by location', value: x.key, count: x.count }))]
      break
    }
    case 'report-enquiries-per-org': {
      rows = await enquiriesPerOrg(periodFrom(sp.get('period') ?? undefined).since)
      break
    }
    case 'report-quotes': {
      const r = await quoteReport(periodFrom(sp.get('period') ?? undefined).since)
      rows = r.byMonth.map((m) => ({ month: m.key, quotes: m.count, total_etb: (m.total / 100).toFixed(2) }))
      break
    }
    case 'report-signups': {
      const r = await signupSeries(52)
      rows = r.signups.map((s, i) => ({ week_starting: s.week, signups: s.count, enquiries: r.enquiries[i]?.count ?? 0 }))
      break
    }
    case 'demand': {
      // One calendar month (spec 26.13 monthly export), every demand signal with its pillar, category, place and country.
      const month = /^\d{4}-\d{2}$/.test(sp.get('month') ?? '') ? (sp.get('month') as string) : new Date().toISOString().slice(0, 7)
      const start = new Date(`${month}-01T00:00:00Z`)
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1))
      const r = await demandReport(start, end)
      rows = r.signals.map((x) => ({ date: x.at.slice(0, 10), source: SOURCE_LABEL[x.source], pillar: x.pillar ?? '', category: x.category, place: x.place, country: x.country, count: x.weight }))
      columns = ['date', 'source', 'pillar', 'category', 'place', 'country', 'count']
      break
    }
    case 'performance': {
      const days = Math.min(3650, Math.max(1, Number(sp.get('days') ?? 90) || 90))
      rows = (await pillarKpis(new Date(Date.now() - days * 86_400_000))).map((k) => ({ pillar: k.pillar, leads: k.leads, median_first_response_hours: k.medianFirstResponseHours ?? '', won: k.won, conversion_percent: k.conversion ?? '', revenue_etb: k.revenueEtb, live_listings: k.activeListings ?? '', live_providers: k.providers }))
      break
    }
    case 'newsletter': {
      const { data } = await db.from('newsletter_subscriptions').select('email, name, consent_at, consent_text, source').eq('status', 'subscribed').order('created_at').limit(50000)
      rows = data ?? []
      break
    }
    case 'agency-instructions': {
      const { data } = await db.from('agency_instructions').select('reference, created_at, stage, purpose, title, address_line, fee_type, fee_percent, fee_amount_etb, agency_type, term_start, term_end, asking_price_etb, final_price_etb, assigned_agent, source, live_at, completed_at').order('created_at', { ascending: false }).limit(20000)
      rows = data ?? []
      break
    }
    case 'agency-report': {
      const days = Math.min(3650, Math.max(1, Number(sp.get('days') ?? 90) || 90))
      const k = await agencyKpis(new Date(Date.now() - days * 86_400_000))
      rows = [
        { measure: 'Open instructions', value: k.openInstructions },
        ...Object.entries(k.byStage).map(([stage, n]) => ({ measure: `Open instructions: ${stage}`, value: n })),
        { measure: `Valuations requested (last ${days} days)`, value: k.valuations },
        { measure: 'Valuations booked or done', value: k.valuationsBooked },
        { measure: 'Viewings requested', value: k.viewings },
        { measure: 'Offers received', value: k.offers },
        { measure: 'Offers accepted', value: k.offersAccepted },
        { measure: 'Applications to rent', value: k.applications },
        { measure: 'Completions', value: k.completions },
        { measure: 'Average days on market', value: k.avgDaysOnMarket ?? '' },
        { measure: 'Fee income (ETB)', value: k.feeIncomeEtb },
        { measure: 'Active tenancies', value: k.tenanciesActive },
      ]
      break
    }
    default:
      return new NextResponse('Unknown export', { status: 404 })
  }

  await audit('export.csv', { type: params.kind, label: `${rows.length} rows` })
  const stamp = new Date().toISOString().slice(0, 10)
  return new NextResponse(`﻿${toCsv(rows, columns)}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="hagerland-${params.kind}-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
