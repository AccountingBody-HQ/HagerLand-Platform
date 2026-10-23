-- 0036 · Supply Phase 3 (docs/HAGERLAND_SUPPLY_INTELLIGENCE_BLUEPRINT.md): suppliers for each customer quote.
-- 1. HagerLand can add items to a quote (for example, typed in from an uploaded materials list). Customers never see
--    those items: their read rule now leaves them out. Items are removed softly (removed_at), never deleted.
-- 2. supply_quote_lines: for each quote item, the partners shortlisted, asked, their replies, and the one chosen.
--    HagerLand only: no grants, no policies, no views. The server reads and writes with the service role.
-- Additive only: no existing row is changed (new columns take their defaults), nothing is dropped. Safe to run again.

alter table public.quote_request_items add column if not exists added_by_admin boolean not null default false;
alter table public.quote_request_items add column if not exists category_id uuid references public.product_categories (id) on delete set null;
alter table public.quote_request_items add column if not exists removed_at timestamptz;
alter table public.quote_request_items add column if not exists removed_by text check (char_length(removed_by) <= 120);

-- Customers read only the items they sent (the same rule as before, plus: not added by HagerLand).
-- They already cannot insert or change items (0003 revokes insert and update), so they can never add or remove one.
alter policy "Requesters read own quote items" on public.quote_request_items
  using (
    not added_by_admin
    and exists (select 1 from public.quote_requests q where q.id = quote_request_id and q.requester_user_id = auth.uid())
  );

create table if not exists public.supply_quote_lines (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests (id) on delete cascade,
  quote_item_id uuid references public.quote_request_items (id) on delete cascade,
  org_id uuid not null references public.organisations (id) on delete cascade,
  branch_id uuid references public.org_branches (id) on delete set null,
  offer_id uuid references public.supplier_offers (id) on delete set null,
  status text not null default 'shortlisted' check (status in ('shortlisted', 'asked', 'received', 'chosen', 'rejected')),
  unit text check (unit in ('piece', 'box', 'metre', 'roll', 'sheet', 'bag', 'quintal', 'tonne', 'm2', 'm3', 'litre', 'kg', 'set', 'pair')),
  unit_price_cents bigint check (unit_price_cents >= 0),
  quantity numeric(12, 2) check (quantity > 0),
  delivery_charge_cents bigint check (delivery_charge_cents >= 0),
  valid_until date,
  asked_at timestamptz,
  received_at timestamptz,
  chosen_at timestamptz,
  added_manually boolean not null default false,
  reason text check (char_length(reason) <= 500),
  note text check (char_length(note) <= 1000),
  created_by text check (char_length(created_by) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supply_quote_lines_reply_complete check (status not in ('received', 'chosen') or (unit_price_cents is not null and quantity is not null))
);
create index if not exists supply_quote_lines_quote_idx on public.supply_quote_lines (quote_request_id);
create unique index if not exists supply_quote_lines_item_org_key on public.supply_quote_lines (quote_item_id, org_id) where quote_item_id is not null;
create unique index if not exists supply_quote_lines_quote_org_key on public.supply_quote_lines (quote_request_id, org_id) where quote_item_id is null;
create unique index if not exists supply_quote_lines_one_chosen_key on public.supply_quote_lines (quote_item_id) where status = 'chosen';
create or replace trigger set_updated_at before update on public.supply_quote_lines for each row execute function public.set_updated_at();

-- Service role only: no anon or signed-in access at all (as supply_partners, 0034, and supplier_offers, 0035).
alter table public.supply_quote_lines enable row level security;
revoke all on table public.supply_quote_lines from public, anon, authenticated;

insert into public.schema_migrations (version, name) values ('0036', 'supply_quote_lines') on conflict (version) do nothing;
