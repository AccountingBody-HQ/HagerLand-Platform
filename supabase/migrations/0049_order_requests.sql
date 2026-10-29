-- 0049 · S6-2 Order requests, stock reservations and the payment window (HagerLand as the seller, Model A).
-- reports/S6-0_review.md B1/B2 and AB's decisions D1–D11 (S6-2 brief), with AB's approval of option A (reports/S6-2_stage1.md).
--   - order_requests: a customer asks to order HagerLand Supply products; nothing is paid until stock is reserved.
--   - order_request_lines: the items; the customer price (set by the owner) and, PRIVATE, the source partner and cost.
--   - stock_reservations: holds agreed with a partner (one held partner per line), each with its end time.
--   - order_request_events: the append-only history of each request.
--   - order_request_payments: append-only customer payments, refunds and exact reversals for a request (the supply
--     ledger requires a supplier order for every customer payment, 0037:151, and stays unchanged). When the owner creates
--     the supplier orders, the money moves into ordinary ledger "customer payment" entries on each new order in the same
--     database step, balanced by a "moved to order" entry here.
--   - order_request_lines_customer: what a signed-in customer may read about their own lines (no partner, no cost).
--   - supply_orders.order_request_id and supply_order_lines.order_request_line_id (new, empty).
--   - The state machine and the golden rule ("paid" only when recorded payments cover the total, before the
--     reservation ends) are enforced here. A payment recorded after the reservation ended is never accepted on its own.
--   - One new owner setting, "Payment details shown to customers" (empty).
-- Additive, except the two "drop not null" statements in the clearly marked block at the end (approved by AB: D11 and
-- option A; 0 rows on live). No existing row changes; no existing rule of the supply ledger changes. Row level security
-- is on for every new table. No legacy table (including the old site's "jobs") is touched. Safe to run again.
begin;

-- ---------------------------------------------------------------------------
-- Order requests
-- ---------------------------------------------------------------------------
create table if not exists public.order_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.next_reference('HLR'),
  requester_user_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 1 and 120),
  -- E.164 (+251…); empty only once the keeping period has cleared it.
  phone text not null check (phone = '' or phone ~ '^\+[0-9]{8,15}$'),
  email text check (char_length(email) <= 254),
  delivery_location_id uuid references public.locations (id),
  delivery_address text check (char_length(delivery_address) <= 300),
  needed_by date,
  note text check (char_length(note) <= 2000),
  status text not null default 'submitted' check (status in ('submitted', 'checking_stock', 'partially_reserved', 'reserved', 'paid', 'fulfilling', 'delivered', 'completed', 'unavailable', 'expired', 'cancelled', 'refunded', 'disputed')),
  status_changed_at timestamptz not null default now(),
  status_reason text check (char_length(status_reason) <= 500),
  reserved_at timestamptz,
  reserved_until timestamptz,
  -- One clock: the payment window ends with the reservation.
  payment_due_at timestamptz,
  lines_total_cents bigint check (lines_total_cents >= 0),
  delivery_charge_cents bigint check (delivery_charge_cents >= 0),
  customer_total_cents bigint check (customer_total_cents >= 0),
  -- The customer's private status link (a fingerprint only, as service requests).
  access_token_hash text unique,
  access_token_expires_at timestamptz,
  -- Customer emails already sent once (delivered, paid, …): a second tap never sends a second email.
  emails_sent text[] not null default '{}',
  ip_hash text check (char_length(ip_hash) <= 128),
  updated_by text check (char_length(updated_by) <= 120),
  personal_data_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_requests_reserved_complete check (status <> 'reserved' or (reserved_until is not null and customer_total_cents > 0 and payment_due_at = reserved_until))
);
create index if not exists order_requests_status_idx on public.order_requests (status, status_changed_at);
create index if not exists order_requests_requester_idx on public.order_requests (requester_user_id);
create index if not exists order_requests_reserved_until_idx on public.order_requests (reserved_until) where status = 'reserved';
create index if not exists order_requests_retention_idx on public.order_requests (updated_at) where personal_data_deleted_at is null;
create or replace trigger set_updated_at before update on public.order_requests for each row execute function public.set_updated_at();

