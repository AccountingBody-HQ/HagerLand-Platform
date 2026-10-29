-- 0050 · S6-3 Partner terms → prices, settlements after delivery, reconciliation (HagerLand as the seller, Model A).
-- reports/S6-0_review.md B1/B2/B4 and AB's decisions D1–D8 (S6-3 brief).
--   - Terms: a product source's markup or commission (one model per source, checked here), else the partner's active
--     agreement default, else none (the owner types the price). One SQL function, the same rules as lib/supply/terms.ts.
--   - order_request_lines: the reservation now also stores the terms used and what HagerLand pays the partner per unit;
--     a customer price below that is refused (no loss on a line).
--   - supply_orders.hagerland_delivery_income_cents: the customer's delivery charge on an order-request supplier order
--     is HagerLand's income, never part of what a partner is paid.
--   - partner_settlements / partner_settlement_items: what HagerLand pays each partner for delivered orders (statements
--     reference HLG-…, a prefix of their own), approved and paid by the owner in one all-or-nothing step that writes ordinary supply ledger
--     entries (supplier_payment per order; adjustments as ledger adjustments). The ledger's own rules do not change.
--   - A customer refund on an order already in a settlement creates an adjustment for the partner's next settlement.
--   - partner_draft_approve: S6-1's draft approval as one all-or-nothing database step.
-- Additive only: new tables, new empty columns, new checks that every existing row meets, new functions and triggers,
-- and new versions of three S6-2 server functions (create or replace; nothing dropped). No existing row changes; no
-- existing check of the supply ledger changes. Row level security is on for every new table; nothing is granted to
-- visitors or signed-in users. No legacy table (including the old site's "jobs") is touched. Safe to run again.
begin;

-- ---------------------------------------------------------------------------
-- Terms
-- ---------------------------------------------------------------------------
-- One model per partner source: a markup or a commission, never both.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'product_sources_one_model') then
    alter table public.product_sources add constraint product_sources_one_model check (markup_bps is null or commission_bps is null);
  end if;
end
$$;

-- Half up to the cent (n / d), the same as Math.round in lib/supply/terms.ts for these whole numbers.
create or replace function public.supply_round_div(p_n numeric, p_d numeric)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select floor((2 * p_n + p_d) / (2 * p_d))::bigint
$$;

-- Suggested customer price and partner payable per unit for a cost (markup) or an agreed selling price (commission).
create or replace function public.supply_suggested_terms(p_cost bigint, p_markup_bps int, p_commission_bps int)
returns table (terms_model text, terms_bps int, customer_unit_cents bigint, payable_unit_cents bigint)
language sql
immutable
set search_path = ''
as $$
  select
    case when p_cost is null then null when p_markup_bps is not null then 'markup' when p_commission_bps is not null then 'commission' else 'manual' end,
    coalesce(p_markup_bps, p_commission_bps),
    case when p_cost is null then null
         when p_markup_bps is not null then public.supply_round_div(p_cost::numeric * (10000 + p_markup_bps), 10000)
         when p_commission_bps is not null then p_cost
         else null end,
    case when p_cost is null then null
         when p_markup_bps is null and p_commission_bps is not null then public.supply_round_div(p_cost::numeric * (10000 - p_commission_bps), 10000)
         else p_cost end
$$;

-- The terms of one product from one partner: the source's own markup or commission, else the partner's active
-- agreement default (markup first, then commission), else none (manual).
create or replace function public.supply_resolve_terms(p_product uuid, p_org uuid)
returns table (cost_cents bigint, terms_model text, terms_bps int, customer_unit_cents bigint, payable_unit_cents bigint)
language plpgsql
stable
set search_path = ''
as $$
declare
  s public.product_sources;
  a public.supply_agreements;
  v_markup int;
  v_commission int;
