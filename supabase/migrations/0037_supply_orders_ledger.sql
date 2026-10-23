-- 0037 · Supply Phase 4 (docs/HAGERLAND_SUPPLY_INTELLIGENCE_BLUEPRINT.md): agreements with supply partners, orders to
-- suppliers, delivery proof and a money ledger. HagerLand only: every new table has row level security on, no grants
-- and no policies; the server reads and writes with the service role. Records are closed or cancelled, never deleted:
-- the order timeline and the ledger cannot be changed or deleted at all. Also removes three unused privileges
-- (TRUNCATE, REFERENCES, TRIGGER) that signed-in users held on 19 of the site's own tables. Legacy tables untouched.
-- Additive: no existing row is changed. Safe to run again.

-- ---------------------------------------------------------------------------
-- Agreements: the signed terms with a partner (money model A margin, B commission, or both).
-- ---------------------------------------------------------------------------
create table if not exists public.supply_agreements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id),
  money_model text not null check (money_model in ('A', 'B', 'both')),
  commission_rate_bps int check (commission_rate_bps between 0 and 10000),
  payment_terms text check (char_length(payment_terms) <= 1000),
  credit_days int check (credit_days between 0 and 365),
  start_date date not null,
  end_date date,
  status text not null default 'draft' check (status in ('draft', 'active', 'expired', 'terminated')),
  terminated_reason text check (char_length(terminated_reason) <= 500),
  document_path text check (char_length(document_path) <= 300),
  notes text check (char_length(notes) <= 2000),
  created_by text check (char_length(created_by) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supply_agreements_commission_needed check (money_model = 'A' or commission_rate_bps is not null),
  constraint supply_agreements_dates check (end_date is null or end_date >= start_date),
  constraint supply_agreements_terminated_reason check (status <> 'terminated' or terminated_reason is not null)
);
create unique index if not exists supply_agreements_one_active_key on public.supply_agreements (org_id) where status = 'active';
create index if not exists supply_agreements_org_idx on public.supply_agreements (org_id, created_at desc);
create or replace trigger set_updated_at before update on public.supply_agreements for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Orders to suppliers, one per supplier per customer quote. Reference HLO-YYYY-NNNNNN (never reused).
-- ---------------------------------------------------------------------------
create table if not exists public.supply_orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.next_reference('HLO'),
  quote_request_id uuid not null references public.quote_requests (id),
  org_id uuid not null references public.organisations (id),
  agreement_id uuid references public.supply_agreements (id),
  money_model text not null check (money_model in ('A', 'B')),
  status text not null default 'draft' check (status in ('draft', 'awaiting_payment', 'paid', 'placed', 'confirmed', 'out_for_delivery', 'delivered', 'completed', 'cancelled', 'disputed')),
  proceed_without_agreement boolean not null default false,
  commission_rate_bps int check (commission_rate_bps between 0 and 10000),
  customer_delivery_charge_cents bigint check (customer_delivery_charge_cents >= 0),
  supplier_delivery_charge_cents bigint check (supplier_delivery_charge_cents >= 0),
  status_reason text check (char_length(status_reason) <= 500),
  status_changed_at timestamptz not null default now(),
  placed_at timestamptz,
  delivered_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_by text check (char_length(created_by) <= 120),
  updated_by text check (char_length(updated_by) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supply_orders_model_b_no_payment_steps check (money_model = 'A' or status not in ('awaiting_payment', 'paid'))
);
create index if not exists supply_orders_quote_idx on public.supply_orders (quote_request_id);
create index if not exists supply_orders_org_idx on public.supply_orders (org_id);
create index if not exists supply_orders_status_idx on public.supply_orders (status, status_changed_at);
create or replace trigger set_updated_at before update on public.supply_orders for each row execute function public.set_updated_at();

