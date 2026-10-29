-- 0051 · S6-4 Per-customer trade prices and multi-item trade order requests (HagerLand as the seller).
-- reports/S6-0_review.md B1/B4/B5 and AB's decisions D1–D8 (S6-4 brief).
--   - trade_price_agreements: prices agreed with one trade account, for a product (a price) or a category (a price or a
--     discount on the price suggested by the partner's terms, S6-3), each with its dates. Overlaps are refused, and so is
--     any price below what HagerLand pays the partner (S6-3 no-loss rule).
--   - trade_effective_price_for: the price for one trade customer and product (product agreement → category agreement →
--     the existing general trade price → none), never below the partner payable.
--   - my_trade_prices: the signed-in customer's own effective prices (nothing for anyone else, nothing while trade
--     pricing is off). It never returns partners, costs or terms.
--   - A new version of the S6-2/S6-3 reserve step: a trade customer's request is priced from their trade terms (only
--     while trade pricing is on); the owner may still change it (kept in the history).
-- Additive only: one new table, new functions and triggers, a new version of one server step (create or replace). No
-- existing row, check, policy or grant changes; product_trade_prices (today's general trade price) is not touched. Row
-- level security is on for the new table; only my_trade_prices is granted (to signed-in users). No legacy table
-- (including the old site's "jobs") is touched. Safe to run again.
begin;

create table if not exists public.trade_price_agreements (
  id uuid primary key default gen_random_uuid(),
  trade_account_id uuid not null references public.trade_accounts (id),
  product_id uuid references public.products (id),
  category_id uuid references public.product_categories (id),
  price_cents bigint check (price_cents > 0),
  discount_bps int check (discount_bps between 1 and 9000),
  valid_from date not null default ((now() at time zone 'Africa/Addis_Ababa')::date),
  valid_until date,
  status text not null default 'active' check (status in ('active', 'ended')),
  note text check (char_length(note) <= 500),
  end_reason text check (char_length(end_reason) <= 500),
  ended_at timestamptz,
  created_by text check (char_length(created_by) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trade_price_agreements_one_target check ((product_id is null) <> (category_id is null)),
  constraint trade_price_agreements_one_price check ((price_cents is null) <> (discount_bps is null)),
  constraint trade_price_agreements_dates check (valid_until is null or valid_until >= valid_from),
  constraint trade_price_agreements_end_reason check (status <> 'ended' or coalesce(btrim(end_reason), '') <> '')
);
create index if not exists trade_price_agreements_account_idx on public.trade_price_agreements (trade_account_id, status);
create index if not exists trade_price_agreements_product_idx on public.trade_price_agreements (product_id) where product_id is not null;
create index if not exists trade_price_agreements_category_idx on public.trade_price_agreements (category_id) where category_id is not null;
create or replace trigger set_updated_at before update on public.trade_price_agreements for each row execute function public.set_updated_at();

-- The most HagerLand pays any active partner for one unit of the product (S6-3 terms); null when no partner supplies it.
create or replace function public.supply_product_payable_floor(p_product uuid)
returns bigint
language sql
stable
set search_path = ''
as $$
  select max(t.payable_unit_cents)::bigint
  from public.product_sources s
  cross join lateral public.supply_resolve_terms(s.product_id, s.org_id) t
  where s.product_id = p_product and s.status = 'active'
$$;

-- The customer price the partner's terms suggest (the primary active source first), for a category discount.
create or replace function public.supply_product_suggested_price(p_product uuid)
returns bigint
language sql
stable
set search_path = ''
as $$
  select t.customer_unit_cents
  from public.product_sources s
  cross join lateral public.supply_resolve_terms(s.product_id, s.org_id) t
  where s.product_id = p_product and s.status = 'active' and t.customer_unit_cents is not null
  order by s.is_primary desc, s.created_at
  limit 1
$$;

-- One agreement's price for one product (a category discount applies to the suggested price; half up to the cent).
create or replace function public.trade_agreement_price(p_agreement public.trade_price_agreements, p_product uuid)
returns bigint
language sql
stable
set search_path = ''
as $$
  select case
    when p_agreement.price_cents is not null then p_agreement.price_cents
    else (select public.supply_round_div(sp::numeric * (10000 - p_agreement.discount_bps), 10000) from public.supply_product_suggested_price(p_product) sp where sp is not null)
  end
$$;

-- The effective trade price for one customer and product: a product agreement, else a category agreement (the
-- product's own category, then its parent), else the existing general trade price; never below the partner payable.
create or replace function public.trade_effective_price_for(p_user uuid, p_product uuid)
returns table (price_cents bigint, rule text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_account uuid;
  v_today date := (now() at time zone 'Africa/Addis_Ababa')::date;
  p public.products;
  v_parent uuid;
  v_floor bigint;
  a public.trade_price_agreements;
  v_price bigint;
begin
  select t.id into v_account from public.trade_accounts t join public.profiles pr on pr.id = t.user_id
  where t.user_id = p_user and t.status = 'approved' and not pr.is_suspended;
  if v_account is null then return; end if;
  select * into p from public.products where id = p_product and status = 'published';
  if p.id is null then return; end if;
  select c.parent_id into v_parent from public.product_categories c where c.id = p.category_id;
  v_floor := public.supply_product_payable_floor(p.id);
  for a in
    select * from public.trade_price_agreements x
    where x.trade_account_id = v_account and x.status = 'active' and x.valid_from <= v_today and (x.valid_until is null or x.valid_until >= v_today)
      and (x.product_id = p.id or x.category_id in (p.category_id, v_parent))
    order by (x.product_id is not null) desc, (x.category_id = p.category_id) desc, x.created_at desc
  loop
    v_price := public.trade_agreement_price(a, p.id);
    if v_price is not null and (v_floor is null or v_price >= v_floor) then
      return query select v_price, case when a.product_id is not null then 'product_price' when a.price_cents is not null then 'category_price' else 'category_discount' end;
      return;
    end if;
  end loop;
  if p.trade_price_etb_cents is not null and (v_floor is null or p.trade_price_etb_cents >= v_floor) then
    return query select p.trade_price_etb_cents, 'general_trade_price';
  end if;
end
$$;

-- The signed-in customer's own trade prices (only while trade pricing is on). Visitors, non-trade users and
-- unapproved or closed accounts get nothing; no partner, cost or terms ever leave.
create or replace function public.my_trade_prices(p_product_ids uuid[])
returns table (product_id uuid, price_cents bigint, rule text)
language sql
stable
security definer
set search_path = ''
as $$
  select ids.id, t.price_cents, t.rule
  from unnest(p_product_ids[1:200]) as ids(id)
  cross join lateral public.trade_effective_price_for((select auth.uid()), ids.id) t
  where (select auth.uid()) is not null
    and exists (select 1 from public.site_settings st where st.key = 'supply_trade_pricing' and st.value = 'true'::jsonb)
$$;

-- Agreements: only for approved trade accounts; no overlapping dates for the same product or category; never below
-- what HagerLand pays the partner for any product it covers (S6-3 no-loss rule). One save at a time per account.
create or replace function public.trade_price_agreements_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_bad text;
begin
  perform 1 from public.trade_accounts t where t.id = new.trade_account_id for update;
  if new.status = 'active' then
    if not exists (select 1 from public.trade_accounts t where t.id = new.trade_account_id and t.status = 'approved') then
      raise exception 'Trade prices are for approved trade accounts only' using errcode = '23514';
    end if;
    if exists (
      select 1 from public.trade_price_agreements x
      where x.trade_account_id = new.trade_account_id and x.status = 'active' and x.id <> new.id
        and x.product_id is not distinct from new.product_id and x.category_id is not distinct from new.category_id
        and daterange(x.valid_from, x.valid_until, '[]') && daterange(new.valid_from, new.valid_until, '[]')
    ) then
      raise exception 'This customer already has a price for that item in those dates' using errcode = '23514';
    end if;
    select string_agg(pr.name, ', ') into v_bad
    from public.products pr
    left join public.product_categories c on c.id = pr.category_id
    where (pr.id = new.product_id or (new.category_id is not null and (pr.category_id = new.category_id or c.parent_id = new.category_id)))
      and public.supply_product_payable_floor(pr.id) is not null
      and public.trade_agreement_price(new, pr.id) < public.supply_product_payable_floor(pr.id);
    if v_bad is not null then
      raise exception 'Below what HagerLand pays the partner for: %', left(v_bad, 300) using errcode = '23514';
    end if;
  end if;
  return new;
end
$$;
create or replace trigger trade_price_agreements_guard before insert or update on public.trade_price_agreements
  for each row execute function public.trade_price_agreements_guard();

-- New version of the reserve step (S6-2, S6-3): the trade customer's price is suggested when trade pricing is on.
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
  v_suggested bigint;
  v_trade boolean := false;
  v_trade_price bigint;
begin
  if p_hours is null or p_hours not between 1 and 168 then
    raise exception 'A reservation lasts between 1 and 168 hours' using errcode = '22023';
  end if;
  if p_delivery_cents is null or p_delivery_cents < 0 then
    raise exception 'Enter the delivery charge (0 for none)' using errcode = '22023';
  end if;
  select * into r from public.order_requests where id = p_request for update;
  -- S6-4: an approved trade customer's request is priced from their trade terms (only while trade pricing is on).
  v_trade := r.requester_user_id is not null
    and exists (select 1 from public.site_settings st where st.key = 'supply_trade_pricing' and st.value = 'true'::jsonb);
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
    v_suggested := v_line.customer_unit_cents;
    v_trade_price := null;
    if v_trade then
      select tp.price_cents into v_trade_price from public.trade_effective_price_for(r.requester_user_id, v_line.product_id) tp;
      if v_trade_price is not null then v_suggested := v_trade_price; end if;
    end if;
    v_price := coalesce(v_price, v_suggested);
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
    if v_suggested is not null and v_price <> v_suggested then
      insert into public.order_request_events (order_request_id, event_type, detail, actor)
      values (p_request, 'price_override', jsonb_build_object('line', v_line.id, 'suggested_cents', v_suggested, 'price_cents', v_price, 'terms', v_line.terms_model, 'trade', v_trade_price is not null), p_actor);
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

alter table public.trade_price_agreements enable row level security;
revoke all on table public.trade_price_agreements from public, anon, authenticated;
revoke all on function public.supply_product_payable_floor(uuid), public.supply_product_suggested_price(uuid),
  public.trade_agreement_price(public.trade_price_agreements, uuid), public.trade_effective_price_for(uuid, uuid),
  public.my_trade_prices(uuid[]), public.trade_price_agreements_guard(), public.order_request_reserve(uuid, int, bigint, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.my_trade_prices(uuid[]) to authenticated;
grant execute on function public.supply_product_payable_floor(uuid), public.supply_product_suggested_price(uuid), public.trade_effective_price_for(uuid, uuid),
  public.order_request_reserve(uuid, int, bigint, jsonb, text) to service_role;

insert into public.schema_migrations (version, name) values ('0051', 'trade_price_agreements') on conflict (version) do nothing;

commit;
