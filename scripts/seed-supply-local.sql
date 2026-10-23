-- Local test data for Supply Phase 3 (run by scripts/seed-supply-local.sh, never against the live database).
-- Six partners in every relevant state, their contacts, prices covering every shortlist rule, and one quote in Bole.

create temporary table seed_places on commit drop as
select
  (select id from public.locations where path = 'addis-ababa/bole') as bole,
  (select id from public.locations where path = 'addis-ababa/kirkos') as kirkos,
  (select id from public.locations where path = 'addis-ababa/yeka') as yeka,
  (select id from public.locations where path = 'addis-ababa/lideta') as lideta,
  (select id from public.locations where path = 'addis-ababa/nifas-silk-lafto') as nifas,
  (select parent_id from public.locations where path = 'addis-ababa/bole') as addis,
  (select id from public.product_categories where slug = 'cement-concrete') as cement,
  (select id from public.product_categories where slug = 'steel-rebar') as steel,
  (select id from public.product_categories where slug = 'blocks-bricks') as blocks,
  (select id from public.product_categories where slug = 'corrugated-sheets') as roofing,
  (select id from public.product_categories where slug = 'tiles-flooring') as tiles,
  (select id from public.product_categories where slug = 'paint-decorating') as paint;

insert into public.organisations (id, kind, name, slug, status, source, location_id)
select v.id::uuid, 'supplier', v.name, v.slug, 'draft', 'admin', p.bole
from seed_places p, (values
  ('5eed0000-0000-4000-8000-000000000001', 'Abebe Building Materials (seed)', 'seed-abebe-building-materials'),
  ('5eed0000-0000-4000-8000-000000000002', 'Merkato Steel House (seed)', 'seed-merkato-steel-house'),
  ('5eed0000-0000-4000-8000-000000000003', 'Bole Trading (seed)', 'seed-bole-trading'),
  ('5eed0000-0000-4000-8000-000000000004', 'Contacted Cement Co (seed)', 'seed-contacted-cement'),
  ('5eed0000-0000-4000-8000-000000000005', 'Never Again Supplies (seed)', 'seed-never-again'),
  ('5eed0000-0000-4000-8000-000000000006', 'Declined Blocks Co (seed)', 'seed-declined-blocks')
) as v (id, name, slug)
on conflict (id) do nothing;

insert into public.supply_partners (org_id, relationship_status, roles, source, status_changed_at)
values
  ('5eed0000-0000-4000-8000-000000000001', 'active', '{wholesaler}', 'site_visit', now()),
  ('5eed0000-0000-4000-8000-000000000002', 'active', '{importer,distributor}', 'direct_call', now()),
  ('5eed0000-0000-4000-8000-000000000003', 'terms_agreed', '{retail_shop}', 'referral', now()),
  ('5eed0000-0000-4000-8000-000000000004', 'contacted', '{wholesaler}', 'direct_call', now()),
  ('5eed0000-0000-4000-8000-000000000005', 'do_not_contact', '{retail_shop}', 'direct_call', now()),
  ('5eed0000-0000-4000-8000-000000000006', 'declined', '{manufacturer}', 'direct_call', now())
on conflict (org_id) do nothing;

insert into public.supply_contacts (id, org_id, name, role, phone, phone_normalised, whatsapp, preferred_channel, consent_basis, do_not_contact)
values
  ('5eedc000-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-000000000001', 'Abebe (owner)', 'Owner', '0911 10 10 10', '+251911101010', null, 'phone', 'business_provided', false),
  ('5eedc000-0000-4000-8000-000000000002', '5eed0000-0000-4000-8000-000000000002', 'Sales desk', 'Sales', '0911 20 20 20', '+251911202020', '+251911202020', 'whatsapp', 'business_provided', false),
  ('5eedc000-0000-4000-8000-000000000003', '5eed0000-0000-4000-8000-000000000003', 'Former manager', 'Manager', '0911 30 30 30', '+251911303030', null, 'phone', 'verbal_consent', true),
  ('5eedc000-0000-4000-8000-000000000004', '5eed0000-0000-4000-8000-000000000004', 'Front desk', null, '0911 40 40 40', '+251911404040', null, 'phone', 'business_provided', false)
on conflict (id) do nothing;

