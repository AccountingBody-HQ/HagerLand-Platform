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

-- ---------------------------------------------------------------------------
-- Phase 4: agreements (A, B, both, expired, terminated; none for the others), and one quote with 18 orders covering
-- every status of both money models, with payments, refunds, a reversal, fees, commission and delivery proof.
-- ---------------------------------------------------------------------------
insert into public.supply_agreements (id, org_id, money_model, commission_rate_bps, payment_terms, credit_days, start_date, end_date, status, terminated_reason, created_by)
values
  ('5eeda000-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-000000000001', 'A', null, 'Bank transfer within 7 days of delivery', 7, current_date - 60, null, 'active', null, 'seed'),
  ('5eeda000-0000-4000-8000-000000000002', '5eed0000-0000-4000-8000-000000000002', 'B', 500, 'Commission invoiced monthly', 30, current_date - 30, null, 'active', null, 'seed'),
  ('5eeda000-0000-4000-8000-000000000003', '5eed0000-0000-4000-8000-000000000002', 'A', null, null, null, current_date - 400, current_date - 31, 'terminated', 'Replaced by the commission agreement', 'seed'),
  ('5eeda000-0000-4000-8000-000000000004', '5eed0000-0000-4000-8000-000000000003', 'both', 400, 'Cash on delivery', 0, current_date - 10, current_date + 355, 'active', null, 'seed'),
  ('5eeda000-0000-4000-8000-000000000005', '5eed0000-0000-4000-8000-000000000003', 'A', null, null, null, current_date - 500, current_date - 135, 'expired', null, 'seed')
on conflict (id) do nothing;

create or replace function pg_temp.seed_pay(p_order uuid, p_type text, p_dir text, p_amount bigint, p_extra jsonb default '{}')
returns uuid language plpgsql as $$
declare
  o public.supply_orders;
  new_id uuid;
begin
  select * into o from public.supply_orders where id = p_order;
  insert into public.supply_ledger_entries (entry_type, direction, amount_cents, occurred_on, method, reference, original_currency, original_amount_minor, fx_rate, order_id, org_id, quote_request_id, reverses_entry_id, reason, created_by)
  values (p_type, p_dir, p_amount, current_date, coalesce(p_extra->>'method', 'bank_transfer'), p_extra->>'reference', p_extra->>'currency', (p_extra->>'original')::bigint, (p_extra->>'rate')::numeric,
          p_order, o.org_id, o.quote_request_id, (p_extra->>'reverses')::uuid, p_extra->>'reason', 'seed')
  returning id into new_id;
  return new_id;
end
$$;

create or replace function pg_temp.seed_step(p_order uuid, p_to text, p_reason text default null)
returns void language sql as $$
  update public.supply_orders set status = p_to, status_reason = p_reason, updated_by = 'seed' where id = p_order
$$;

create or replace function pg_temp.seed_proof(p_order uuid, p_n int)
returns void language sql as $$
  insert into public.supply_delivery_proofs (order_id, file_path, file_type, file_size_bytes, taken_at, received_by_name, received_by_phone, note, uploaded_by)
  values (p_order, 'proofs/' || p_order || '/5eedf000-0000-4000-8000-00000000000' || p_n || case when p_n = 1 then '.png' else '.pdf' end,
          case when p_n = 1 then 'image/png' else 'application/pdf' end, 400, now() - interval '1 hour', 'Site foreman', '+251911505050', 'Seed delivery proof', 'seed')
$$;

do $$
declare
  q constant uuid := '5eed9000-0000-4000-8000-000000000002';
  oid uuid;
  wrong uuid;
  fee uuid;
  total bigint;
  -- Model A orders 1–10 and model B orders 11–18, each walked to its target status through the real rules.
  targets constant text[] := array['draft', 'awaiting_payment', 'paid', 'placed', 'confirmed', 'out_for_delivery', 'delivered', 'completed', 'cancelled', 'disputed',
                                    'draft', 'placed', 'confirmed', 'out_for_delivery', 'delivered', 'completed', 'cancelled', 'disputed'];
  a_path constant text[] := array['awaiting_payment', 'paid', 'placed', 'confirmed', 'out_for_delivery', 'delivered', 'completed'];
  b_path constant text[] := array['placed', 'confirmed', 'out_for_delivery', 'delivered', 'completed'];
  model text;
  target text;
  stop_at text;
  step text;
