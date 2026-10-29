-- 0048 · S6-1 Private partner registration, partner portal and product drafts (reports/S6-0_review.md B1, AB's
-- decisions D1–D9). HagerLand is the seller: businesses that supply HagerLand (manufacturers, importers, suppliers and
-- shops) are never visible to customers.
--   - partner_registrations: a business registers (public form or staff on its behalf); one database step creates the
--     registration, a private organisation (status draft, never published) and its supply_partners record.
--   - partner_members and partner_invitations: people who may use a partner's private area. Separate from
--     organisation_members and org_invitations, so a partner never gets a business page, a team or self-listing.
--   - partner_product_drafts: products a partner proposes; HagerLand reviews each one.
--   - product_sources: which partner supplies a HagerLand Supply product, and on what terms (owner only).
--   - supply_agreements: two new optional terms (default markup, settlement timing), empty, no default.
--   - partner_my_products: what a signed-in partner member may read about their own drafts (nothing else).
--   - Four owner switches, all off.
--   - Safety rules in the database: a partner organisation can never be published, sent for review or get business
--     members; a product with a partner source must be sold by a HagerLand organisation.
-- Additive only: new tables, new empty columns, new functions, triggers and indexes, and four new settings inserted only
-- if absent. Nothing is dropped; no existing row, column rule, policy or grant changes; row level security is on for
-- every new table. No legacy table (including the old site's "jobs") is touched. Safe to run again.
begin;

-- ---------------------------------------------------------------------------
-- Registrations
-- ---------------------------------------------------------------------------
create table if not exists public.partner_registrations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.next_reference('HLB'),
  roles text[] not null check (cardinality(roles) between 1 and 4 and roles <@ array['manufacturer', 'importer', 'supplier', 'retail_shop']::text[]),
  business_name text not null check (char_length(business_name) between 2 and 160),
  other_names text check (char_length(other_names) <= 300),
  tin text check (char_length(tin) <= 40),
  city_location_id uuid references public.locations (id),
  subcity_location_id uuid references public.locations (id),
  woreda_location_id uuid references public.locations (id),
  contact_name text not null check (char_length(contact_name) between 1 and 120),
  -- E.164 (+251…); empty only once the keeping period has cleared it.
  phone text not null check (phone = '' or phone ~ '^\+[0-9]{8,15}$'),
  email text check (char_length(email) <= 254),
  category_ids uuid[] not null default '{}' check (cardinality(category_ids) <= 30),
  message text check (char_length(message) <= 2000),
  consent_at timestamptz,
  consent_version text check (char_length(consent_version) <= 40),
  status text not null default 'submitted' check (status in ('submitted', 'in_review', 'approved', 'changes_requested', 'declined', 'suspended')),
  status_changed_at timestamptz not null default now(),
  decided_at timestamptz,
  admin_note text check (char_length(admin_note) <= 2000),
  org_id uuid not null references public.organisations (id),
  source text not null check (source in ('public_form', 'staff')),
  created_by text check (char_length(created_by) <= 120),
  ip_hash text check (char_length(ip_hash) <= 128),
  personal_data_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- The public form always records consent; staff add businesses they met in the field.
  constraint partner_registrations_consent check (source = 'staff' or (consent_at is not null and consent_version is not null))
);
create index if not exists partner_registrations_status_idx on public.partner_registrations (status, created_at desc);
create index if not exists partner_registrations_org_idx on public.partner_registrations (org_id);
create index if not exists partner_registrations_retention_idx on public.partner_registrations (updated_at) where personal_data_deleted_at is null;
create or replace trigger set_updated_at before update on public.partner_registrations for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Partner members and invitations (never organisation_members / org_invitations)
-- ---------------------------------------------------------------------------
create table if not exists public.partner_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'owner' check (role in ('owner', 'staff')),
  invitation_id uuid,
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create index if not exists partner_members_user_idx on public.partner_members (user_id);