create table if not exists public.order_request_lines (
  id uuid primary key default gen_random_uuid(),
  order_request_id uuid not null references public.order_requests (id),
  product_id uuid not null references public.products (id),
  item_name text not null check (char_length(item_name) between 1 and 300),
  quantity numeric(12, 2) not null check (quantity > 0),
  unit text not null check (unit in ('piece', 'box', 'metre', 'roll', 'sheet', 'bag', 'quintal', 'tonne', 'm2', 'm3', 'litre', 'kg', 'set', 'pair')),
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'short', 'unavailable')),
  confirmed_qty numeric(12, 2) check (confirmed_qty > 0),
  customer_unit_price_cents bigint check (customer_unit_price_cents >= 0),
  -- PRIVATE (owner only; never in any customer view): the partner supplying this line and its cost.
  source_org_id uuid references public.organisations (id),
  cost_price_cents bigint check (cost_price_cents >= 0),
  vat_treatment text not null default 'unknown' check (vat_treatment in ('unknown', 'included', 'excluded', 'exempt')),
  vat_rate_bps int check (vat_rate_bps between 0 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_request_lines_short_qty check (status not in ('confirmed', 'short') or confirmed_qty is not null),
  constraint order_request_lines_short_less check (status <> 'short' or confirmed_qty < quantity)
);
create index if not exists order_request_lines_request_idx on public.order_request_lines (order_request_id);
create or replace trigger set_updated_at before update on public.order_request_lines for each row execute function public.set_updated_at();

create table if not exists public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  order_request_line_id uuid not null references public.order_request_lines (id),
  org_id uuid not null references public.organisations (id),
  qty numeric(12, 2) not null check (qty > 0),
  held_until timestamptz,
  status text not null default 'held' check (status in ('asked', 'held', 'released', 'expired', 'converted')),
  partner_reference text check (char_length(partner_reference) <= 120),
  note text check (char_length(note) <= 500),
  recorded_by text check (char_length(recorded_by) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_reservations_held_end check (status <> 'held' or held_until is not null)
);
create index if not exists stock_reservations_line_idx on public.stock_reservations (order_request_line_id);
create index if not exists stock_reservations_held_idx on public.stock_reservations (held_until) where status = 'held';
-- One partner holds each line at a time.
create unique index if not exists stock_reservations_one_held_key on public.stock_reservations (order_request_line_id) where status = 'held';
create or replace trigger set_updated_at before update on public.stock_reservations for each row execute function public.set_updated_at();

create table if not exists public.order_request_events (
  id uuid primary key default gen_random_uuid(),
  order_request_id uuid not null references public.order_requests (id),
  event_type text not null check (char_length(event_type) between 1 and 60),
  from_status text,
  to_status text,
  reason text check (char_length(reason) <= 500),
  detail jsonb,
  actor text check (char_length(actor) <= 120),
  created_at timestamptz not null default now()
);
create index if not exists order_request_events_request_idx on public.order_request_events (order_request_id, created_at);
create or replace trigger order_request_events_append_only before update or delete on public.order_request_events
  for each row execute function public.supply_append_only();
create or replace trigger order_request_events_no_truncate before truncate on public.order_request_events
  for each statement execute function public.supply_append_only();

-- Supplier orders made from an order request (empty column; the quote link stays for quote orders).
alter table public.supply_orders add column if not exists order_request_id uuid references public.order_requests (id);
alter table public.supply_order_lines add column if not exists order_request_line_id uuid references public.order_request_lines (id);
create index if not exists supply_orders_order_request_idx on public.supply_orders (order_request_id) where order_request_id is not null;
create index if not exists supply_order_lines_order_request_line_idx on public.supply_order_lines (order_request_line_id) where order_request_line_id is not null;
-- A double tap never makes two live orders to the same partner for one request.
create unique index if not exists supply_orders_one_live_per_partner_key on public.supply_orders (order_request_id, org_id) where order_request_id is not null and status <> 'cancelled';

