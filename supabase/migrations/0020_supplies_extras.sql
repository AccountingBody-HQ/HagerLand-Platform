-- 0020 · Supplies extras (spec 25.2c, d, e and PLATFORM_VISION §1): Special Buys, trade accounts and the
-- remaining building-supplies categories. Additive only.

-- ---------------------------------------------------------------------------
-- Special Buys are managed by HagerLand only: suppliers cannot set or change them.
-- ---------------------------------------------------------------------------
create trigger protect_special_buy_columns before insert or update on public.products
  for each row execute function public.protect_privileged_columns(
    '["is_special_buy","special_was_price_etb_cents","special_qty_available","special_ends_at"]',
    '{"is_special_buy":false,"special_was_price_etb_cents":null,"special_qty_available":null,"special_ends_at":null}',
    '');

-- Live Special Buys: hidden automatically once the end date has passed or the quantity has sold out.
create view public.special_buys_public with (security_barrier = true) as
select p.id, p.slug, p.name, p.category_name, p.category_slug, p.seller_name, p.seller_slug, p.seller_is_hagerland, p.unit, p.pack_size,
       p.price_type, p.price_etb_cents, pr.special_was_price_etb_cents, pr.special_qty_available, pr.special_ends_at, p.stock_status,
       p.image_path, p.updated_at
from public.products_public p
join public.products pr on pr.id = p.id
where pr.is_special_buy
  and (pr.special_ends_at is null or pr.special_ends_at > now())
  and (pr.special_qty_available is null or pr.special_qty_available > 0)
  and p.stock_status <> 'out_of_stock';
comment on view public.special_buys_public is
  'Bypasses RLS on purpose (owned by postgres): live Special Buys of published products; expired or sold-out offers are hidden.';
revoke all on public.special_buys_public from public, anon, authenticated;
grant select on public.special_buys_public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Trade accounts: a business applies, HagerLand approves; trade prices are shown only to approved accounts.
-- ---------------------------------------------------------------------------
create table public.trade_accounts (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.next_reference('HLT'),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  org_id uuid references public.organisations (id) on delete set null,
  business_name text not null check (char_length(business_name) between 2 and 160),
  trade_type text not null check (char_length(trade_type) between 2 and 80),
  phone text not null check (char_length(phone) <= 32),
  tin text check (char_length(tin) <= 40),
  expected_monthly_spend text check (char_length(expected_monthly_spend) <= 80),
  notes text check (char_length(notes) <= 2000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'revoked')),
  admin_note text check (char_length(admin_note) <= 2000),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trade_accounts_status_idx on public.trade_accounts (status, created_at);
create trigger set_updated_at before update on public.trade_accounts for each row execute function public.set_updated_at();

alter table public.trade_accounts enable row level security;
revoke all on table public.trade_accounts from public, anon, authenticated;
-- Applicants read their own application; it is created and decided on the server only.
grant select on public.trade_accounts to authenticated;
create policy "Applicants read own trade account" on public.trade_accounts for select to authenticated using (user_id = auth.uid());

create function public.is_trade_account()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.trade_accounts t where t.user_id = auth.uid() and t.status = 'approved') and public.is_active_user()
$$;

-- Trade prices of published products, only for an approved trade account (never public, never in views).
create function public.product_trade_prices(p_ids uuid[])
returns table (id uuid, trade_price_etb_cents bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.trade_price_etb_cents
  from public.products p
  where public.is_trade_account() and p.id = any (p_ids[1:200]) and p.status = 'published' and p.trade_price_etb_cents is not null
$$;
revoke all on function public.is_trade_account(), public.product_trade_prices(uuid[]) from public, anon;
grant execute on function public.is_trade_account(), public.product_trade_prices(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Building-supplies categories still missing from PLATFORM_VISION §1.
-- ---------------------------------------------------------------------------
insert into public.product_categories (name, slug, icon, sort, description) values
  ('Construction equipment', 'construction-equipment', 'construction', 15, 'Mixers, scaffolding, formwork, compaction and site equipment.'),
  ('Interior finishing', 'interior-finishing', 'sofa', 16, 'Ceilings, partitions, gypsum board, cladding, mouldings and glass.'),
  ('Landscaping', 'landscaping', 'trees', 17, 'Paving, kerbs, fencing, garden walls and outdoor drainage.'),
  ('Specialist products', 'specialist-products', 'layers', 18, 'Admixtures, fire protection, acoustic products, joints and grouts.')
on conflict (slug) do nothing;

insert into public.product_categories (parent_id, name, slug, sort)
select p.id, c.name, c.slug, c.sort
from (values
  ('construction-equipment', 'Concrete mixers & vibrators', 'concrete-mixers', 1),
  ('construction-equipment', 'Scaffolding & formwork', 'scaffolding-formwork', 2),
  ('construction-equipment', 'Compaction equipment', 'compaction-equipment', 3),
  ('construction-equipment', 'Lifting & hoists', 'lifting-hoists', 4),
  ('construction-equipment', 'Wheelbarrows & site equipment', 'site-equipment', 5),
  ('interior-finishing', 'Ceilings & partitions', 'ceilings-partitions', 1),
  ('interior-finishing', 'Gypsum board', 'gypsum-board', 2),
  ('interior-finishing', 'Cladding & panels', 'cladding-panels', 3),
  ('interior-finishing', 'Skirting & mouldings', 'skirting-mouldings', 4),
  ('interior-finishing', 'Glass & mirrors', 'glass-mirrors', 5),
  ('landscaping', 'Paving & kerbs', 'paving-kerbs', 1),
  ('landscaping', 'Fencing & gates', 'fencing-gates', 2),
  ('landscaping', 'Garden walls & stone', 'garden-walls-stone', 3),
  ('landscaping', 'Outdoor drainage', 'outdoor-drainage', 4),
  ('specialist-products', 'Concrete admixtures', 'concrete-admixtures', 1),
  ('specialist-products', 'Fire protection', 'fire-protection', 2),
  ('specialist-products', 'Acoustic products', 'acoustic-products', 3),
  ('specialist-products', 'Expansion joints & grouts', 'joints-grouts', 4)
) as c (parent_slug, name, slug, sort)
join public.product_categories p on p.slug = c.parent_slug and p.parent_id is null
on conflict (slug) do nothing;

insert into public.schema_migrations (version, name) values ('0020', 'supplies_extras') on conflict (version) do nothing;