begin
  select * into s from public.product_sources ps where ps.product_id = p_product and ps.org_id = p_org;
  select * into a from public.supply_agreements ag where ag.org_id = p_org and ag.status = 'active';
  if s.markup_bps is not null or s.commission_bps is not null then
    v_markup := s.markup_bps;
    v_commission := s.commission_bps;
  elsif a.default_markup_bps is not null then
    v_markup := a.default_markup_bps;
  elsif a.commission_rate_bps is not null then
    v_commission := a.commission_rate_bps;
  end if;
  return query select s.cost_price_cents, t.terms_model, t.terms_bps, t.customer_unit_cents, t.payable_unit_cents
  from public.supply_suggested_terms(s.cost_price_cents, v_markup, v_commission) t;
end
$$;

alter table public.order_request_lines add column if not exists terms_model text check (terms_model in ('markup', 'commission', 'manual'));
alter table public.order_request_lines add column if not exists terms_bps int check (terms_bps between 0 and 100000);
alter table public.order_request_lines add column if not exists partner_payable_unit_cents bigint check (partner_payable_unit_cents >= 0);
-- No loss on a line: the customer never pays less than HagerLand pays the partner.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'order_request_lines_no_loss') then
    alter table public.order_request_lines add constraint order_request_lines_no_loss
      check (customer_unit_price_cents is null or partner_payable_unit_cents is null or customer_unit_price_cents >= partner_payable_unit_cents);
  end if;
end
$$;

-- The customer's delivery charge on an order-request supplier order is HagerLand's income (empty for every other order).
alter table public.supply_orders add column if not exists hagerland_delivery_income_cents bigint check (hagerland_delivery_income_cents >= 0);

-- ---------------------------------------------------------------------------
-- New versions of two S6-2 server steps (terms snapshot, no-loss rule, delivery income)
-- ---------------------------------------------------------------------------
create or replace function public.order_request_reserve(p_request uuid, p_hours int, p_delivery_cents bigint, p_prices jsonb, p_actor text)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  r public.order_requests;
  v_item jsonb;
  v_line record;
  v_lines bigint;
  v_until timestamptz;
  v_price bigint;
begin
  if p_hours is null or p_hours not between 1 and 168 then
    raise exception 'A reservation lasts between 1 and 168 hours' using errcode = '22023';
  end if;
  if p_delivery_cents is null or p_delivery_cents < 0 then
    raise exception 'Enter the delivery charge (0 for none)' using errcode = '22023';
  end if;
  select * into r from public.order_requests where id = p_request for update;
  if r.id is null or r.status not in ('checking_stock', 'partially_reserved') then
    raise exception 'This order request cannot be reserved now' using errcode = '23514';
  end if;
  -- Source, cost and terms snapshot from the held partner (S6-3: terms model, rate and partner payable per unit).
  for v_line in
    select l.id, l.product_id, s.org_id, t.cost_cents, t.terms_model, t.terms_bps, t.customer_unit_cents, t.payable_unit_cents
    from public.order_request_lines l
    join public.stock_reservations s on s.order_request_line_id = l.id and s.status = 'held'
    cross join lateral public.supply_resolve_terms(l.product_id, s.org_id) t
    where l.order_request_id = p_request and l.status in ('confirmed', 'short')
  loop
    if v_line.cost_cents is null then
      raise exception 'A partner''s cost price is missing: add it to the product source first' using errcode = '23514';
    end if;
    v_price := (select (e ->> 'price_cents')::bigint from jsonb_array_elements(coalesce(p_prices, '[]'::jsonb)) e where (e ->> 'line_id')::uuid = v_line.id limit 1);
    v_price := coalesce(v_price, v_line.customer_unit_cents);
    if v_price is null then
      raise exception 'Enter a customer price for every available item' using errcode = '23514';
    end if;
    if v_price < v_line.payable_unit_cents then
      raise exception 'A customer price is below what HagerLand pays the partner for that item' using errcode = '23514';
    end if;
    update public.order_request_lines
    set source_org_id = v_line.org_id, cost_price_cents = v_line.cost_cents, terms_model = v_line.terms_model, terms_bps = v_line.terms_bps,
        partner_payable_unit_cents = v_line.payable_unit_cents, customer_unit_price_cents = v_price
    where id = v_line.id;
    -- The owner changed the suggested price: kept in the history with both values.
    if v_line.customer_unit_cents is not null and v_price <> v_line.customer_unit_cents then
      insert into public.order_request_events (order_request_id, event_type, detail, actor)
      values (p_request, 'price_override', jsonb_build_object('line', v_line.id, 'suggested_cents', v_line.customer_unit_cents, 'price_cents', v_price, 'terms', v_line.terms_model), p_actor);
    end if;
  end loop;
  select coalesce(sum(round(l.customer_unit_price_cents * l.confirmed_qty)), 0)::bigint into v_lines
  from public.order_request_lines l where l.order_request_id = p_request and l.status in ('confirmed', 'short');
  v_until := now() + make_interval(hours => p_hours);
  update public.order_requests
  set lines_total_cents = v_lines, delivery_charge_cents = p_delivery_cents, customer_total_cents = v_lines + p_delivery_cents,
      reserved_at = now(), reserved_until = v_until, payment_due_at = v_until, status = 'reserved', updated_by = p_actor
  where id = p_request;
  perform public.order_request_settle(p_request);
  return v_lines + p_delivery_cents;