-- ---------------------------------------------------------------------------
-- Payments for a request (append-only, the supply ledger's rules)
-- ---------------------------------------------------------------------------
create table if not exists public.order_request_payments (
  id uuid primary key default gen_random_uuid(),
  order_request_id uuid not null references public.order_requests (id),
  entry_type text not null check (entry_type in ('customer_payment', 'refund', 'moved_to_order', 'reversal')),
  direction text not null check (direction in ('in', 'out')),
  amount_cents bigint not null check (amount_cents > 0),
  occurred_on date not null,
  method text check (method in ('bank_transfer', 'telebirr', 'cbe_birr', 'cash', 'card', 'other')),
  reference text check (char_length(reference) <= 120),
  supply_order_id uuid references public.supply_orders (id),
  reverses_entry_id uuid unique references public.order_request_payments (id),
  reason text check (char_length(reason) <= 500),
  note text check (char_length(note) <= 1000),
  created_by text check (char_length(created_by) <= 120),
  created_at timestamptz not null default now(),
  constraint order_request_payments_direction check (
    (entry_type = 'customer_payment' and direction = 'in') or (entry_type in ('refund', 'moved_to_order') and direction = 'out') or entry_type = 'reversal'
  ),
  constraint order_request_payments_reversal_link check ((entry_type = 'reversal') = (reverses_entry_id is not null)),
  constraint order_request_payments_reason_needed check (entry_type <> 'reversal' or reason is not null),
  constraint order_request_payments_order_needed check ((entry_type = 'moved_to_order') = (supply_order_id is not null))
);
create index if not exists order_request_payments_request_idx on public.order_request_payments (order_request_id, created_at);
create or replace trigger order_request_payments_append_only before update or delete on public.order_request_payments
  for each row execute function public.supply_append_only();
create or replace trigger order_request_payments_no_truncate before truncate on public.order_request_payments
  for each statement execute function public.supply_append_only();

-- ---------------------------------------------------------------------------
-- Money rules (the app has the same rules in lib/supply/order-requests.ts)
-- ---------------------------------------------------------------------------
-- Customer money still held on the request: payments − refunds − money moved to supplier orders (reversals undo).
create or replace function public.order_request_net_cents(p_request uuid)
returns bigint
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(case
    when e.entry_type = 'customer_payment' then e.amount_cents
    when e.entry_type in ('refund', 'moved_to_order') then -e.amount_cents
    when e.entry_type = 'reversal' and r.entry_type = 'customer_payment' then -e.amount_cents
    when e.entry_type = 'reversal' and r.entry_type = 'refund' then e.amount_cents
    else 0 end), 0)::bigint
  from public.order_request_payments e
  left join public.order_request_payments r on r.id = e.reverses_entry_id
  where e.order_request_id = p_request
$$;

-- Everything the customer ever paid for the request (payments, minus reversed payments).
create or replace function public.order_request_received_cents(p_request uuid)
returns bigint
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(case
    when e.entry_type = 'customer_payment' then e.amount_cents
    when e.entry_type = 'reversal' and r.entry_type = 'customer_payment' then -e.amount_cents
    else 0 end), 0)::bigint
  from public.order_request_payments e
  left join public.order_request_payments r on r.id = e.reverses_entry_id
  where e.order_request_id = p_request
$$;

-- Customer money HagerLand holds for the request: on the request plus on its supplier orders (ledger, 0037).
create or replace function public.order_request_held_cents(p_request uuid)
returns bigint
language sql
stable
set search_path = ''
as $$
  select public.order_request_net_cents(p_request)
       + coalesce((select sum(public.supply_order_paid_cents(o.id)) from public.supply_orders o where o.order_request_id = p_request), 0)::bigint
$$;