create table if not exists public.partner_invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id),
  registration_id uuid references public.partner_registrations (id),
  email text not null check (email = lower(email) and char_length(email) <= 254),
  name text check (char_length(name) <= 120),
  token_hash text not null unique,
  invited_by text check (char_length(invited_by) <= 120),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists partner_invitations_org_idx on public.partner_invitations (org_id, created_at desc);
-- One open invitation per partner: sending again withdraws the previous one first.
create unique index if not exists partner_invitations_one_open_key on public.partner_invitations (org_id) where accepted_at is null and revoked_at is null;

-- ---------------------------------------------------------------------------
-- Product drafts from partners
-- ---------------------------------------------------------------------------
create table if not exists public.partner_product_drafts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id),
  created_by_user uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 2 and 160),
  brand_name text check (char_length(brand_name) <= 80),
  category_id uuid references public.product_categories (id),
  unit text not null default 'piece' check (unit in ('piece', 'box', 'metre', 'roll', 'sheet', 'bag', 'quintal', 'tonne', 'm2', 'm3', 'litre', 'kg', 'set', 'pair')),
  pack_size text check (char_length(pack_size) <= 60),
  description text check (char_length(description) <= 8000),
  specs jsonb not null default '[]' check (jsonb_typeof(specs) = 'array'),
  -- Private: never shown to customers, other partners or staff other than the owner.
  partner_sku text check (char_length(partner_sku) <= 60),
  proposed_price_cents bigint check (proposed_price_cents >= 0),
  stock_note text check (char_length(stock_note) <= 500),
  lead_time_days int check (lead_time_days between 0 and 365),
  min_order_qty numeric(12, 2) check (min_order_qty > 0),
  -- Paths in the private documents bucket (docs/partner/<draft id>/…), re-encoded on upload.
  photo_paths text[] not null default '{}' check (cardinality(photo_paths) <= 8),
  status text not null default 'draft' check (status in ('draft', 'submitted', 'changes_requested', 'approved', 'rejected', 'withdrawn')),
  status_changed_at timestamptz not null default now(),
  submitted_at timestamptz,
  decided_at timestamptz,
  reviewer_note text check (char_length(reviewer_note) <= 2000),
  product_id uuid references public.products (id),
  personal_data_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists partner_product_drafts_org_idx on public.partner_product_drafts (org_id, created_at desc);
create index if not exists partner_product_drafts_status_idx on public.partner_product_drafts (status, status_changed_at);
create index if not exists partner_product_drafts_retention_idx on public.partner_product_drafts (decided_at) where personal_data_deleted_at is null;
create or replace trigger set_updated_at before update on public.partner_product_drafts for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Product sources: which partner supplies a HagerLand Supply product (owner only; fields stored, not computed yet)
-- ---------------------------------------------------------------------------
create table if not exists public.product_sources (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id),
  org_id uuid not null references public.organisations (id),
  branch_id uuid references public.org_branches (id) on delete set null,
  draft_id uuid references public.partner_product_drafts (id),
  partner_sku text check (char_length(partner_sku) <= 60),
  cost_price_cents bigint check (cost_price_cents >= 0),
  commission_bps int check (commission_bps between 0 and 10000),
  markup_bps int check (markup_bps between 0 and 100000),
  settlement_timing text check (settlement_timing in ('after_delivery', 'upfront', 'credit')),
  credit_days int check (credit_days between 0 and 365),
  is_primary boolean not null default false,
  status text not null default 'active' check (status in ('active', 'paused', 'ended')),
  valid_until date,
  created_by text check (char_length(created_by) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, org_id)
);
create unique index if not exists product_sources_one_primary_key on public.product_sources (product_id) where is_primary;
create index if not exists product_sources_org_idx on public.product_sources (org_id);
create or replace trigger set_updated_at before update on public.product_sources for each row execute function public.set_updated_at();

-- Agreement terms used from S6-3 (stored only). Empty, no default.
alter table public.supply_agreements add column if not exists default_markup_bps int check (default_markup_bps between 0 and 100000);
alter table public.supply_agreements add column if not exists settlement_timing text check (settlement_timing in ('after_delivery', 'upfront', 'credit'));