-- Prices. Dates are relative to today, so freshness always shows as intended.
insert into public.supplier_offers (id, org_id, category_id, item_name, item_key, unit, pack_size, price_etb_cents, price_date, valid_until, min_order_qty, delivery_area_ids, delivery_charge_etb_cents, lead_time_days, vat_included, fx_linked, source, status)
select v.id::uuid, v.org::uuid, v.cat, v.item, v.key, v.unit, v.pack, v.price, current_date + v.dated, current_date + v.valid, v.min_order, v.areas, v.delivery, v.lead, v.vat, v.fx, 'direct_call', v.status
from seed_places p, lateral (values
  -- Abebe: fresh cement (pack of 50 kg) to Bole and Kirkos; rebar; hollow blocks with a minimum order; FX-linked tiles; paint with VAT unknown.
  ('5eed0f00-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-000000000001', p.cement, 'Dangote cement 50kg', 'dangote cement 50kg', 'bag', 50::numeric, 125000::bigint, -2, 5, null::numeric, array[p.bole, p.kirkos], 50000::bigint, 2, 'yes', false, 'current'),
  ('5eed0f00-0000-4000-8000-000000000002', '5eed0000-0000-4000-8000-000000000001', p.steel, 'Rebar 12mm', 'rebar 12mm', 'piece', null, 98000, -1, 6, null, array[p.bole], null, 3, 'yes', false, 'current'),
  ('5eed0f00-0000-4000-8000-000000000003', '5eed0000-0000-4000-8000-000000000001', p.blocks, 'Hollow block 20cm', 'hollow block 20cm', 'piece', null, 3850, -3, 27, 200, array[p.bole], 30000, 4, 'yes', false, 'current'),
  ('5eed0f00-0000-4000-8000-000000000004', '5eed0000-0000-4000-8000-000000000001', p.tiles, 'Ceramic floor tiles 60x60', 'ceramic floor tiles 60x60', 'm2', null, 85000, -1, 13, null, array[p.bole, p.lideta, p.nifas], null, 7, 'yes', true, 'current'),
  ('5eed0f00-0000-4000-8000-000000000005', '5eed0000-0000-4000-8000-000000000001', p.paint, 'Emulsion paint white', 'emulsion paint white', 'litre', null, 45000, -1, 29, null, array[p.bole], null, 2, 'unknown', false, 'current'),
  -- Merkato: an older cement price (superseded), a cheaper current one delivering city-wide, rebar priced per tonne (no pack size), roofing to Yeka only, paint with no delivery areas.
  ('5eed0f00-0000-4000-8000-000000000011', '5eed0000-0000-4000-8000-000000000002', p.cement, 'Dangote cement 50kg', 'dangote cement 50kg', 'bag', null, 119000, -20, -13, null, array[p.addis], 100000, 1, 'yes', false, 'superseded'),
  ('5eed0f00-0000-4000-8000-000000000012', '5eed0000-0000-4000-8000-000000000002', p.cement, 'Dangote cement 50kg', 'dangote cement 50kg', 'bag', null, 123000, -1, 6, null, array[p.addis], 100000, 1, 'yes', false, 'current'),
  ('5eed0f00-0000-4000-8000-000000000013', '5eed0000-0000-4000-8000-000000000002', p.steel, 'Rebar 12mm', 'rebar 12mm', 'tonne', null, 9500000, -1, 6, null, array[p.addis], null, 2, 'yes', true, 'current'),
  ('5eed0f00-0000-4000-8000-000000000014', '5eed0000-0000-4000-8000-000000000002', p.roofing, 'Corrugated roofing sheet 0.3mm', 'corrugated roofing sheet 0 3mm', 'sheet', null, 52000, -2, 28, null, array[p.yeka], null, 3, 'yes', true, 'current'),
  ('5eed0f00-0000-4000-8000-000000000015', '5eed0000-0000-4000-8000-000000000002', p.paint, 'Emulsion paint white', 'emulsion paint white', 'litre', null, 41000, -1, 29, null, '{}'::uuid[], null, 2, 'yes', false, 'current'),
  -- Bole Trading (trial): an ageing cement price; cheaper hollow blocks; an expired rebar price.
  ('5eed0f00-0000-4000-8000-000000000021', '5eed0000-0000-4000-8000-000000000003', p.cement, 'Dangote cement 50kg', 'dangote cement 50kg', 'bag', null, 127000, -20, 5, null, array[p.bole], null, 1, 'yes', false, 'current'),
  ('5eed0f00-0000-4000-8000-000000000022', '5eed0000-0000-4000-8000-000000000003', p.blocks, 'Hollow block 20cm', 'hollow block 20cm', 'piece', null, 3600, -2, 28, null, array[p.bole], 20000, 2, 'yes', false, 'current'),
  ('5eed0f00-0000-4000-8000-000000000023', '5eed0000-0000-4000-8000-000000000003', p.steel, 'Rebar 12mm', 'rebar 12mm', 'piece', null, 95000, -12, -5, null, array[p.bole], null, 2, 'yes', false, 'current'),
  -- Partners that are never suggested, whatever their prices.
  ('5eed0f00-0000-4000-8000-000000000031', '5eed0000-0000-4000-8000-000000000004', p.cement, 'Dangote cement 50kg', 'dangote cement 50kg', 'bag', null, 110000, -1, 6, null, array[p.bole], null, 1, 'yes', false, 'current'),
  ('5eed0f00-0000-4000-8000-000000000041', '5eed0000-0000-4000-8000-000000000005', p.cement, 'Dangote cement 50kg', 'dangote cement 50kg', 'bag', null, 109000, -1, 6, null, array[p.bole], null, 1, 'yes', false, 'current'),
  ('5eed0f00-0000-4000-8000-000000000051', '5eed0000-0000-4000-8000-000000000006', p.blocks, 'Hollow block 20cm', 'hollow block 20cm', 'piece', null, 3000, -1, 29, null, array[p.bole], null, 1, 'yes', false, 'current')
) as v (id, org, cat, item, key, unit, pack, price, dated, valid, min_order, areas, delivery, lead, vat, fx, status)
on conflict (id) do nothing;

-- One customer quote from a materials list, delivered to Bole.
insert into public.quote_requests (id, reference, name, phone, email, delivery_location_id, delivery_address, needed_by, notes, source)
select '5eed9000-0000-4000-8000-000000000001', 'HLQ-SEED-BOLE', 'Seed Customer', '+251911909090', 'seed-customer@test.hagerland.invalid', p.bole, 'Near Edna Mall', current_date + 14, 'Materials for a G+1 house. List attached.', 'materials_list'
from seed_places p
on conflict (id) do nothing;
insert into public.quote_request_items (id, quote_request_id, free_text_item, quantity, unit)
values
  ('5eed9100-0000-4000-8000-000000000001', '5eed9000-0000-4000-8000-000000000001', 'Dangote cement 50kg', 50, 'bag'),
  ('5eed9100-0000-4000-8000-000000000002', '5eed9000-0000-4000-8000-000000000001', 'Rebar 12mm', 100, 'piece')
on conflict (id) do nothing;