-- Allowed status changes (also in lib/supply/order-requests.ts ORDER_REQUEST_TRANSITIONS, checked by a unit test).
create or replace function public.order_request_transition_allowed(p_from text, p_to text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (p_from, p_to) in (
    ('submitted', 'checking_stock'), ('submitted', 'unavailable'), ('submitted', 'cancelled'),
    ('checking_stock', 'partially_reserved'), ('checking_stock', 'reserved'), ('checking_stock', 'unavailable'), ('checking_stock', 'cancelled'),
    ('partially_reserved', 'reserved'), ('partially_reserved', 'cancelled'),
    ('reserved', 'paid'), ('reserved', 'expired'), ('reserved', 'cancelled'), ('reserved', 'refunded'),
    ('expired', 'checking_stock'), ('expired', 'cancelled'), ('expired', 'refunded'),
    ('paid', 'fulfilling'), ('paid', 'refunded'),
    ('fulfilling', 'delivered'), ('fulfilling', 'refunded'),
    ('delivered', 'completed'), ('delivered', 'disputed'),
    ('disputed', 'completed'), ('disputed', 'refunded')
  )
$$;

-- The guard: every rule a status change must meet, whoever makes it.
create or replace function public.order_requests_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_live int;
  v_done int;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'submitted' then
      raise exception 'A new order request starts as submitted' using errcode = '23514';
    end if;
    new.status_changed_at := now();
    return new;
  end if;
  -- Prices and totals are fixed once the request is reserved (until it is reopened after expiry).
  if old.status not in ('submitted', 'checking_stock', 'partially_reserved', 'expired')
     and (new.lines_total_cents, new.delivery_charge_cents, new.customer_total_cents) is distinct from (old.lines_total_cents, old.delivery_charge_cents, old.customer_total_cents) then
    raise exception 'The prices of a reserved order request cannot change' using errcode = '23514';
  end if;
  if new.status is distinct from old.status then
    if not public.order_request_transition_allowed(old.status, new.status) then
      raise exception 'An order request cannot go from % to %', old.status, new.status using errcode = '23514';
    end if;
    if new.status in ('cancelled', 'refunded', 'disputed') and coalesce(btrim(new.status_reason), '') = '' then
      raise exception 'Give a reason' using errcode = '23514';
    end if;
    if new.status = 'unavailable' and exists (select 1 from public.order_request_lines l where l.order_request_id = new.id and l.status <> 'unavailable') then
      raise exception 'Every item must be marked unavailable first' using errcode = '23514';
    end if;
    if new.status = 'partially_reserved' and not (
         exists (select 1 from public.order_request_lines l where l.order_request_id = new.id and l.status in ('unavailable', 'short'))
         and exists (select 1 from public.order_request_lines l where l.order_request_id = new.id and l.status in ('confirmed', 'short'))
         and not exists (select 1 from public.order_request_lines l where l.order_request_id = new.id and l.status = 'requested')) then
      raise exception 'Part of the order is available only when some items are available and some are not' using errcode = '23514';
    end if;
    if new.status = 'reserved' then
      if new.reserved_until is null or new.reserved_until <= now() or coalesce(new.customer_total_cents, 0) <= 0 then
        raise exception 'A reservation needs a total and an end time in the future' using errcode = '23514';
      end if;
      if old.status = 'checking_stock' and exists (select 1 from public.order_request_lines l where l.order_request_id = new.id and l.status in ('unavailable', 'short')) then
        raise exception 'Part of the order is not available: record that first' using errcode = '23514';
      end if;
      if exists (select 1 from public.order_request_lines l where l.order_request_id = new.id and l.status = 'requested')
         or not exists (select 1 from public.order_request_lines l where l.order_request_id = new.id and l.status in ('confirmed', 'short')) then
        raise exception 'Check every item first' using errcode = '23514';
      end if;
      if exists (
        select 1 from public.order_request_lines l
        where l.order_request_id = new.id and l.status in ('confirmed', 'short')
          and (l.customer_unit_price_cents is null or l.source_org_id is null or l.cost_price_cents is null
               or not exists (select 1 from public.stock_reservations s
                              where s.order_request_line_id = l.id and s.status = 'held' and s.org_id = l.source_org_id
                                and s.qty >= l.confirmed_qty and s.held_until >= new.reserved_until))
      ) then
        raise exception 'Every item needs a price and a partner hold that lasts until the reservation ends' using errcode = '23514';
      end if;
    end if;
    -- Golden rule: paid only when recorded payments cover the total, before the reservation ends.
    if new.status = 'paid' then
      if now() > old.reserved_until or coalesce(new.customer_total_cents, 0) <= 0 or public.order_request_net_cents(new.id) < new.customer_total_cents then
        raise exception 'The customer has not paid this order request in full within the reservation' using errcode = '23514';
      end if;
    end if;
    if new.status = 'expired' and (old.reserved_until is null or old.reserved_until >= now()) then
      raise exception 'The reservation has not ended yet' using errcode = '23514';
    end if;
    if new.status = 'checking_stock' and old.status = 'expired' then
      new.reserved_until := null;
      new.payment_due_at := null;
    end if;
    if new.status = 'cancelled' and public.order_request_received_cents(new.id) <> 0 then
      raise exception 'Money was received for this request: refund it instead of cancelling' using errcode = '23514';
    end if;
    if new.status = 'refunded' then
      if public.order_request_received_cents(new.id) <= 0 then
        raise exception 'Nothing was paid: cancel it instead' using errcode = '23514';
      end if;
      if public.order_request_held_cents(new.id) <> 0 then
        raise exception 'Refund everything the customer paid first' using errcode = '23514';
      end if;
      if exists (select 1 from public.supply_orders o where o.order_request_id = new.id and o.status <> 'cancelled') then
        raise exception 'Cancel its supplier orders first' using errcode = '23514';
      end if;
    end if;
    if new.status = 'fulfilling' and not exists (select 1 from public.supply_orders o where o.order_request_id = new.id and o.status <> 'cancelled') then
      raise exception 'Create the supplier orders first' using errcode = '23514';
    end if;
    if new.status in ('delivered', 'completed') then
      select count(*) filter (where o.status <> 'cancelled'),
             count(*) filter (where o.status = 'completed' or (new.status = 'delivered' and o.status = 'delivered'))
        into v_live, v_done
      from public.supply_orders o where o.order_request_id = new.id;
      if v_live = 0 or v_done <> v_live then
        raise exception 'Every supplier order must be % first', case new.status when 'delivered' then 'delivered' else 'completed' end using errcode = '23514';
      end if;
    end if;
    new.status_changed_at := now();
    if new.status not in ('cancelled', 'refunded', 'disputed') then new.status_reason := null; end if;
  end if;
  return new;
end
$$;
create or replace trigger order_requests_guard before insert or update on public.order_requests
  for each row execute function public.order_requests_guard();

-- History in the same statement as the change; holds follow the request.
create or replace function public.order_requests_after()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_request_events (order_request_id, event_type, to_status, actor) values (new.id, 'created', new.status, coalesce(new.updated_by, 'customer'));
    return null;
  end if;
  if new.status is distinct from old.status then
    insert into public.order_request_events (order_request_id, event_type, from_status, to_status, reason, actor)
    values (new.id, 'status', old.status, new.status, new.status_reason, new.updated_by);
    if new.status = 'expired' then
      update public.stock_reservations s set status = 'expired' from public.order_request_lines l
      where s.order_request_line_id = l.id and l.order_request_id = new.id and s.status in ('held', 'asked');
    elsif new.status in ('cancelled', 'unavailable', 'refunded') then
      update public.stock_reservations s set status = 'released' from public.order_request_lines l
      where s.order_request_line_id = l.id and l.order_request_id = new.id and s.status in ('held', 'asked');
    elsif new.status = 'fulfilling' then
      update public.stock_reservations s set status = 'converted' from public.order_request_lines l
      where s.order_request_line_id = l.id and l.order_request_id = new.id and s.status = 'held';
    end if;
  end if;
  return null;
end
$$;
create or replace trigger order_requests_after after insert or update on public.order_requests
  for each row execute function public.order_requests_after();

-- Lines are never deleted; quantities, prices and sources change only before the reservation.
create or replace function public.order_request_lines_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_status text;
begin
  if tg_op = 'DELETE' then
    raise exception 'Order request lines are never deleted: mark them unavailable instead' using errcode = '42501';
  end if;
  select r.status into v_status from public.order_requests r where r.id = new.order_request_id;
  if tg_op = 'INSERT' then
    if v_status <> 'submitted' then
      raise exception 'Items are added only when the request is sent' using errcode = '23514';
    end if;
    return new;
  end if;
  if new.order_request_id <> old.order_request_id or new.product_id <> old.product_id or new.quantity <> old.quantity or new.unit <> old.unit then
    raise exception 'The items a customer asked for cannot change' using errcode = '23514';
  end if;
  if v_status not in ('submitted', 'checking_stock', 'partially_reserved', 'expired')
     and (new.status, new.confirmed_qty, new.customer_unit_price_cents, new.source_org_id, new.cost_price_cents, new.vat_treatment, new.vat_rate_bps)
         is distinct from (old.status, old.confirmed_qty, old.customer_unit_price_cents, old.source_org_id, old.cost_price_cents, old.vat_treatment, old.vat_rate_bps) then
    raise exception 'The items of a reserved order request cannot change' using errcode = '23514';
  end if;
  return new;
end
$$;
create or replace trigger order_request_lines_guard before insert or update or delete on public.order_request_lines
  for each row execute function public.order_request_lines_guard();

-- Payments: a reversal mirrors its entry exactly; refunds and reversed payments never take the request below zero;
-- money moves to an order only of this request.
create or replace function public.order_request_payments_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  original public.order_request_payments;
  v_net bigint;
  v_opposite text;
begin
  -- One payment step at a time per request (a double tap waits, then sees the first).
  perform 1 from public.order_requests r where r.id = new.order_request_id for update;
  v_net := public.order_request_net_cents(new.order_request_id);
  if new.entry_type = 'reversal' then
    select * into original from public.order_request_payments where id = new.reverses_entry_id;
    if original.id is null or original.order_request_id <> new.order_request_id then
      raise exception 'The entry to reverse does not exist' using errcode = '23503';
    end if;
    if original.entry_type in ('reversal', 'moved_to_order') then
      raise exception 'This entry cannot be reversed' using errcode = '23514';
    end if;
    v_opposite := case original.direction when 'in' then 'out' else 'in' end;
    if new.amount_cents <> original.amount_cents or new.direction <> v_opposite then
      raise exception 'A reversal must have the same amount as the entry, in the opposite direction' using errcode = '23514';
    end if;
    if original.entry_type = 'customer_payment' and v_net - new.amount_cents < 0 then
      raise exception 'This payment was already refunded or moved: it cannot be reversed' using errcode = '23514';
    end if;
  elsif new.entry_type in ('refund', 'moved_to_order') and new.amount_cents > v_net then
    raise exception 'That is more than the customer money held on this request' using errcode = '23514';
  end if;
  if new.entry_type = 'moved_to_order' and not exists (select 1 from public.supply_orders o where o.id = new.supply_order_id and o.order_request_id = new.order_request_id) then
    raise exception 'Money can only move to a supplier order of this request' using errcode = '23514';
  end if;
  return new;
end
$$;
create or replace trigger order_request_payments_guard before insert on public.order_request_payments
  for each row execute function public.order_request_payments_guard();

-- "paid" is set by the database only: when recorded payments cover the total before the reservation ends.
create or replace function public.order_request_settle(p_request uuid)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  r public.order_requests;
begin
  select * into r from public.order_requests where id = p_request for update;
  if r.id is null or r.status <> 'reserved' or now() > r.reserved_until or coalesce(r.customer_total_cents, 0) <= 0 then
    return false;
  end if;
  if public.order_request_net_cents(p_request) < r.customer_total_cents then
    return false;
  end if;
  update public.order_requests set status = 'paid', updated_by = 'system (payment covers the total)' where id = p_request;
  return true;
end
$$;

create or replace function public.order_request_payments_after()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.order_request_events (order_request_id, event_type, reason, detail, actor)
  values (new.order_request_id, 'payment_entry', new.reason, jsonb_build_object('entry_type', new.entry_type, 'amount_cents', new.amount_cents, 'entry', new.id), new.created_by);
  if new.entry_type in ('customer_payment', 'reversal') then
    perform public.order_request_settle(new.order_request_id);
  end if;
  return null;
end
$$;
create or replace trigger order_request_payments_after after insert on public.order_request_payments
  for each row execute function public.order_request_payments_after();

-- ---------------------------------------------------------------------------
-- Server steps (service role only)
-- ---------------------------------------------------------------------------
-- A customer's request and its items in one step. Only published HagerLand Supply products with an active partner source.
create or replace function public.order_request_submit(
  p_name text, p_phone text, p_email text, p_location uuid, p_address text, p_needed_by date, p_note text,
  p_user uuid, p_token_hash text, p_token_expires timestamptz, p_ip_hash text, p_lines jsonb
)
returns table (id uuid, reference text)
language plpgsql
set search_path = ''
as $$
declare
  v_req public.order_requests;
  v_line jsonb;
  v_product public.products;
begin
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) not between 1 and 50 then
    raise exception 'An order request needs between 1 and 50 items' using errcode = '22023';
  end if;
  insert into public.order_requests (name, phone, email, delivery_location_id, delivery_address, needed_by, note, requester_user_id, access_token_hash, access_token_expires_at, ip_hash, updated_by)
  values (p_name, p_phone, p_email, p_location, p_address, p_needed_by, p_note, p_user, p_token_hash, p_token_expires, p_ip_hash, 'customer')
  returning * into v_req;
  for v_line in select * from jsonb_array_elements(p_lines) loop
    select p.* into v_product from public.products p join public.organisations o on o.id = p.seller_org_id
    where p.id = (v_line ->> 'product_id')::uuid and p.status = 'published' and o.is_hagerland
      and exists (select 1 from public.product_sources s where s.product_id = p.id and s.status = 'active');
    if v_product.id is null then
      raise exception 'This product cannot be ordered' using errcode = '23514';
    end if;
    insert into public.order_request_lines (order_request_id, product_id, item_name, quantity, unit)
    values (v_req.id, v_product.id, v_product.name, (v_line ->> 'quantity')::numeric, v_product.unit);
  end loop;
  return query select v_req.id, v_req.reference;