create table if not exists public.supply_order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.supply_orders (id),
  supply_quote_line_id uuid not null references public.supply_quote_lines (id),
  quote_item_id uuid references public.quote_request_items (id),
  item_name text not null check (char_length(item_name) between 1 and 300),
  quantity numeric(12, 2) not null check (quantity > 0),
  unit text not null check (unit in ('piece', 'box', 'metre', 'roll', 'sheet', 'bag', 'quintal', 'tonne', 'm2', 'm3', 'litre', 'kg', 'set', 'pair')),
  supplier_unit_price_cents bigint not null check (supplier_unit_price_cents >= 0),
  customer_unit_price_cents bigint check (customer_unit_price_cents >= 0),
  vat_flag text not null default 'unknown' check (vat_flag in ('yes', 'no', 'unknown')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists supply_order_lines_order_idx on public.supply_order_lines (order_id);
create index if not exists supply_order_lines_quote_line_idx on public.supply_order_lines (supply_quote_line_id);
create or replace trigger set_updated_at before update on public.supply_order_lines for each row execute function public.set_updated_at();

-- Append-only timeline of each order: status changes, payments, delivery proof.
create table if not exists public.supply_order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.supply_orders (id),
  event_type text not null check (char_length(event_type) between 1 and 60),
  from_status text,
  to_status text,
  reason text check (char_length(reason) <= 500),
  detail jsonb,
  actor text check (char_length(actor) <= 120),
  created_at timestamptz not null default now()
);
create index if not exists supply_order_events_order_idx on public.supply_order_events (order_id, created_at);

create table if not exists public.supply_delivery_proofs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.supply_orders (id),
  file_path text not null check (char_length(file_path) between 1 and 300),
  file_type text not null check (file_type in ('image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf')),
  file_size_bytes int not null check (file_size_bytes between 1 and 10485760),
  taken_at timestamptz,
  received_by_name text check (char_length(received_by_name) <= 120),
  received_by_phone text check (received_by_phone ~ '^\+[0-9]{8,15}$'),
  note text check (char_length(note) <= 1000),
  uploaded_by text check (char_length(uploaded_by) <= 120),
  removed_at timestamptz,
  removed_by text check (char_length(removed_by) <= 120),
  removed_reason text check (char_length(removed_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supply_delivery_proofs_removed_reason check (removed_at is null or removed_reason is not null)
);
create index if not exists supply_delivery_proofs_order_idx on public.supply_delivery_proofs (order_id);
create or replace trigger set_updated_at before update on public.supply_delivery_proofs for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Ledger: money in, out and owed. Append-only; a mistake is corrected by a reversal (once per entry).
-- ---------------------------------------------------------------------------
create table if not exists public.supply_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  entry_type text not null check (entry_type in ('customer_payment', 'supplier_payment', 'commission_due', 'commission_received', 'service_fee', 'refund', 'adjustment', 'reversal')),
  direction text not null check (direction in ('in', 'out', 'receivable')),
  amount_cents bigint not null check (amount_cents > 0),
  occurred_on date not null,
  method text check (method in ('bank_transfer', 'telebirr', 'cbe_birr', 'cash', 'card', 'other')),
  reference text check (char_length(reference) <= 120),
  original_currency char(3) check (original_currency ~ '^[A-Z]{3}$'),
  original_amount_minor bigint check (original_amount_minor > 0),
  fx_rate numeric(18, 6) check (fx_rate > 0),
  order_id uuid references public.supply_orders (id),
  org_id uuid references public.organisations (id),
  quote_request_id uuid references public.quote_requests (id),
  reverses_entry_id uuid unique references public.supply_ledger_entries (id),
  reason text check (char_length(reason) <= 500),
  note text check (char_length(note) <= 1000),
  created_by text check (char_length(created_by) <= 120),
  created_at timestamptz not null default now(),
  constraint supply_ledger_direction_matches check (
    (entry_type = 'customer_payment' and direction = 'in') or (entry_type = 'supplier_payment' and direction = 'out')
    or (entry_type = 'commission_due' and direction = 'receivable') or (entry_type = 'commission_received' and direction = 'in')
    or (entry_type = 'service_fee' and direction = 'in') or (entry_type = 'refund' and direction = 'out')
    or (entry_type = 'adjustment' and direction in ('in', 'out')) or entry_type = 'reversal'
  ),
  constraint supply_ledger_reason_needed check (entry_type not in ('adjustment', 'reversal') or reason is not null),
  constraint supply_ledger_reversal_link check ((entry_type = 'reversal') = (reverses_entry_id is not null)),
  constraint supply_ledger_fx_together check ((original_currency is null) = (original_amount_minor is null) and (original_currency is null) = (fx_rate is null)),
  constraint supply_ledger_order_needed check (entry_type not in ('customer_payment', 'refund', 'supplier_payment', 'commission_due', 'commission_received') or order_id is not null)
);
create index if not exists supply_ledger_order_idx on public.supply_ledger_entries (order_id);
create index if not exists supply_ledger_occurred_idx on public.supply_ledger_entries (occurred_on desc, created_at desc);
create index if not exists supply_ledger_org_idx on public.supply_ledger_entries (org_id);