end
$$;

create or replace function public.order_request_create_supply_orders(p_request uuid, p_actor text, p_today date)
returns table (id uuid, reference text)
language plpgsql
set search_path = ''
as $$
declare
  r public.order_requests;
  v_org uuid;
  v_order public.supply_orders;
  v_agreement public.supply_agreements;
  v_total bigint;
  v_first boolean := true;
begin
  select * into r from public.order_requests where order_requests.id = p_request for update;
  if r.id is null or r.status <> 'paid' then
    raise exception 'Supplier orders are created once, from a paid order request' using errcode = '23514';
  end if;
  if exists (select 1 from public.supply_orders o where o.order_request_id = p_request and o.status <> 'cancelled') then
    raise exception 'The supplier orders already exist' using errcode = '23505';
  end if;
  for v_org in
    select distinct l.source_org_id from public.order_request_lines l
    where l.order_request_id = p_request and l.status in ('confirmed', 'short') order by 1
  loop
    select * into v_agreement from public.supply_agreements a where a.org_id = v_org and a.status = 'active' and a.money_model in ('A', 'both');
    -- The delivery charge is HagerLand's income (S6-3 D2): on the first order for the customer total, and flagged.
    insert into public.supply_orders (order_request_id, org_id, agreement_id, money_model, proceed_without_agreement, customer_delivery_charge_cents, hagerland_delivery_income_cents, created_by, updated_by)
    values (p_request, v_org, v_agreement.id, 'A', v_agreement.id is null,
            case when v_first then r.delivery_charge_cents else 0 end, case when v_first then r.delivery_charge_cents else 0 end, p_actor, p_actor)
    returning * into v_order;
    v_first := false;
    -- What HagerLand pays the partner per unit (the terms snapshot; the cost for requests reserved before S6-3).
    insert into public.supply_order_lines (order_id, supply_quote_line_id, order_request_line_id, item_name, quantity, unit, supplier_unit_price_cents, customer_unit_price_cents, vat_flag)
    select v_order.id, null, l.id, l.item_name, l.confirmed_qty, l.unit, coalesce(l.partner_payable_unit_cents, l.cost_price_cents), l.customer_unit_price_cents,
           case l.vat_treatment when 'included' then 'yes' when 'excluded' then 'no' else 'unknown' end
    from public.order_request_lines l
    where l.order_request_id = p_request and l.status in ('confirmed', 'short') and l.source_org_id = v_org;
    v_total := public.supply_order_customer_total_cents(v_order.id);
    insert into public.order_request_payments (order_request_id, entry_type, direction, amount_cents, occurred_on, supply_order_id, note, created_by)
    values (p_request, 'moved_to_order', 'out', v_total, p_today, v_order.id, 'Moved to supplier order ' || v_order.reference, p_actor);
    insert into public.supply_ledger_entries (entry_type, direction, amount_cents, occurred_on, method, reference, order_id, org_id, note, created_by)
    values ('customer_payment', 'in', v_total, p_today, 'other', r.reference, v_order.id, v_org, 'Paid on order request ' || r.reference, p_actor);
    update public.supply_orders set status = 'awaiting_payment', updated_by = p_actor where supply_orders.id = v_order.id;
    update public.supply_orders set status = 'paid', updated_by = p_actor where supply_orders.id = v_order.id;
    id := v_order.id;
    reference := v_order.reference;
    return next;
  end loop;
  update public.order_requests set status = 'fulfilling', updated_by = p_actor where order_requests.id = p_request;