end
$$;

-- Owner: prices, delivery charge and the reservation, all at once. The partner and cost come from the hold and the
-- product source (a snapshot). Returns the customer total.
create or replace function public.order_request_reserve(p_request uuid, p_hours int, p_delivery_cents bigint, p_prices jsonb, p_actor text)
returns bigint
language plpgsql
set search_path = ''
as $$
declare
  r public.order_requests;
  v_item jsonb;
  v_lines bigint;
  v_until timestamptz;
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
  for v_item in select * from jsonb_array_elements(coalesce(p_prices, '[]'::jsonb)) loop
    update public.order_request_lines l set customer_unit_price_cents = (v_item ->> 'price_cents')::bigint
    where l.id = (v_item ->> 'line_id')::uuid and l.order_request_id = p_request and l.status in ('confirmed', 'short');
  end loop;
  -- Source and cost snapshot from the held partner and its product source.
  update public.order_request_lines l
  set source_org_id = s.org_id,
      cost_price_cents = (select ps.cost_price_cents from public.product_sources ps where ps.product_id = l.product_id and ps.org_id = s.org_id)
  from public.stock_reservations s
  where s.order_request_line_id = l.id and s.status = 'held' and l.order_request_id = p_request and l.status in ('confirmed', 'short');
  if exists (select 1 from public.order_request_lines l where l.order_request_id = p_request and l.status in ('confirmed', 'short') and l.cost_price_cents is null) then
    raise exception 'A partner''s cost price is missing: add it to the product source first' using errcode = '23514';
  end if;
  select coalesce(sum(round(l.customer_unit_price_cents * l.confirmed_qty)), 0)::bigint into v_lines
  from public.order_request_lines l where l.order_request_id = p_request and l.status in ('confirmed', 'short');
  v_until := now() + make_interval(hours => p_hours);
  update public.order_requests
  set lines_total_cents = v_lines, delivery_charge_cents = p_delivery_cents, customer_total_cents = v_lines + p_delivery_cents,
      reserved_at = now(), reserved_until = v_until, payment_due_at = v_until, status = 'reserved', updated_by = p_actor
  where id = p_request;
  -- A payment recorded earlier (before a reopen) may already cover it.
  perform public.order_request_settle(p_request);
  return v_lines + p_delivery_cents;