-- ---------------------------------------------------------------------------
-- Money rules, shared by the triggers (the app has the same rules in lib/supply/money.ts).
-- ---------------------------------------------------------------------------
-- Customer total of a model A order: customer price × quantity (rounded half up to the cent) plus delivery.
create or replace function public.supply_order_customer_total_cents(p_order uuid)
returns bigint
language sql
stable
set search_path = ''
as $$
  select coalesce((select sum(round(l.customer_unit_price_cents * l.quantity)) from public.supply_order_lines l where l.order_id = p_order), 0)::bigint
       + coalesce((select o.customer_delivery_charge_cents from public.supply_orders o where o.id = p_order), 0)
$$;

-- What the customer has paid for an order: payments minus refunds, with reversed entries taken back out.
create or replace function public.supply_order_paid_cents(p_order uuid)
returns bigint
language sql
stable
set search_path = ''
as $$
  select coalesce(sum(case
    when e.entry_type = 'customer_payment' then e.amount_cents
    when e.entry_type = 'refund' then -e.amount_cents
    when e.entry_type = 'reversal' and r.entry_type = 'customer_payment' then -e.amount_cents
    when e.entry_type = 'reversal' and r.entry_type = 'refund' then e.amount_cents
    else 0 end), 0)::bigint
  from public.supply_ledger_entries e
  left join public.supply_ledger_entries r on r.id = e.reverses_entry_id
  where e.order_id = p_order
$$;