-- ---------------------------------------------------------------------------
-- Access: row level security on, nothing granted to visitors or signed-in users. The server uses the service role.
-- ---------------------------------------------------------------------------
alter table public.partner_registrations enable row level security;
alter table public.partner_members enable row level security;
alter table public.partner_invitations enable row level security;
alter table public.partner_product_drafts enable row level security;
alter table public.product_sources enable row level security;
revoke all on table public.partner_registrations, public.partner_members, public.partner_invitations, public.partner_product_drafts, public.product_sources from public, anon, authenticated;

-- A signed-in partner member reads only their own partner's drafts (while the partner is approved): name, brand, status
-- and, once approved, the HagerLand product's name and status. Never prices, codes, customers or other partners.
-- Bypasses RLS on purpose (owned by postgres); read-only for signed-in users.
create or replace view public.partner_my_products with (security_barrier = true) as
select d.id, d.org_id, d.name, d.brand_name, d.category_id, d.unit, d.pack_size, d.status, d.status_changed_at, d.submitted_at, d.decided_at,
       d.created_at, d.updated_at,
       case when d.status = 'approved' then p.name end as product_name,
       case when d.status = 'approved' then p.status::text end as product_status
from public.partner_product_drafts d
left join public.products p on p.id = d.product_id
where exists (
  select 1 from public.partner_members m
  where m.org_id = d.org_id and m.user_id = (select auth.uid())
    and exists (select 1 from public.partner_registrations r where r.org_id = m.org_id and r.status = 'approved')
);
comment on view public.partner_my_products is
  'Bypasses RLS on purpose (owned by postgres): a signed-in partner member sees only their own approved partner''s drafts, without prices, codes or other partners.';
revoke all on public.partner_my_products from public, anon, authenticated;
grant select on public.partner_my_products to authenticated;

-- ---------------------------------------------------------------------------
-- One step on registration: private organisation + supply partner record + registration (all or nothing)
-- ---------------------------------------------------------------------------
create or replace function public.partner_register(
  p_source text, p_roles text[], p_business_name text, p_other_names text, p_tin text,
  p_city uuid, p_subcity uuid, p_woreda uuid, p_contact_name text, p_phone text, p_email text,
  p_category_ids uuid[], p_message text, p_consent_version text, p_actor text, p_ip_hash text
)
returns table (id uuid, reference text, org_id uuid)
language plpgsql
set search_path = ''
as $$
declare
  v_org uuid;
  v_reg public.partner_registrations;
begin
  if p_source not in ('public_form', 'staff') then
    raise exception 'Unknown registration source' using errcode = '22023';
  end if;
  insert into public.organisations (kind, name, slug, status, source, location_id, created_by)
  values (
    (case when p_roles = array['manufacturer']::text[] then 'manufacturer' else 'supplier' end)::public.org_kind,
    p_business_name,
    'partner-' || lower(public.gen_short_id()),
    'draft',
    case when p_source = 'staff' then 'admin' else 'self_signup' end,
    coalesce(p_woreda, p_subcity, p_city),
    null
  )
  returning organisations.id into v_org;

  insert into public.supply_partners (org_id, roles, relationship_status, status_changed_at, source, source_note, captured_at, captured_by)
  values (
    v_org,
    array(select distinct case r when 'supplier' then 'wholesaler' else r end from unnest(p_roles) as r order by 1),
    'interested', now(),
    case when p_source = 'staff' then 'other' else 'self_signup' end,
    case when p_source = 'staff' then 'Added by staff (partner registration)' else 'Partner registration form' end,
    now(), p_actor
  );

  insert into public.partner_registrations (roles, business_name, other_names, tin, city_location_id, subcity_location_id, woreda_location_id,
    contact_name, phone, email, category_ids, message, consent_at, consent_version, org_id, source, created_by, ip_hash)
  values (p_roles, p_business_name, p_other_names, p_tin, p_city, p_subcity, p_woreda, p_contact_name, p_phone, p_email,
    coalesce(p_category_ids, '{}'), p_message,
    case when p_consent_version is not null then now() end, p_consent_version, v_org, p_source, p_actor, p_ip_hash)
  returning * into v_reg;

  return query select v_reg.id, v_reg.reference, v_org;