end
$$;

-- Ends reservations whose time has passed (the hourly job and every admin or customer page load). Rows another step is
-- working on are skipped and caught next time. Returns the requests that ended.
create or replace function public.order_request_expire_due(p_actor text)
returns table (id uuid)
language plpgsql
set search_path = ''
as $$
begin
  update public.stock_reservations s set status = 'expired'
  where s.status = 'held' and s.held_until < now()
    and exists (select 1 from public.order_request_lines l join public.order_requests r on r.id = l.order_request_id
                where l.id = s.order_request_line_id and r.status in ('checking_stock', 'partially_reserved', 'expired'));
  return query
  with due as (
    select r.id from public.order_requests r
    where r.status = 'reserved' and r.reserved_until < now()
    for update skip locked
  )
  update public.order_requests r set status = 'expired', updated_by = p_actor
  from due where r.id = due.id
  returning r.id;
end
$$;

-- Owner: one Model A supplier order per partner from a paid request, all or nothing; the customer's money moves into
-- the supply ledger (one "customer payment" per order) and each order becomes "paid" under the existing golden rule.
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
    insert into public.supply_orders (order_request_id, org_id, agreement_id, money_model, proceed_without_agreement, customer_delivery_charge_cents, created_by, updated_by)
    values (p_request, v_org, v_agreement.id, 'A', v_agreement.id is null, case when v_first then r.delivery_charge_cents else 0 end, p_actor, p_actor)
    returning * into v_order;
    v_first := false;
    insert into public.supply_order_lines (order_id, supply_quote_line_id, order_request_line_id, item_name, quantity, unit, supplier_unit_price_cents, customer_unit_price_cents, vat_flag)
    select v_order.id, null, l.id, l.item_name, l.confirmed_qty, l.unit, l.cost_price_cents, l.customer_unit_price_cents,
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

