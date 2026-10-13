import { NextResponse, type NextRequest } from 'next/server'
import { isAdminRequest } from '@/lib/admin-auth'
import { audit } from '@/lib/admin/guard'
import { getAdminSupabase } from '@/lib/supabase/admin'
import { toCsv } from '@/lib/admin/csv'

export const dynamic = 'force-dynamic'

/** CSV exports for admin lists (spec 18.2: enquiries, quotes, sales leads, catalogue, reports). */
export async function GET(request: NextRequest, { params }: { params: { kind: string } }) {
  if (!isAdminRequest()) return new NextResponse('Unauthorized', { status: 401 })
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
      if (params.kind === 'sales') q = q.or('target_type.eq.hagerland_development,intent.eq.register_interest')
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