end
$$;

-- ---------------------------------------------------------------------------
-- Settlements
-- ---------------------------------------------------------------------------
create table if not exists public.partner_settlements (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.next_reference('HLG'),
  org_id uuid not null references public.organisations (id),
  period_from date not null,
  period_to date not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'paid', 'void')),
  total_cents bigint not null default 0,
  approved_by text check (char_length(approved_by) <= 120),
  approved_at timestamptz,
  paid_on date,
  method text check (method in ('bank_transfer', 'telebirr', 'cbe_birr', 'cash', 'card', 'other')),
  transfer_reference text check (char_length(transfer_reference) <= 120),
  void_reason text check (char_length(void_reason) <= 500),
  created_by text check (char_length(created_by) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_settlements_period check (period_to >= period_from),
  constraint partner_settlements_paid_complete check (status <> 'paid' or (paid_on is not null and method is not null and approved_at is not null)),
  constraint partner_settlements_void_reason check (status <> 'void' or coalesce(btrim(void_reason), '') <> '')
);
create index if not exists partner_settlements_org_idx on public.partner_settlements (org_id, created_at desc);
create index if not exists partner_settlements_status_idx on public.partner_settlements (status);
create or replace trigger set_updated_at before update on public.partner_settlements for each row execute function public.set_updated_at();

create table if not exists public.partner_settlement_items (
  id uuid primary key default gen_random_uuid(),
  -- Empty only for an adjustment waiting for the partner's next settlement.
  settlement_id uuid references public.partner_settlements (id),
  org_id uuid not null references public.organisations (id),
  supply_order_id uuid references public.supply_orders (id),
  kind text not null check (kind in ('payable', 'adjustment')),
  amount_cents bigint not null,
  reason text check (char_length(reason) <= 500),
  -- Paying before delivery (upfront terms only) needs the owner's reason.
  upfront_reason text check (char_length(upfront_reason) <= 500),
  -- Kept equal to "the settlement is void" (a voided settlement frees its orders).
  settlement_void boolean not null default false,
  created_by text check (char_length(created_by) <= 120),
  created_at timestamptz not null default now(),
  constraint partner_settlement_items_payable check (kind <> 'payable' or (settlement_id is not null and supply_order_id is not null and amount_cents > 0)),
  constraint partner_settlement_items_adjustment check (kind <> 'adjustment' or (amount_cents <> 0 and coalesce(btrim(reason), '') <> ''))
);
create index if not exists partner_settlement_items_settlement_idx on public.partner_settlement_items (settlement_id);
create index if not exists partner_settlement_items_order_idx on public.partner_settlement_items (supply_order_id);
create index if not exists partner_settlement_items_pending_idx on public.partner_settlement_items (org_id) where settlement_id is null;
-- An order is never settled twice: one payable item among settlements that are not void.
create unique index if not exists partner_settlement_items_one_payable_key on public.partner_settlement_items (supply_order_id) where kind = 'payable' and not settlement_void;

-- What HagerLand owes the partner for one order: the partner's line prices × quantities (+ the partner's own delivery
-- charge). Never the customer's delivery charge (HagerLand's income).
create or replace function public.supply_order_payable_cents(p_order uuid)
returns bigint
language sql
stable
set search_path = ''
as $$
  select coalesce((select sum(round(l.supplier_unit_price_cents * l.quantity)) from public.supply_order_lines l where l.order_id = p_order), 0)::bigint
       + coalesce((select o.supplier_delivery_charge_cents from public.supply_orders o where o.id = p_order), 0)
$$;