-- When the supplier orders of a request are all delivered (or completed), the request follows.
create or replace function public.supply_orders_sync_order_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.order_requests;
  v_live int;
  v_delivered int;
  v_completed int;
begin
  if new.order_request_id is null or new.status is not distinct from old.status then
    return null;
  end if;
  select * into r from public.order_requests where id = new.order_request_id for update;
  select count(*) filter (where o.status <> 'cancelled'),
         count(*) filter (where o.status in ('delivered', 'completed')),
         count(*) filter (where o.status = 'completed')
    into v_live, v_delivered, v_completed
  from public.supply_orders o where o.order_request_id = new.order_request_id;
  if v_live = 0 then
    return null;
  end if;
  if r.status = 'fulfilling' and v_delivered = v_live then
    update public.order_requests set status = 'delivered', updated_by = 'system (supplier orders delivered)' where id = r.id;
    r.status := 'delivered';
  end if;
  if r.status in ('delivered', 'disputed') and v_completed = v_live then
    update public.order_requests set status = 'completed', updated_by = 'system (supplier orders completed)' where id = r.id;
  end if;
  return null;
end
$$;
create or replace trigger supply_orders_sync_order_request after update of status on public.supply_orders
  for each row execute function public.supply_orders_sync_order_request();

-- A customer email is sent once: the first caller claims it (a double tap or a second run gets false).
create or replace function public.order_request_claim_email(p_request uuid, p_key text)
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  update public.order_requests set emails_sent = emails_sent || p_key where id = p_request and not (p_key = any (emails_sent));
  return found;
