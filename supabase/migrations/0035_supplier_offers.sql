-- 0035 · Supplier offers (docs/HAGERLAND_SUPPLY_INTELLIGENCE_BLUEPRINT.md, Phase 2): HagerLand's private, dated price
-- lists from supply partners. Append-only: a new price is a new row; the previous current offer for the same item
-- becomes "superseded" in the same statement (trigger below), so history is never lost and at most one offer per
-- partner, branch, item and unit is current. Public product prices are not touched.
-- HagerLand only: no grants, no policies, no views. The server reads and writes with the service role.
-- Additive only; safe to run again (nothing is created twice).

create table if not exists public.supplier_offers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  branch_id uuid references public.org_branches (id) on delete set null,
  product_id uuid references public.products (id) on delete set null,
  category_id uuid references public.product_categories (id) on delete set null,
  item_name text check (char_length(item_name) between 1 and 200),
  -- Lower case, accents and punctuation removed (set by the server): matches the same item across price lists.
  item_key text not null check (char_length(item_key) between 1 and 200),
  unit text not null check (unit in ('piece', 'box', 'metre', 'roll', 'sheet', 'bag', 'quintal', 'tonne', 'm2', 'm3', 'litre', 'kg', 'set', 'pair')),
  pack_size numeric(12, 3) check (pack_size > 0),
  price_etb_cents bigint not null check (price_etb_cents > 0),
  price_date date not null,
  valid_until date not null,
  min_order_qty numeric(12, 2) check (min_order_qty > 0),
  delivery_area_ids uuid[] not null default '{}' check (cardinality(delivery_area_ids) <= 50),
  delivery_charge_etb_cents bigint check (delivery_charge_etb_cents >= 0),
  delivery_note text check (char_length(delivery_note) <= 500),
  lead_time_days int check (lead_time_days >= 0 and lead_time_days <= 365),
  vat_included text not null default 'unknown' check (vat_included in ('yes', 'no', 'unknown')),
  fx_linked boolean not null default false,
  source text not null check (source in ('direct_call', 'site_visit', 'partner_submitted', 'price_list_photo', 'business_website', 'other')),
  source_note text check (char_length(source_note) <= 500),
  captured_at timestamptz not null default now(),
  captured_by text check (char_length(captured_by) <= 120),
  confidence text check (confidence in ('low', 'medium', 'high')),
  -- Paths in the private documents bucket; served only through short-lived signed links after an admin check.
  evidence_paths text[] not null default '{}' check (cardinality(evidence_paths) <= 10),
  status text not null default 'current' check (status in ('current', 'superseded', 'withdrawn')),
  -- Deferred: the trigger points the old offer at the new one before the new row exists.
  superseded_by uuid references public.supplier_offers (id) deferrable initially deferred,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supplier_offers_valid_dates check (valid_until >= price_date),
  constraint supplier_offers_item_present check (product_id is not null or (category_id is not null and item_name is not null))
);
create unique index if not exists supplier_offers_one_current_key on public.supplier_offers
  (org_id, coalesce(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), item_key, unit) where status = 'current';
create index if not exists supplier_offers_org_status_idx on public.supplier_offers (org_id, status);
create index if not exists supplier_offers_valid_until_idx on public.supplier_offers (valid_until) where status = 'current';
create index if not exists supplier_offers_product_idx on public.supplier_offers (product_id);
create index if not exists supplier_offers_category_idx on public.supplier_offers (category_id);
create index if not exists supplier_offers_item_key_idx on public.supplier_offers (item_key);
create or replace trigger set_updated_at before update on public.supplier_offers for each row execute function public.set_updated_at();

-- A new current offer supersedes the current one for the same partner, branch, item and unit, in the same statement.
-- If two saves race, the second waits for the first and then fails on the unique index (nothing is half-saved).
create or replace function public.supplier_offers_supersede()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'current' then
    update public.supplier_offers o
    set status = 'superseded', superseded_by = new.id
    where o.status = 'current'
      and o.org_id = new.org_id
      and coalesce(o.branch_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce(new.branch_id, '00000000-0000-0000-0000-000000000000'::uuid)
      and o.item_key = new.item_key
      and o.unit = new.unit
      and o.id <> new.id;
  end if;
  return new;
end
$$;
create or replace trigger supplier_offers_supersede before insert on public.supplier_offers
  for each row execute function public.supplier_offers_supersede();
revoke all on function public.supplier_offers_supersede() from public, anon, authenticated;

-- Service role only: no anon or signed-in access at all (as supply_partners, 0034).
alter table public.supplier_offers enable row level security;
revoke all on table public.supplier_offers from public, anon, authenticated;

insert into public.schema_migrations (version, name) values ('0035', 'supplier_offers') on conflict (version) do nothing;