-- The order is paid "up front" only when every one of its items comes from a source (or agreement) with up-front terms.
create or replace function public.supply_order_upfront(p_order uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (select 1 from public.supply_order_lines l where l.order_id = p_order)
     and not exists (
       select 1 from public.supply_order_lines l
       join public.supply_orders o on o.id = l.order_id
       left join public.order_request_lines rl on rl.id = l.order_request_line_id
       left join public.product_sources ps on ps.product_id = rl.product_id and ps.org_id = o.org_id
       left join public.supply_agreements a on a.org_id = o.org_id and a.status = 'active'
       where l.order_id = p_order and coalesce(ps.settlement_timing, a.settlement_timing, 'after_delivery') <> 'upfront'
     )
$$;

create or replace function public.partner_settlement_items_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
  v_org uuid;
  o public.supply_orders;
begin
  if tg_op = 'DELETE' then
    if old.settlement_id is not null and (select s.status from public.partner_settlements s where s.id = old.settlement_id) <> 'draft' then
      raise exception 'Only items of a draft settlement can be removed' using errcode = '23514';
    end if;
    return old;
  end if;
  if new.settlement_id is not null then
    select s.status, s.org_id into v_status, v_org from public.partner_settlements s where s.id = new.settlement_id;
    if v_status is null then
      raise exception 'Settlement not found' using errcode = '23503';
    end if;
    -- A void settlement only lets go of its items (the database does this itself when voiding).
    if v_status = 'void' then
      if tg_op = 'UPDATE' and (new.kind, new.amount_cents, new.supply_order_id, new.org_id) is not distinct from (old.kind, old.amount_cents, old.supply_order_id, old.org_id) then
        return new;
      end if;
      raise exception 'A void settlement cannot change' using errcode = '23514';
    end if;
    if v_status <> 'draft' and not (tg_op = 'UPDATE' and old.settlement_id is not distinct from new.settlement_id
                                     and (new.kind, new.amount_cents, new.supply_order_id, new.org_id, new.reason, new.upfront_reason) is not distinct from (old.kind, old.amount_cents, old.supply_order_id, old.org_id, old.reason, old.upfront_reason)) then
      raise exception 'Only a draft settlement can change' using errcode = '23514';
    end if;
    if v_org <> new.org_id then
      raise exception 'Every item of a settlement belongs to its partner' using errcode = '23514';
    end if;
  end if;
  if tg_op = 'UPDATE' and old.settlement_id is not null and new.settlement_id is null and new.kind = 'payable' then
    raise exception 'A payable stays with its settlement' using errcode = '23514';
  end if;
  if new.kind = 'payable' and (tg_op = 'INSERT' or (new.supply_order_id, new.amount_cents) is distinct from (old.supply_order_id, old.amount_cents)) then
    select * into o from public.supply_orders where id = new.supply_order_id;
    if o.id is null or o.money_model <> 'A' or o.order_request_id is null or o.status = 'cancelled' or o.org_id <> new.org_id then
      raise exception 'Only a live order-request supplier order of this partner can be settled' using errcode = '23514';
    end if;
    if new.amount_cents <> public.supply_order_payable_cents(o.id) then
      raise exception 'The amount due must equal what HagerLand owes for the order' using errcode = '23514';
    end if;
    -- After delivery (with proof), or up front when the terms say so and the owner gives a reason.
    if not (o.status in ('delivered', 'completed') and exists (select 1 from public.supply_delivery_proofs p where p.order_id = o.id and p.removed_at is null)) then
      if not public.supply_order_upfront(o.id) or coalesce(btrim(new.upfront_reason), '') = '' then
        raise exception 'A partner is paid after delivery with proof (or up front, when agreed, with a reason)' using errcode = '23514';
      end if;
    end if;
  end if;
  return new;
end
$$;
create or replace trigger partner_settlement_items_guard before insert or update or delete on public.partner_settlement_items
  for each row execute function public.partner_settlement_items_guard();

create or replace function public.partner_settlement_items_total(p_settlement uuid)
returns bigint
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(i.amount_cents), 0)::bigint from public.partner_settlement_items i where i.settlement_id = p_settlement
$$;