begin
  if exists (select 1 from public.supply_orders where quote_request_id = q) then
    return;
  end if;
  insert into public.quote_requests (id, reference, name, phone, email, delivery_location_id, needed_by, notes, source, status)
  select q, 'HLQ-SEED-ORDERS', 'Seed Diaspora Customer', '+447700900123', 'seed-orders@test.hagerland.invalid', id, current_date + 21, 'House build in Bole, paying from London.', 'materials_list', 'accepted'
  from public.locations where path = 'addis-ababa/bole';
  for i in 1..18 loop
    model := case when i <= 10 then 'A' else 'B' end;
    target := targets[i];
    oid := ('5eed0d00-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid;
    insert into public.quote_request_items (id, quote_request_id, free_text_item, quantity, unit, added_by_admin)
    values (('5eed9200-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, q, 'Seed item ' || i || ' (cement 50kg)', 10, 'bag', false);
    insert into public.supply_quote_lines (id, quote_request_id, quote_item_id, org_id, status, unit, unit_price_cents, quantity, delivery_charge_cents, asked_at, received_at, chosen_at, reason, created_by)
    values (('5eed9300-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, q, ('5eed9200-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
            case when model = 'A' then '5eed0000-0000-4000-8000-000000000001' else '5eed0000-0000-4000-8000-000000000002' end::uuid,
            'chosen', 'bag', 120000 + i * 1000, 10, 20000, now(), now(), now(), 'Seed', 'seed');
    insert into public.supply_orders (id, quote_request_id, org_id, agreement_id, money_model, commission_rate_bps, supplier_delivery_charge_cents, customer_delivery_charge_cents, created_by, updated_by)
    values (oid, q, case when model = 'A' then '5eed0000-0000-4000-8000-000000000001' else '5eed0000-0000-4000-8000-000000000002' end::uuid,
            case when model = 'A' then '5eeda000-0000-4000-8000-000000000001' else '5eeda000-0000-4000-8000-000000000002' end::uuid,
            model, case when model = 'B' then 500 end, 20000, case when model = 'A' then 30000 end, 'seed', 'seed');
    insert into public.supply_order_lines (order_id, supply_quote_line_id, quote_item_id, item_name, quantity, unit, supplier_unit_price_cents, customer_unit_price_cents, vat_flag)
    values (oid, ('5eed9300-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid, ('5eed9200-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
            'Seed item ' || i || ' (cement 50kg)', 10, 'bag', 120000 + i * 1000, case when model = 'A' then round((120000 + i * 1000) * 1.1) end, 'yes');

    -- How far along the path to go before the final step.
    stop_at := case target when 'cancelled' then (case when model = 'A' then 'paid' else 'placed' end) when 'disputed' then (case when model = 'A' then 'out_for_delivery' else 'delivered' end) else target end;
    if stop_at <> 'draft' then
      foreach step in array (case when model = 'A' then a_path else b_path end) loop
        if model = 'A' and step = 'awaiting_payment' then
          perform pg_temp.seed_step(oid, step);
          total := public.supply_order_customer_total_cents(oid);
          if stop_at = 'awaiting_payment' then
            perform pg_temp.seed_pay(oid, 'customer_payment', 'in', total / 2, '{"method": "telebirr", "reference": "SEED-PART"}');
          elsif i = 8 then
            -- The completed order was paid from London in pounds.
            perform pg_temp.seed_pay(oid, 'customer_payment', 'in', total, jsonb_build_object('method', 'bank_transfer', 'reference', 'SEED-GBP', 'currency', 'GBP', 'original', round(total / 72.5), 'rate', 72.5));
          else
            perform pg_temp.seed_pay(oid, 'customer_payment', 'in', total, '{"method": "cbe_birr", "reference": "SEED-FULL"}');
          end if;
        else
          if step = 'completed' then
            perform pg_temp.seed_proof(oid, 1);
          end if;
          perform pg_temp.seed_step(oid, step);
        end if;
        exit when step = stop_at;
      end loop;
    end if;
    if target = 'cancelled' then
      perform pg_temp.seed_step(oid, 'cancelled', 'Customer changed the order');
      if model = 'A' then
        perform pg_temp.seed_pay(oid, 'refund', 'out', public.supply_order_paid_cents(oid), '{"reference": "SEED-REFUND"}');
      end if;
    elsif target = 'disputed' then
      perform pg_temp.seed_step(oid, 'disputed', 'Five bags arrived damaged');
    end if;

    if model = 'A' and target = 'completed' then
      perform pg_temp.seed_pay(oid, 'supplier_payment', 'out', 1300000, '{"reference": "SEED-SUPPLIER"}');
      fee := pg_temp.seed_pay(oid, 'service_fee', 'in', 50000, '{"reference": "SEED-FEE"}');
      -- A payment typed twice by mistake, then reversed.
      wrong := pg_temp.seed_pay(oid, 'supplier_payment', 'out', 1300000, '{"reference": "SEED-DUPLICATE"}');
      perform pg_temp.seed_pay(oid, 'reversal', 'in', 1300000, jsonb_build_object('reverses', wrong, 'reason', 'Entered twice by mistake'));
      -- A second proof added by mistake and removed.
      perform pg_temp.seed_proof(oid, 2);
      update public.supply_delivery_proofs set removed_at = now(), removed_by = 'seed', removed_reason = 'Wrong photo (another site)' where order_id = oid and file_path like '%2.pdf';
    end if;
    if model = 'B' and target in ('delivered', 'completed') then
      perform pg_temp.seed_pay(oid, 'commission_due', 'receivable', round((120000 + i * 1000) * 10 * 0.05 + 1000)::bigint, '{"method": null}');
      if target = 'completed' then
        perform pg_temp.seed_pay(oid, 'commission_received', 'in', round((120000 + i * 1000) * 10 * 0.05 + 1000)::bigint, '{"method": "bank_transfer", "reference": "SEED-COMMISSION"}');
      end if;
    end if;
  end loop;
end
$$;