-- The allowed status changes (also in lib/supply/money.ts ORDER_TRANSITIONS, checked by a unit test).
--   Model A: draft → awaiting_payment | cancelled; awaiting_payment → paid | cancelled; paid → placed | cancelled;
--            placed → confirmed | cancelled; confirmed → out_for_delivery | cancelled;
--            out_for_delivery → delivered | disputed | cancelled; delivered → completed | disputed;
--            disputed → delivered | cancelled.
--   Model B: the same without the payment steps: draft → placed | cancelled, then from placed as model A.
create or replace function public.supply_order_transition_allowed(p_model text, p_from text, p_to text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (p_from, p_to) in (
    ('placed', 'confirmed'), ('placed', 'cancelled'),
    ('confirmed', 'out_for_delivery'), ('confirmed', 'cancelled'),
    ('out_for_delivery', 'delivered'), ('out_for_delivery', 'disputed'), ('out_for_delivery', 'cancelled'),
    ('delivered', 'completed'), ('delivered', 'disputed'),
    ('disputed', 'delivered'), ('disputed', 'cancelled')
  )
  or (p_model = 'A' and (p_from, p_to) in (
    ('draft', 'awaiting_payment'), ('draft', 'cancelled'),
    ('awaiting_payment', 'paid'), ('awaiting_payment', 'cancelled'),
    ('paid', 'placed'), ('paid', 'cancelled')
  ))
  or (p_model = 'B' and (p_from, p_to) in (('draft', 'placed'), ('draft', 'cancelled')))
$$;

-- Orders start as drafts; every status change must be allowed, cancel and dispute need a reason, completion needs
-- delivery proof, and (golden rule) a model A order is never paid or placed before the customer has paid in full.
create or replace function public.supply_orders_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  total bigint;
begin
  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception 'A new order starts as a draft' using errcode = '23514';
    end if;
    new.status_changed_at := now();
    return new;
  end if;
  if old.status <> 'draft' and (new.money_model, new.org_id, new.quote_request_id, new.agreement_id, new.commission_rate_bps, new.customer_delivery_charge_cents, new.supplier_delivery_charge_cents)
      is distinct from (old.money_model, old.org_id, old.quote_request_id, old.agreement_id, old.commission_rate_bps, old.customer_delivery_charge_cents, old.supplier_delivery_charge_cents) then
    raise exception 'Only a draft order can be changed' using errcode = '23514';
  end if;
  if new.status is distinct from old.status then
    if not public.supply_order_transition_allowed(new.money_model, old.status, new.status) then
      raise exception 'An order cannot go from % to %', old.status, new.status using errcode = '23514';
    end if;
    if new.status in ('cancelled', 'disputed') and coalesce(btrim(new.status_reason), '') = '' then
      raise exception 'Give a reason to % an order', case new.status when 'cancelled' then 'cancel' else 'dispute' end using errcode = '23514';
    end if;
    if new.money_model = 'A' and new.status in ('paid', 'placed', 'confirmed', 'out_for_delivery', 'delivered', 'completed') then
      total := public.supply_order_customer_total_cents(new.id);
      if total <= 0 or public.supply_order_paid_cents(new.id) < total then
        raise exception 'The customer has not paid this order in full yet' using errcode = '23514';
      end if;
    end if;
    if new.status = 'completed' and not exists (select 1 from public.supply_delivery_proofs p where p.order_id = new.id and p.removed_at is null) then
      raise exception 'Add delivery proof before completing the order' using errcode = '23514';
    end if;
    new.status_changed_at := now();
    if new.status = 'placed' then new.placed_at := now(); end if;
    if new.status = 'delivered' and old.status <> 'disputed' then new.delivered_at := now(); end if;
    if new.status = 'completed' then new.completed_at := now(); end if;
    if new.status = 'cancelled' then new.cancelled_at := now(); end if;
  end if;
  return new;
end
$$;
create or replace trigger supply_orders_guard before insert or update on public.supply_orders
  for each row execute function public.supply_orders_guard();

-- Timeline entries are written by the database in the same statement as the change they record.
create or replace function public.supply_orders_timeline()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.supply_order_events (order_id, event_type, to_status, actor) values (new.id, 'created', new.status, new.created_by);
  elsif new.status is distinct from old.status then
    insert into public.supply_order_events (order_id, event_type, from_status, to_status, reason, actor)
    values (new.id, 'status', old.status, new.status, new.status_reason, new.updated_by);
  end if;
  return null;
end
$$;
create or replace trigger supply_orders_timeline after insert or update on public.supply_orders
  for each row execute function public.supply_orders_timeline();

-- A quote line can be in only one order that is not cancelled. Lines are fixed once the order leaves draft, and never deleted.
create or replace function public.supply_order_lines_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Order lines are never deleted: cancel the order instead' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and (select o.status from public.supply_orders o where o.id = old.order_id) <> 'draft' then
    raise exception 'Only a draft order can be changed' using errcode = '23514';
  end if;
  -- Lock the quote line so two orders made at the same moment cannot both take it.
  perform 1 from public.supply_quote_lines q where q.id = new.supply_quote_line_id for update;
  if exists (
    select 1 from public.supply_order_lines l join public.supply_orders o on o.id = l.order_id
    where l.supply_quote_line_id = new.supply_quote_line_id and l.id <> new.id and o.status <> 'cancelled'
  ) then
    raise exception 'This supplier line is already in an order' using errcode = '23505';
  end if;
  return new;
end
$$;
create or replace trigger supply_order_lines_guard before insert or update or delete on public.supply_order_lines
  for each row execute function public.supply_order_lines_guard();

-- Append-only tables: no changes, no deletions, no emptying.
create or replace function public.supply_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only: add a new entry instead of changing or deleting one', tg_table_name using errcode = '42501';
end
$$;
create or replace trigger supply_order_events_append_only before update or delete on public.supply_order_events
  for each row execute function public.supply_append_only();
create or replace trigger supply_order_events_no_truncate before truncate on public.supply_order_events
  for each statement execute function public.supply_append_only();
create or replace trigger supply_ledger_append_only before update or delete on public.supply_ledger_entries
  for each row execute function public.supply_append_only();
create or replace trigger supply_ledger_no_truncate before truncate on public.supply_ledger_entries
  for each statement execute function public.supply_append_only();

-- A reversal must mirror the entry it corrects exactly, and a reversal cannot itself be reversed.
create or replace function public.supply_ledger_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  original public.supply_ledger_entries;
  opposite text;
begin
  if new.entry_type = 'reversal' then
    select * into original from public.supply_ledger_entries where id = new.reverses_entry_id;
    if original.id is null then
      raise exception 'The entry to reverse does not exist' using errcode = '23503';
    end if;
    if original.entry_type = 'reversal' then
      raise exception 'A reversal cannot be reversed: add a new entry instead' using errcode = '23514';
    end if;
    opposite := case original.direction when 'in' then 'out' when 'out' then 'in' else 'receivable' end;
    if new.amount_cents <> original.amount_cents or new.order_id is distinct from original.order_id or new.direction <> opposite then
      raise exception 'A reversal must have the same amount and order as the entry, in the opposite direction' using errcode = '23514';
    end if;
  end if;
  return new;
end
$$;
create or replace trigger supply_ledger_guard before insert on public.supply_ledger_entries
  for each row execute function public.supply_ledger_guard();

-- Payments and delivery proof also appear on the order's timeline.
create or replace function public.supply_ledger_timeline()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.order_id is not null then
    insert into public.supply_order_events (order_id, event_type, reason, detail, actor)
    values (new.order_id, 'ledger_entry', new.reason, jsonb_build_object('entry_type', new.entry_type, 'direction', new.direction, 'amount_cents', new.amount_cents, 'entry', new.id), new.created_by);
  end if;
  return null;
end
$$;
create or replace trigger supply_ledger_timeline after insert on public.supply_ledger_entries
  for each row execute function public.supply_ledger_timeline();

-- Delivery proof is never deleted; the only change allowed is marking it removed, with a reason, once.
create or replace function public.supply_delivery_proofs_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Delivery proof is never deleted: mark it removed with a reason' using errcode = '42501';
  end if;
  if old.removed_at is not null or (new.order_id, new.file_path, new.file_type, new.file_size_bytes, new.taken_at, new.received_by_name, new.received_by_phone, new.note, new.uploaded_by)
      is distinct from (old.order_id, old.file_path, old.file_type, old.file_size_bytes, old.taken_at, old.received_by_name, old.received_by_phone, old.note, old.uploaded_by) then
    raise exception 'Delivery proof cannot be changed, only marked removed once' using errcode = '23514';
  end if;
  return new;
end
$$;
create or replace trigger supply_delivery_proofs_guard before update or delete on public.supply_delivery_proofs
  for each row execute function public.supply_delivery_proofs_guard();

create or replace function public.supply_delivery_proofs_timeline()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.supply_order_events (order_id, event_type, detail, actor)
    values (new.order_id, 'proof_added', jsonb_build_object('proof', new.id, 'received_by', new.received_by_name), new.uploaded_by);
  elsif new.removed_at is not null and old.removed_at is null then
    insert into public.supply_order_events (order_id, event_type, reason, detail, actor)
    values (new.order_id, 'proof_removed', new.removed_reason, jsonb_build_object('proof', new.id), new.removed_by);
  end if;
  return null;
end
$$;
create or replace trigger supply_delivery_proofs_timeline after insert or update on public.supply_delivery_proofs
  for each row execute function public.supply_delivery_proofs_timeline();

-- Creates a draft order and its lines in one go (all or nothing). Called by the server only.
create or replace function public.supply_create_order(
  p_quote uuid, p_org uuid, p_model text, p_agreement uuid, p_proceed boolean, p_commission_bps int,
  p_supplier_delivery_cents bigint, p_actor text, p_lines jsonb
)
returns table (id uuid, reference text)
language plpgsql
set search_path = ''
as $$
declare
  created public.supply_orders;
begin
  insert into public.supply_orders (quote_request_id, org_id, agreement_id, money_model, proceed_without_agreement, commission_rate_bps, supplier_delivery_charge_cents, created_by, updated_by)
  values (p_quote, p_org, p_agreement, p_model, p_proceed, p_commission_bps, p_supplier_delivery_cents, p_actor, p_actor)
  returning * into created;
  insert into public.supply_order_lines (order_id, supply_quote_line_id, quote_item_id, item_name, quantity, unit, supplier_unit_price_cents, vat_flag)
  select created.id, l.supply_quote_line_id, l.quote_item_id, l.item_name, l.quantity, l.unit, l.supplier_unit_price_cents, l.vat_flag
  from jsonb_to_recordset(p_lines) as l (supply_quote_line_id uuid, quote_item_id uuid, item_name text, quantity numeric, unit text, supplier_unit_price_cents bigint, vat_flag text);
  return query select created.id, created.reference;
end
$$;

revoke all on function public.supply_order_customer_total_cents(uuid), public.supply_order_paid_cents(uuid),
  public.supply_order_transition_allowed(text, text, text),
  public.supply_create_order(uuid, uuid, text, uuid, boolean, int, bigint, text, jsonb) from public, anon, authenticated;
grant execute on function public.supply_create_order(uuid, uuid, text, uuid, boolean, int, bigint, text, jsonb) to service_role;
revoke all on function public.supply_orders_guard(), public.supply_orders_timeline(), public.supply_order_lines_guard(), public.supply_append_only(),
  public.supply_ledger_guard(), public.supply_ledger_timeline(), public.supply_delivery_proofs_guard(), public.supply_delivery_proofs_timeline() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Service role only: no anon or signed-in access at all (as 0034–0036).
-- ---------------------------------------------------------------------------
alter table public.supply_agreements enable row level security;
alter table public.supply_orders enable row level security;
alter table public.supply_order_lines enable row level security;
alter table public.supply_order_events enable row level security;
alter table public.supply_delivery_proofs enable row level security;
alter table public.supply_ledger_entries enable row level security;
revoke all on table public.supply_agreements, public.supply_orders, public.supply_order_lines, public.supply_order_events,
  public.supply_delivery_proofs, public.supply_ledger_entries from public, anon, authenticated;

-- Private files for agreements and delivery proof: not public, no access policies (service role only), 10 MB,
-- photos (JPEG, PNG, WebP, HEIC) and PDF only. Viewed through short-lived signed links made by the server.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('supply-private', 'supply-private', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do nothing;

-- Unused privileges signed-in users held on the site's own tables (they allow emptying a table or adding triggers or
-- foreign keys; the site never uses them). Legacy tables are not touched.
revoke truncate, references, trigger on table
  public.brands, public.claims, public.developments, public.enquiries, public.locations, public.media,
  public.org_product_categories, public.organisation_members, public.organisation_services, public.organisations,
  public.portfolio_projects, public.product_categories, public.products, public.profiles, public.properties,
  public.quote_request_items, public.quote_requests, public.service_categories, public.verification_requests
from anon, authenticated;

insert into public.schema_migrations (version, name) values ('0037', 'supply_orders_ledger') on conflict (version) do nothing;