-- Settlement status: draft → approved → paid | void; draft → void. Paid and void are final. The total always equals the
-- items; paying needs the matching ledger entries (written by partner_settlement_pay in the same step).
create or replace function public.partner_settlements_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_payables bigint;
  v_ledger bigint;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception 'A new settlement starts as a draft' using errcode = '23514';
    end if;
    return new;
  end if;
  if old.status in ('paid', 'void') then
    raise exception 'A % settlement is final', old.status using errcode = '23514';
  end if;
  if old.status <> 'draft' and (new.org_id, new.period_from, new.period_to, new.total_cents) is distinct from (old.org_id, old.period_from, old.period_to, old.total_cents) then
    raise exception 'Only a draft settlement can change' using errcode = '23514';
  end if;
  if new.status is distinct from old.status then
    if not ((old.status, new.status) in (('draft', 'approved'), ('draft', 'void'), ('approved', 'paid'), ('approved', 'void'))) then
      raise exception 'A settlement cannot go from % to %', old.status, new.status using errcode = '23514';
    end if;
    if new.status in ('approved', 'paid') then
      if new.total_cents <> public.partner_settlement_items_total(new.id) then
        raise exception 'The settlement total must equal its items' using errcode = '23514';
      end if;
      if new.total_cents <= 0 or not exists (select 1 from public.partner_settlement_items i where i.settlement_id = new.id and i.kind = 'payable') then
        raise exception 'A settlement needs at least one order and a total above zero' using errcode = '23514';
      end if;
    end if;
    if new.status = 'paid' then
      select coalesce(sum(i.amount_cents), 0) into v_payables from public.partner_settlement_items i where i.settlement_id = new.id and i.kind = 'payable';
      select coalesce(sum(e.amount_cents), 0) into v_ledger from public.supply_ledger_entries e
      where e.entry_type = 'supplier_payment' and e.reference = new.reference and e.org_id = new.org_id;
      if v_payables <> v_ledger then
        raise exception 'A settlement is paid only together with its ledger entries' using errcode = '23514';
      end if;
    end if;
  end if;
  return new;
end
$$;
create or replace trigger partner_settlements_guard before insert or update on public.partner_settlements
  for each row execute function public.partner_settlements_guard();

-- Voiding frees the orders (payables) and returns adjustments to the partner's next settlement.
create or replace function public.partner_settlements_after()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'void' and old.status <> 'void' then
    update public.partner_settlement_items set settlement_void = true where settlement_id = new.id and kind = 'payable';
    update public.partner_settlement_items set settlement_id = null where settlement_id = new.id and kind = 'adjustment';
  end if;
  return null;
end
$$;
create or replace trigger partner_settlements_after after update on public.partner_settlements
  for each row execute function public.partner_settlements_after();

-- Owner: a draft settlement for one partner and period: the chosen orders (amounts computed here) and every adjustment
-- waiting for the partner. All or nothing.
create or replace function public.partner_settlement_create(p_org uuid, p_from date, p_to date, p_orders uuid[], p_upfront_reasons jsonb, p_actor text)
returns table (id uuid, reference text)
language plpgsql
set search_path = ''
as $$
declare
  s public.partner_settlements;
  v_order uuid;
begin
  if coalesce(cardinality(p_orders), 0) = 0 then
    raise exception 'Choose at least one order' using errcode = '22023';
  end if;
  insert into public.partner_settlements (org_id, period_from, period_to, created_by) values (p_org, p_from, p_to, p_actor) returning * into s;
  foreach v_order in array p_orders loop
    insert into public.partner_settlement_items (settlement_id, org_id, supply_order_id, kind, amount_cents, upfront_reason, created_by)
    values (s.id, p_org, v_order, 'payable', public.supply_order_payable_cents(v_order), nullif(btrim(coalesce(p_upfront_reasons ->> v_order::text, '')), ''), p_actor);
  end loop;
  update public.partner_settlement_items i set settlement_id = s.id where i.settlement_id is null and i.org_id = p_org and i.kind = 'adjustment';
  update public.partner_settlements ps set total_cents = public.partner_settlement_items_total(s.id) where ps.id = s.id;
  id := s.id;
  reference := s.reference;
  return next;
end
$$;