end
$$;

revoke all on function public.order_request_claim_email(uuid, text), public.order_request_net_cents(uuid), public.order_request_received_cents(uuid), public.order_request_held_cents(uuid),
  public.order_request_transition_allowed(text, text), public.order_requests_guard(), public.order_requests_after(), public.order_request_lines_guard(),
  public.order_request_payments_guard(), public.order_request_settle(uuid), public.order_request_payments_after(),
  public.order_request_submit(text, text, text, uuid, text, date, text, uuid, text, timestamptz, text, jsonb),
  public.order_request_reserve(uuid, int, bigint, jsonb, text), public.order_request_expire_due(text),
  public.order_request_create_supply_orders(uuid, text, date), public.supply_orders_sync_order_request()
  from public, anon, authenticated;
grant execute on function public.order_request_claim_email(uuid, text), public.order_request_submit(text, text, text, uuid, text, date, text, uuid, text, timestamptz, text, jsonb),
  public.order_request_reserve(uuid, int, bigint, jsonb, text), public.order_request_expire_due(text),
  public.order_request_create_supply_orders(uuid, text, date), public.order_request_settle(uuid),
  public.order_request_net_cents(uuid), public.order_request_received_cents(uuid), public.order_request_held_cents(uuid)
  to service_role;

-- ---------------------------------------------------------------------------
-- Access: row level security on everything new. Customers read their own request (customer columns only) and the
-- cost-free line view; nothing else is granted. The server uses the service role.
-- ---------------------------------------------------------------------------
alter table public.order_requests enable row level security;
alter table public.order_request_lines enable row level security;
alter table public.stock_reservations enable row level security;
alter table public.order_request_events enable row level security;
alter table public.order_request_payments enable row level security;
revoke all on table public.order_requests, public.order_request_lines, public.stock_reservations, public.order_request_events, public.order_request_payments from public, anon, authenticated;
grant select (id, reference, name, phone, email, delivery_location_id, delivery_address, needed_by, note, status, status_changed_at, reserved_until,
  payment_due_at, lines_total_cents, delivery_charge_cents, customer_total_cents, created_at, updated_at) on public.order_requests to authenticated;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'order_requests' and policyname = 'Requesters read own order requests') then
    create policy "Requesters read own order requests" on public.order_requests for select to authenticated using (requester_user_id = (select auth.uid()));
  end if;
end
$$;

create or replace view public.order_request_lines_customer with (security_barrier = true) as
select l.id, l.order_request_id, l.product_id, l.item_name, l.quantity, l.unit, l.status, l.confirmed_qty, l.customer_unit_price_cents
from public.order_request_lines l
join public.order_requests r on r.id = l.order_request_id
where r.requester_user_id = (select auth.uid());
comment on view public.order_request_lines_customer is
  'Bypasses RLS on purpose (owned by postgres): a signed-in customer''s own order request lines, without the partner or the cost.';
revoke all on public.order_request_lines_customer from public, anon, authenticated;
grant select on public.order_request_lines_customer to authenticated;

-- Owner setting: payment details shown to customers (empty; never public: site_settings_public lists its keys).
insert into public.site_settings (key, value) values ('supply_payment_details', '""'::jsonb) on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- THE ONLY TWO NON-ADDITIVE STEPS (approved by AB: D11 and option A, reports/S6-2_stage1.md). 0 rows on live.
-- Supabase shows a "destructive operation" warning for these two "drop not null" statements. Each is paired with a
-- check, so every order and every order line still has exactly one source: a quote or an order request.
-- ---------------------------------------------------------------------------
alter table public.supply_order_lines alter column supply_quote_line_id drop not null;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'supply_order_lines_one_source') then
    alter table public.supply_order_lines add constraint supply_order_lines_one_source check ((supply_quote_line_id is null) <> (order_request_line_id is null));
  end if;
end
$$;
alter table public.supply_orders alter column quote_request_id drop not null;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'supply_orders_one_source') then
    alter table public.supply_orders add constraint supply_orders_one_source check ((quote_request_id is null) <> (order_request_id is null));
  end if;
end
$$;

insert into public.schema_migrations (version, name) values ('0049', 'order_requests') on conflict (version) do nothing;

commit;