end
$$;
revoke all on function public.partner_register(text, text[], text, text, text, uuid, uuid, uuid, text, text, text, uuid[], text, text, text, text) from public, anon, authenticated;
grant execute on function public.partner_register(text, text[], text, text, text, uuid, uuid, uuid, text, text, text, uuid[], text, text, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Safety rules (L20)
-- ---------------------------------------------------------------------------
-- Is this organisation a partner (registered, with partner members, or the source of a HagerLand product)?
create or replace function public.is_partner_org(p_org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.partner_registrations r where r.org_id = p_org)
      or exists (select 1 from public.partner_members m where m.org_id = p_org)
      or exists (select 1 from public.product_sources s where s.org_id = p_org)
$$;
revoke all on function public.is_partner_org(uuid) from public, anon, authenticated;
grant execute on function public.is_partner_org(uuid) to service_role;

-- (b) A partner organisation can never be published or sent for review, whatever path tries it.
create or replace function public.organisations_partner_publish_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('published', 'pending_review') and old.status is distinct from new.status and public.is_partner_org(new.id) then
    raise exception 'This business supplies HagerLand privately: it can never have a public page.' using errcode = '23514';
  end if;
  return new;
end
$$;
revoke all on function public.organisations_partner_publish_guard() from public, anon, authenticated;
create or replace trigger organisations_partner_publish_guard before update of status on public.organisations
  for each row execute function public.organisations_partner_publish_guard();

-- A partner organisation never gets business members (no /account/company, team, claims or self-listing).
create or replace function public.organisation_members_partner_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_partner_org(new.org_id) then
    raise exception 'This business supplies HagerLand privately: it has partner members only.' using errcode = '23514';
  end if;
  return new;
end
$$;
revoke all on function public.organisation_members_partner_guard() from public, anon, authenticated;
create or replace trigger organisation_members_partner_guard before insert or update of org_id on public.organisation_members
  for each row execute function public.organisation_members_partner_guard();

-- (c) A product with a partner source is sold by a HagerLand organisation, and a partner is never HagerLand itself.
create or replace function public.product_sources_seller_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.products p join public.organisations o on o.id = p.seller_org_id where p.id = new.product_id and o.is_hagerland) then
    raise exception 'A product supplied by a partner must be sold by HagerLand Supply.' using errcode = '23514';
  end if;
  if exists (select 1 from public.organisations o where o.id = new.org_id and o.is_hagerland) then
    raise exception 'A partner source cannot be a HagerLand organisation.' using errcode = '23514';
  end if;
  return new;
end
$$;
revoke all on function public.product_sources_seller_guard() from public, anon, authenticated;
create or replace trigger product_sources_seller_guard before insert or update of product_id, org_id on public.product_sources
  for each row execute function public.product_sources_seller_guard();

create or replace function public.products_partner_seller_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.seller_org_id is distinct from old.seller_org_id
     and exists (select 1 from public.product_sources s where s.product_id = new.id)
     and not exists (select 1 from public.organisations o where o.id = new.seller_org_id and o.is_hagerland) then
    raise exception 'A product supplied by a partner must be sold by HagerLand Supply.' using errcode = '23514';
  end if;
  return new;
end
$$;
revoke all on function public.products_partner_seller_guard() from public, anon, authenticated;
create or replace trigger products_partner_seller_guard before update of seller_org_id on public.products
  for each row execute function public.products_partner_seller_guard();

-- ---------------------------------------------------------------------------
-- Owner switches (never public: site_settings_public lists its keys). All off.
-- ---------------------------------------------------------------------------
insert into public.site_settings (key, value) values
  ('supply_partner_registration', 'false'::jsonb),
  ('supply_catalogue_ordering', 'false'::jsonb),
  ('supply_trade_pricing', 'false'::jsonb),
  ('home_business_row', 'false'::jsonb)
on conflict (key) do nothing;

insert into public.schema_migrations (version, name) values ('0048', 'partner_registration') on conflict (version) do nothing;

commit;