-- Owner: pay an approved settlement once. One ledger supplier_payment per order (the existing type, with the partner and
-- the order), each adjustment as a ledger adjustment, and the settlement marked paid: all or nothing.
create or replace function public.partner_settlement_pay(p_settlement uuid, p_paid_on date, p_method text, p_reference text, p_actor text)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  s public.partner_settlements;
  i public.partner_settlement_items;
begin
  select * into s from public.partner_settlements where partner_settlements.id = p_settlement for update;
  if s.id is null or s.status <> 'approved' then
    raise exception 'Only an approved settlement can be paid, once' using errcode = '23514';
  end if;
  for i in select * from public.partner_settlement_items it where it.settlement_id = s.id order by it.created_at loop
    if i.kind = 'payable' then
      insert into public.supply_ledger_entries (entry_type, direction, amount_cents, occurred_on, method, reference, order_id, org_id, note, created_by)
      values ('supplier_payment', 'out', i.amount_cents, p_paid_on, p_method, s.reference, i.supply_order_id, s.org_id, 'Settlement ' || s.reference || coalesce(' · ' || p_reference, ''), p_actor);
    else
      insert into public.supply_ledger_entries (entry_type, direction, amount_cents, occurred_on, method, reference, order_id, org_id, reason, note, created_by)
      values ('adjustment', case when i.amount_cents < 0 then 'in' else 'out' end, abs(i.amount_cents), p_paid_on, p_method, s.reference, i.supply_order_id, s.org_id, i.reason, 'Settlement ' || s.reference, p_actor);
    end if;
  end loop;
  update public.partner_settlements set status = 'paid', paid_on = p_paid_on, method = p_method, transfer_reference = p_reference where partner_settlements.id = s.id;
  return s.total_cents;
end
$$;

-- A customer refund on an order already in a settlement: an adjustment for the partner's next settlement (the owner
-- reviews the amount and reason before approving that settlement).
create or replace function public.supply_ledger_refund_after_settlement()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_item public.partner_settlement_items;
  v_ref text;
begin
  if new.entry_type <> 'refund' or new.order_id is null then
    return null;
  end if;
  select it.* into v_item from public.partner_settlement_items it where it.supply_order_id = new.order_id and it.kind = 'payable' and not it.settlement_void limit 1;
  if v_item.id is null then
    return null;
  end if;
  select ps.reference into v_ref from public.partner_settlements ps where ps.id = v_item.settlement_id;
  insert into public.partner_settlement_items (settlement_id, org_id, supply_order_id, kind, amount_cents, reason, created_by)
  values (null, v_item.org_id, new.order_id, 'adjustment', -least(new.amount_cents, v_item.amount_cents), 'Customer refund after settlement ' || v_ref, 'system (customer refund)');
  return null;
end
$$;
create or replace trigger supply_ledger_refund_after_settlement after insert on public.supply_ledger_entries
  for each row execute function public.supply_ledger_refund_after_settlement();

-- ---------------------------------------------------------------------------
-- S6-1 draft approval as one step: create (or link) the HagerLand Supply product, record the source, mark approved.
-- ---------------------------------------------------------------------------
create or replace function public.partner_draft_approve(
  p_draft uuid, p_existing_product uuid, p_name text, p_category uuid, p_brand_name text, p_unit text, p_pack_size text,
  p_min_order numeric, p_lead_time int, p_description text, p_specs jsonb, p_cost_cents bigint, p_commission_bps int,
  p_markup_bps int, p_settlement_timing text, p_credit_days int, p_actor text, p_product_slug text, p_brand_slug text
)
returns table (product_id uuid, created boolean)
language plpgsql
set search_path = ''
as $$
declare
  d public.partner_product_drafts;
  v_seller uuid;
  v_product uuid;
  v_brand uuid;
  v_created boolean := false;
begin
  select * into d from public.partner_product_drafts where id = p_draft for update;
  if d.id is null or d.status <> 'submitted' then
    raise exception 'This draft is not waiting for review.' using errcode = '23514';
  end if;
  select o.id into v_seller from public.organisations o where o.slug = 'hagerland-supply' and o.is_hagerland;
  if v_seller is null then
    raise exception 'The HagerLand Supply organisation was not found.' using errcode = '23514';
  end if;
  if p_existing_product is not null then
    select p.id into v_product from public.products p where p.id = p_existing_product and p.seller_org_id = v_seller;
    if v_product is null then
      raise exception 'Only a HagerLand Supply product can be linked.' using errcode = '23514';
    end if;
  else
    if p_category is null then
      raise exception 'Choose a category' using errcode = '23514';
    end if;
    -- Slugs are made by the app (lib/slug.ts), exactly as before this step moved into the database.
    if coalesce(btrim(p_brand_name), '') <> '' then
      select b.id into v_brand from public.brands b where b.slug = p_brand_slug;
      if v_brand is null then
        insert into public.brands (name, slug) values (p_brand_name, p_brand_slug) returning brands.id into v_brand;
      end if;
    end if;
    insert into public.products (name, slug, category_id, brand_id, seller_org_id, description, specs, unit, pack_size, min_order_qty, lead_time_days, price_type, stock_status, status)
    values (p_name, p_product_slug,
            p_category, v_brand, v_seller, p_description, coalesce(p_specs, '[]'::jsonb), p_unit, p_pack_size, coalesce(p_min_order, 1), p_lead_time,
            'on_request', 'available_on_request', 'draft')
    returning products.id into v_product;
    v_created := true;
  end if;
  begin
    insert into public.product_sources (product_id, org_id, draft_id, partner_sku, cost_price_cents, commission_bps, markup_bps, settlement_timing, credit_days, is_primary, created_by)
    values (v_product, d.org_id, d.id, d.partner_sku, p_cost_cents, p_commission_bps, p_markup_bps, p_settlement_timing, p_credit_days,
            not exists (select 1 from public.product_sources ps where ps.product_id = v_product and ps.is_primary), p_actor);
  exception when unique_violation then
    raise exception 'This partner is already a source of that product.' using errcode = '23505';
  end;
  update public.partner_product_drafts set status = 'approved', product_id = v_product, status_changed_at = now(), decided_at = now() where id = d.id;
  product_id := v_product;
  created := v_created;
  return next;
end
$$;

-- ---------------------------------------------------------------------------
-- Access: row level security on, nothing granted; the server (service role) only.
-- ---------------------------------------------------------------------------
alter table public.partner_settlements enable row level security;
alter table public.partner_settlement_items enable row level security;
revoke all on table public.partner_settlements, public.partner_settlement_items from public, anon, authenticated;
revoke all on function public.supply_round_div(numeric, numeric), public.supply_suggested_terms(bigint, int, int), public.supply_resolve_terms(uuid, uuid),
  public.supply_order_payable_cents(uuid), public.supply_order_upfront(uuid), public.partner_settlement_items_guard(), public.partner_settlement_items_total(uuid),
  public.partner_settlements_guard(), public.partner_settlements_after(), public.partner_settlement_create(uuid, date, date, uuid[], jsonb, text),
  public.partner_settlement_pay(uuid, date, text, text, text), public.supply_ledger_refund_after_settlement(),
  public.partner_draft_approve(uuid, uuid, text, uuid, text, text, text, numeric, int, text, jsonb, bigint, int, int, text, int, text, text, text),
  public.order_request_reserve(uuid, int, bigint, jsonb, text), public.order_request_create_supply_orders(uuid, text, date)
  from public, anon, authenticated;
grant execute on function public.supply_suggested_terms(bigint, int, int), public.supply_resolve_terms(uuid, uuid), public.supply_order_payable_cents(uuid),
  public.supply_order_upfront(uuid), public.partner_settlement_items_total(uuid), public.partner_settlement_create(uuid, date, date, uuid[], jsonb, text),
  public.partner_settlement_pay(uuid, date, text, text, text),
  public.partner_draft_approve(uuid, uuid, text, uuid, text, text, text, numeric, int, text, jsonb, bigint, int, int, text, int, text, text, text),
  public.order_request_reserve(uuid, int, bigint, jsonb, text), public.order_request_create_supply_orders(uuid, text, date)
  to service_role;

insert into public.schema_migrations (version, name) values ('0050', 'partner_settlements') on conflict (version) do nothing;

commit;
