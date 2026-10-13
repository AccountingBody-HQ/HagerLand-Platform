-- 0002 · Core tables, indexes and triggers for the relaunch (spec 6.3, 6.7).
-- Additive only. The single change to an existing table is a new nullable-with-default
-- column on import_log (entity_type), as the spec requires.

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.locations (id) on delete restrict,
  level public.location_level not null,
  name text not null check (char_length(name) between 1 and 120),
  name_am text,
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  path text not null unique,
  display_name text not null default '',
  lat numeric(9, 6),
  lng numeric(9, 6),
  is_active boolean not null default true,
  sort int not null default 0,
  seo_intro_sale text,
  seo_intro_rent text,
  seo_intro_professionals text,
  search_tsv tsvector generated always as (
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(name, ''))), 'A') ||
    setweight(to_tsvector('simple', coalesce(name_am, '')), 'A') ||
    setweight(to_tsvector('simple', replace(replace(path, '-', ' '), '/', ' ')), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (parent_id, slug)
);
create unique index locations_root_slug_key on public.locations (slug) where parent_id is null;
create index locations_parent_idx on public.locations (parent_id);
create index locations_search_idx on public.locations using gin (search_tsv);
create index locations_name_trgm_idx on public.locations using gin (name extensions.gin_trgm_ops);

-- Path and display name ("CMC, Bole, Addis Ababa") are derived from the parent chain.
create function public.locations_derive_names()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_path text;
  parent_display text;
begin
  if new.parent_id is null then
    new.path := new.slug;
    new.display_name := new.name;
  else
    select path, display_name into parent_path, parent_display from public.locations where id = new.parent_id;
    new.path := parent_path || '/' || new.slug;
    new.display_name := case
      when split_part(parent_display, ', ', 1) = new.name then parent_display
      else new.name || ', ' || parent_display
    end;
  end if;
  return new;
end
$$;
create trigger locations_derive_names before insert or update of name, slug, parent_id on public.locations
  for each row execute function public.locations_derive_names();

create function public.locations_cascade_names()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.path is distinct from old.path or new.display_name is distinct from old.display_name then
    update public.locations set name = name where parent_id = new.id;
  end if;
  return null;
end
$$;
create trigger locations_cascade_names after update on public.locations
  for each row execute function public.locations_cascade_names();

-- All locations at or below the given one (used by every search with a location filter).
create function public.locations_descendants(root uuid)
returns setof uuid
language sql stable
set search_path = ''
as $$
  with recursive tree as (
    select id from public.locations where id = root
    union all
    select l.id from public.locations l join tree t on l.parent_id = t.id
  )
  select id from tree
$$;

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.service_categories (id) on delete restrict,
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  icon text,
  sort int not null default 0,
  is_active boolean not null default true,
  seo_title text,
  seo_intro text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index service_categories_parent_idx on public.service_categories (parent_id);

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.product_categories (id) on delete restrict,
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and slug not in ('product', 'quote', 'materials-list', 'special-buys')),
  description text,
  icon text,
  image_path text,
  sort int not null default 0,
  is_active boolean not null default true,
  seo_title text,
  seo_intro text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_categories_parent_idx on public.product_categories (parent_id);

create function public.category_descendants(tbl text, root uuid)
returns setof uuid
language plpgsql stable
set search_path = ''
as $$
begin
  if tbl not in ('service_categories', 'product_categories') then
    raise exception 'Unknown category table %', tbl;
  end if;
  return query execute format(
    'with recursive tree as (
       select id from public.%1$I where id = $1
       union all
       select c.id from public.%1$I c join tree t on c.parent_id = t.id
     ) select id from tree', tbl) using root;
end
$$;

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_path text,
  country_of_origin text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- People and organisations
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text check (char_length(full_name) <= 120),
  phone text check (char_length(phone) <= 32),
  phone_verified boolean not null default false,
  account_type public.account_type not null default 'personal',
  avatar_path text,
  preferred_contact text check (preferred_contact in ('phone', 'whatsapp', 'telegram', 'email')),
  marketing_opt_in boolean not null default false,
  is_suspended boolean not null default false,
  deletion_requested_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.create_profile_on_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, full_name, phone, account_type)
  values (
    new.id,
    nullif(left(coalesce(meta ->> 'full_name', meta ->> 'name', ''), 120), ''),
    nullif(left(coalesce(meta ->> 'phone', ''), 32), ''),
    case when meta ->> 'account_type' = 'business' then 'business'::public.account_type else 'personal'::public.account_type end
  )
  on conflict (id) do nothing;
  return new;
end
$$;
create trigger on_auth_user_created_hagerland after insert on auth.users
  for each row execute function public.create_profile_on_signup();

-- Suspended users and anonymous visitors cannot write anything.
create function public.is_active_user()
returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and not p.is_suspended)
$$;

create table public.organisations (
  id uuid primary key default gen_random_uuid(),
  kind public.org_kind not null,
  name text not null check (char_length(name) between 2 and 160),
  slug text not null unique,
  short_id text not null unique default public.gen_short_id(),
  tagline text check (char_length(tagline) <= 160),
  description text check (char_length(description) <= 5000),
  logo_path text,
  cover_path text,
  phone text,
  whatsapp text,
  telegram text,
  email text,
  website text check (website ~* '^https?://'),
  address_line text,
  location_id uuid references public.locations (id),
  lat numeric(9, 6),
  lng numeric(9, 6),
  areas_served uuid[] not null default '{}',
  year_established int check (year_established between 1900 and 2100),
  team_size text,
  trade_licence_number text,
  tin text,
  licence_category text,
  licence_grade text,
  verification_level public.verification_level not null default 'listed',
  verified_at timestamptz,
  is_hagerland boolean not null default false,
  status public.listing_status not null default 'pending_review',
  rejection_reason text,
  published_at timestamptz,
  is_featured boolean not null default false,
  featured_until timestamptz,
  plan text not null default 'free',
  google_place_id text unique,
  source text not null default 'self_signup' check (source in ('self_signup', 'import', 'admin')),
  claimed_at timestamptz,
  social jsonb not null default '{}',
  opening_hours jsonb,
  pending_changes jsonb,
  views_count int not null default 0,
  enquiries_count int not null default 0,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  search_tsv tsvector generated always as (
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(name, ''))), 'A') ||
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(tagline, ''))), 'B') ||
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(description, ''))), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index organisations_kind_idx on public.organisations (kind);
create index organisations_status_idx on public.organisations (status);
create index organisations_location_idx on public.organisations (location_id);
create index organisations_areas_idx on public.organisations using gin (areas_served);
create index organisations_search_idx on public.organisations using gin (search_tsv);
create index organisations_name_trgm_idx on public.organisations using gin (name extensions.gin_trgm_ops);

create table public.organisation_members (
  org_id uuid not null references public.organisations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.org_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index organisation_members_user_idx on public.organisation_members (user_id);

-- Membership check used by RLS policies (SECURITY DEFINER avoids policy recursion).
create function public.is_org_member(org uuid, roles public.org_role[] default null)
returns boolean
language sql stable
security definer
set search_path = ''
as $$
  select org is not null and exists (
    select 1 from public.organisation_members m
    where m.org_id = org and m.user_id = auth.uid() and (roles is null or m.role = any (roles))
  )
$$;

create function public.add_owner_on_org_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and exists (select 1 from auth.users where id = auth.uid()) then
    insert into public.organisation_members (org_id, user_id, role)
    values (new.id, auth.uid(), 'owner')
    on conflict do nothing;
  end if;
  return null;
end
$$;
create trigger add_owner_on_org_insert after insert on public.organisations
  for each row execute function public.add_owner_on_org_insert();

create table public.organisation_services (
  org_id uuid not null references public.organisations (id) on delete cascade,
  service_id uuid not null references public.service_categories (id) on delete cascade,
  primary key (org_id, service_id)
);
create index organisation_services_service_idx on public.organisation_services (service_id);

create table public.org_product_categories (
  org_id uuid not null references public.organisations (id) on delete cascade,
  product_category_id uuid not null references public.product_categories (id) on delete cascade,
  primary key (org_id, product_category_id)
);
create index org_product_categories_category_idx on public.org_product_categories (product_category_id);

-- ---------------------------------------------------------------------------
-- Developments, portfolio, properties
-- ---------------------------------------------------------------------------

create table public.developments (
  id uuid primary key default gen_random_uuid(),
  kind public.development_kind not null default 'development',
  name text not null check (char_length(name) between 2 and 160),
  slug text not null unique,
  short_id text not null unique default public.gen_short_id(),
  developer_org_id uuid references public.organisations (id) on delete set null,
  is_hagerland boolean not null default false,
  summary text check (char_length(summary) <= 300),
  description text check (char_length(description) <= 8000),
  location_id uuid references public.locations (id),
  address_line text,
  lat numeric(9, 6),
  lng numeric(9, 6),
  completion_status public.completion_status,
  expected_completion date,
  completed_year int check (completed_year between 1900 and 2100),
  total_units int check (total_units >= 0),
  floors_label text,
  unit_types jsonb not null default '[]',
  price_from_etb bigint check (price_from_etb >= 0),
  price_to_etb bigint check (price_to_etb >= 0),
  payment_plan text,
  amenities text[] not null default '{}',
  finishing_status public.finishing_status,
  tenure public.tenure,
  brochure_path text,
  video_url text check (video_url ~* '^https://(www\.)?(youtube\.com|youtu\.be)/'),
  status public.listing_status not null default 'draft',
  rejection_reason text,
  published_at timestamptz,
  is_featured boolean not null default false,
  featured_until timestamptz,
  register_interest_enabled boolean not null default true,
  pending_changes jsonb,
  views_count int not null default 0,
  enquiries_count int not null default 0,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  search_tsv tsvector generated always as (
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(name, ''))), 'A') ||
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(summary, '') || ' ' || coalesce(floors_label, ''))), 'B') ||
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(description, ''))), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index developments_status_idx on public.developments (status);
create index developments_location_idx on public.developments (location_id);
create index developments_developer_idx on public.developments (developer_org_id);
create index developments_search_idx on public.developments using gin (search_tsv);
create index developments_name_trgm_idx on public.developments using gin (name extensions.gin_trgm_ops);

create table public.portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 160),
  description text check (char_length(description) <= 4000),
  location_id uuid references public.locations (id),
  year int check (year between 1900 and 2100),
  project_value_band text,
  development_id uuid references public.developments (id) on delete set null,
  cover_path text,
  status public.listing_status not null default 'pending_review',
  rejection_reason text,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index portfolio_projects_org_idx on public.portfolio_projects (org_id);

create function public.property_type_words(t public.property_type)
returns text
language sql immutable parallel safe
set search_path = ''
as $$
  select case t
    when 'apartment' then 'apartment apartments flat flats'
    when 'condominium' then 'condominium condominiums condo condos'
    when 'house' then 'house houses home homes'
    when 'villa' then 'villa villas'
    when 'townhouse' then 'townhouse townhouses'
    when 'g_plus_building' then 'building buildings g+ g-plus'
    when 'room' then 'room rooms'
    when 'studio' then 'studio studios'
    when 'land' then 'land plot plots'
    when 'commercial_building' then 'commercial building buildings'
    when 'office' then 'office offices'
    when 'shop' then 'shop shops retail'
    when 'warehouse' then 'warehouse warehouses'
    when 'hotel' then 'hotel hotels'
    when 'mixed_use' then 'mixed use'
    else ''
  end
$$;

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  short_id text not null unique default public.gen_short_id(),
  slug text not null unique,
  purpose public.listing_purpose not null,
  property_type public.property_type not null,
  title text not null check (char_length(title) between 5 and 120),
  description text not null default '' check (char_length(description) <= 6000),
  price_etb bigint check (price_etb >= 0),
  price_period text check (price_period in ('month')),
  price_negotiable boolean not null default false,
  price_on_request boolean not null default false,
  advance_months int check (advance_months between 0 and 24),
  service_charge_etb bigint check (service_charge_etb >= 0),
  bedrooms smallint check (bedrooms between 0 and 50),
  bathrooms smallint check (bathrooms between 0 and 50),
  area_m2 numeric(10, 2) check (area_m2 > 0),
  plot_area_m2 numeric(10, 2) check (plot_area_m2 > 0),
  floors_label text check (char_length(floors_label) <= 20),
  floor_number smallint,
  year_built smallint check (year_built between 1900 and 2100),
  finishing_status public.finishing_status,
  furnishing public.furnishing,
  tenure public.tenure,
  has_title_deed boolean,
  completion_status public.completion_status,
  parking_spaces smallint check (parking_spaces between 0 and 500),
  features text[] not null default '{}',
  location_id uuid not null references public.locations (id),
  address_line text check (char_length(address_line) <= 200),
  lat numeric(9, 6),
  lng numeric(9, 6),
  show_exact_location boolean not null default false,
  development_id uuid references public.developments (id) on delete set null,
  lister_type text not null default 'owner' check (lister_type in ('owner', 'agent', 'developer', 'hagerland')),
  lister_user_id uuid references public.profiles (id) on delete set null,
  lister_org_id uuid references public.organisations (id) on delete set null,
  contact_phone text,
  contact_whatsapp text,
  contact_telegram text,
  contact_email text,
  preferred_contact text check (preferred_contact in ('phone', 'whatsapp', 'telegram', 'email')),
  video_url text check (video_url ~* '^https://(www\.)?(youtube\.com|youtu\.be)/'),
  virtual_tour_url text check (virtual_tour_url ~* '^https://'),
  status public.listing_status not null default 'draft',
  rejection_reason text,
  published_at timestamptz,
  expires_at timestamptz,
  expiry_reminder_sent_at timestamptz,
  renewed_at timestamptz,
  is_featured boolean not null default false,
  featured_until timestamptz,
  is_hagerland boolean not null default false,
  views_count int not null default 0,
  enquiries_count int not null default 0,
  pending_changes jsonb,
  search_tsv tsvector generated always as (
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(title, ''))), 'A') ||
    setweight(to_tsvector('simple', public.property_type_words(property_type) || ' ' || coalesce(floors_label, '')), 'B') ||
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(description, ''))), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint properties_rent_period check (purpose <> 'rent' or price_etb is null or price_period = 'month'),
  constraint properties_sale_period check (purpose <> 'sale' or price_period is null)
);
create index properties_status_purpose_type_idx on public.properties (status, purpose, property_type);
create index properties_location_idx on public.properties (location_id);
create index properties_price_idx on public.properties (price_etb);
create index properties_bedrooms_idx on public.properties (bedrooms);
create index properties_published_idx on public.properties (published_at desc);
create index properties_expires_idx on public.properties (expires_at) where status = 'published';
create index properties_lister_user_idx on public.properties (lister_user_id);
create index properties_lister_org_idx on public.properties (lister_org_id);
create index properties_development_idx on public.properties (development_id);
create index properties_search_idx on public.properties using gin (search_tsv);
create index properties_features_idx on public.properties using gin (features);
create index properties_title_trgm_idx on public.properties using gin (title extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Supplies
-- ---------------------------------------------------------------------------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  short_id text not null unique default public.gen_short_id(),
  slug text not null unique,
  name text not null check (char_length(name) between 2 and 160),
  category_id uuid not null references public.product_categories (id),
  brand_id uuid references public.brands (id) on delete set null,
  seller_org_id uuid not null references public.organisations (id),
  sku text,
  model_number text,
  summary text check (char_length(summary) <= 300),
  description text check (char_length(description) <= 8000),
  specs jsonb not null default '[]',
  unit text not null default 'piece' check (unit in ('piece', 'box', 'metre', 'roll', 'sheet', 'bag', 'quintal', 'tonne', 'm2', 'm3', 'litre', 'kg', 'set', 'pair')),
  pack_size text,
  min_order_qty numeric(12, 2) not null default 1 check (min_order_qty > 0),
  price_type public.price_type not null default 'on_request',
  price_etb_cents bigint check (price_etb_cents >= 0),
  price_updated_at timestamptz,
  trade_price_etb_cents bigint check (trade_price_etb_cents >= 0),
  stock_status public.stock_status not null default 'available_on_request',
  lead_time_days int check (lead_time_days >= 0),
  country_of_origin text,
  warranty text,
  is_special_buy boolean not null default false,
  special_was_price_etb_cents bigint,
  special_qty_available int,
  special_ends_at timestamptz,
  delivery_available boolean not null default true,
  status public.listing_status not null default 'draft',
  rejection_reason text,
  published_at timestamptz,
  is_featured boolean not null default false,
  featured_until timestamptz,
  pending_changes jsonb,
  views_count int not null default 0,
  search_tsv tsvector generated always as (
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(name, ''))), 'A') ||
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(sku, '') || ' ' || coalesce(model_number, '') || ' ' || coalesce(summary, ''))), 'B') ||
    setweight(to_tsvector('simple', public.f_unaccent(coalesce(description, ''))), 'C')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_price_present check (price_type = 'on_request' or price_etb_cents is not null)
);
create index products_category_idx on public.products (category_id);
create index products_seller_idx on public.products (seller_org_id);
create index products_status_idx on public.products (status);
create index products_search_idx on public.products using gin (search_tsv);
create index products_name_trgm_idx on public.products using gin (name extensions.gin_trgm_ops);
create unique index products_seller_sku_key on public.products (seller_org_id, sku) where sku is not null;

create function public.products_touch_price()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.price_etb_cents is distinct from old.price_etb_cents or new.price_type is distinct from old.price_type then
    new.price_updated_at := now();
  end if;
  return new;
end
$$;
create trigger products_touch_price before insert or update on public.products
  for each row execute function public.products_touch_price();

-- ---------------------------------------------------------------------------
-- Media (images and documents for any entity)
-- ---------------------------------------------------------------------------

create table public.media (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('property', 'development', 'organisation', 'portfolio', 'product')),
  entity_id uuid not null,
  kind text not null default 'image' check (kind in ('image', 'floorplan', 'document', 'logo', 'cover')),
  storage_path text not null,
  thumb_path text,
  width int,
  height int,
  bytes int,
  alt text check (char_length(alt) <= 200),
  sort int not null default 0,
  is_cover boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index media_entity_idx on public.media (entity_type, entity_id, sort);

-- ---------------------------------------------------------------------------
-- Leads: quotes, enquiries, contact reveals
-- ---------------------------------------------------------------------------

create table public.reference_counters (
  prefix text not null,
  year int not null,
  value int not null default 0,
  primary key (prefix, year)
);

-- Human-friendly references such as HLE-2026-000001 and HLQ-2026-000001.
create function public.next_reference(p_prefix text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  y int := extract(year from now())::int;
  n int;
begin
  if p_prefix !~ '^[A-Z]{2,5}$' then
    raise exception 'Invalid reference prefix';
  end if;
  insert into public.reference_counters as rc (prefix, year, value) values (p_prefix, y, 1)
  on conflict (prefix, year) do update set value = rc.value + 1
  returning rc.value into n;
  return format('%s-%s-%s', p_prefix, y, lpad(n::text, 6, '0'));
end
$$;

create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.next_reference('HLQ'),
  requester_user_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  phone text not null check (char_length(phone) <= 32),
  email text check (char_length(email) <= 254),
  company_name text check (char_length(company_name) <= 160),
  delivery_location_id uuid references public.locations (id),
  delivery_address text check (char_length(delivery_address) <= 300),
  needed_by date,
  notes text check (char_length(notes) <= 4000),
  materials_file_path text,
  materials_file_paths text[] not null default '{}',
  status public.quote_status not null default 'submitted',
  assigned_to text,
  quoted_total_etb_cents bigint,
  quote_document_path text,
  quoted_at timestamptz,
  internal_notes text,
  source text not null default 'basket' check (source in ('basket', 'materials_list', 'product_page')),
  utm jsonb,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index quote_requests_status_idx on public.quote_requests (status, created_at desc);
create index quote_requests_requester_idx on public.quote_requests (requester_user_id);

create table public.quote_request_items (
  id uuid primary key default gen_random_uuid(),
  quote_request_id uuid not null references public.quote_requests (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  free_text_item text check (char_length(free_text_item) <= 300),
  quantity numeric(12, 2) not null check (quantity > 0),
  unit text not null,
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  constraint quote_items_has_item check (product_id is not null or free_text_item is not null)
);
create index quote_request_items_quote_idx on public.quote_request_items (quote_request_id);

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.next_reference('HLE'),
  target_type text not null check (target_type in ('property', 'development', 'organisation', 'product', 'hagerland_development', 'general')),
  target_id uuid,
  recipient_org_id uuid references public.organisations (id) on delete set null,
  recipient_user_id uuid references auth.users (id) on delete set null,
  sender_user_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  phone text not null check (char_length(phone) <= 32),
  email text check (char_length(email) <= 254),
  message text not null check (char_length(message) between 1 and 2000),
  preferred_contact text check (preferred_contact in ('phone', 'whatsapp', 'telegram', 'email')),
  intent text not null default 'more_info' check (intent in ('viewing', 'more_info', 'price', 'offer', 'register_interest', 'quote', 'other')),
  details jsonb,
  status public.enquiry_status not null default 'new',
  recipient_notes text check (char_length(recipient_notes) <= 4000),
  first_viewed_at timestamptz,
  source_url text,
  utm jsonb,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index enquiries_recipient_org_idx on public.enquiries (recipient_org_id, created_at desc);
create index enquiries_recipient_user_idx on public.enquiries (recipient_user_id, created_at desc);
create index enquiries_sender_idx on public.enquiries (sender_user_id);
create index enquiries_target_idx on public.enquiries (target_type, target_id);
create index enquiries_created_idx on public.enquiries (created_at desc);

create table public.contact_reveals (
  id uuid primary key default gen_random_uuid(),
  target_type text not null,
  target_id uuid not null,
  channel text not null check (channel in ('phone', 'whatsapp', 'telegram', 'email')),
  viewer_user_id uuid references auth.users (id) on delete set null,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index contact_reveals_target_idx on public.contact_reveals (target_type, target_id, created_at desc);
create index contact_reveals_created_idx on public.contact_reveals (created_at);

-- ---------------------------------------------------------------------------
-- Claims, verification, reports, admin
-- ---------------------------------------------------------------------------

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  claimant_name text not null check (char_length(claimant_name) between 2 and 120),
  claimant_phone text not null check (char_length(claimant_phone) <= 32),
  claimant_email text check (char_length(claimant_email) <= 254),
  relationship text not null check (relationship in ('owner', 'manager', 'employee')),
  message text check (char_length(message) <= 2000),
  evidence_paths text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index claims_one_pending_key on public.claims (org_id, user_id) where status = 'pending';

create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organisations (id) on delete cascade,
  submitted_by uuid not null references auth.users (id) on delete cascade,
  documents jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_notes text,
  decided_at timestamptz,
  documents_purged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index verification_one_pending_key on public.verification_requests (org_id) where status = 'pending';

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('property', 'development', 'organisation', 'product')),
  entity_id uuid not null,
  reason text not null check (reason in ('fraud', 'wrong_info', 'duplicate', 'offensive', 'already_sold', 'other')),
  details text check (char_length(details) <= 2000),
  reporter_contact text check (char_length(reporter_contact) <= 254),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index reports_status_idx on public.reports (status, created_at desc);

create table public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  note text not null check (char_length(note) <= 4000),
  created_at timestamptz not null default now()
);
create index admin_notes_entity_idx on public.admin_notes (entity_type, entity_id);

create table public.search_misses (
  q_normalised text not null,
  vertical text not null,
  count int not null default 1,
  last_seen_at timestamptz not null default now(),
  primary key (q_normalised, vertical)
);

create function public.record_search_miss(q text, vertical text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.search_misses (q_normalised, vertical)
  values (left(lower(regexp_replace(trim(q), '\s+', ' ', 'g')), 120), left(vertical, 30))
  on conflict (q_normalised, vertical) do update
    set count = public.search_misses.count + 1, last_seen_at = now()
$$;

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('property', 'development', 'organisation', 'product')),
  entity_id uuid not null,
  kind text not null default 'featured' check (kind in ('featured', 'spotlight', 'top_of_search', 'homepage')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  price_etb_cents bigint,
  paid boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint promotions_dates check (ends_at > starts_at)
);
create index promotions_entity_idx on public.promotions (entity_type, entity_id);
create index promotions_active_idx on public.promotions (ends_at);

create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create function public.setting_int(setting_key text, fallback int)
returns int
language sql stable
security definer
set search_path = ''
as $$
  select coalesce((select (value #>> '{}')::int from public.site_settings where key = setting_key), fallback)
$$;

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  entity_type text,
  entity_id uuid,
  entity_label text,
  diff jsonb,
  ip_hash text,
  created_at timestamptz not null default now()
);
create index audit_log_created_idx on public.audit_log (created_at desc);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);

create table public.errors (
  id uuid primary key default gen_random_uuid(),
  route text not null,
  message text not null,
  count int not null default 1,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (route, message)
);

-- Existing import log: new rows record the entity type they created (spec 6.3).
alter table if exists public.import_log add column if not exists entity_type text default 'organisation';

-- ---------------------------------------------------------------------------
-- Workflow triggers
-- ---------------------------------------------------------------------------

-- Publishing stamps published_at and (for properties) the expiry date.
create function public.set_published_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    if new.published_at is null then
      new.published_at := now();
    end if;
    if tg_table_name = 'properties' then
      if new.expires_at is null or new.expires_at <= now() then
        new.expires_at := now() + make_interval(days => public.setting_int('listing_expiry_days', 60));
        new.expiry_reminder_sent_at := null;
      end if;
    end if;
  end if;
  return new;
end
$$;

-- Featured flags mirror active promotions (spec 6.3 promotions).
create function public.refresh_featured(p_entity_type text, p_entity_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  tbl text := case p_entity_type
    when 'property' then 'properties'
    when 'development' then 'developments'
    when 'organisation' then 'organisations'
    when 'product' then 'products'
  end;
  until_at timestamptz;
begin
  if tbl is null then
    return;
  end if;
  select max(ends_at) into until_at
  from public.promotions
  where entity_type = p_entity_type and entity_id = p_entity_id and starts_at <= now() and ends_at > now();
  execute format('update public.%I set is_featured = $1, featured_until = $2 where id = $3 and (is_featured, featured_until) is distinct from ($1, $2)', tbl)
    using until_at is not null, until_at, p_entity_id;
end
$$;

create function public.sync_featured_from_promotions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    perform public.refresh_featured(old.entity_type, old.entity_id);
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    perform public.refresh_featured(new.entity_type, new.entity_id);
  end if;
  return null;
end
$$;
create trigger sync_featured_from_promotions after insert or update or delete on public.promotions
  for each row execute function public.sync_featured_from_promotions();

-- Daily job: re-sync featured flags for promotions that started or ended.
create function public.refresh_all_featured()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  n int := 0;
begin
  for r in
    select distinct entity_type, entity_id from public.promotions
    where ends_at > now() - interval '2 days' or starts_at > now() - interval '2 days'
  loop
    perform public.refresh_featured(r.entity_type, r.entity_id);
    n := n + 1;
  end loop;
  return n;
end
$$;

-- Counts a page view (called from the server with simple per-session de-duplication).
create function public.increment_view(p_entity_type text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  case p_entity_type
    when 'property' then update public.properties set views_count = views_count + 1 where id = p_id and status = 'published';
    when 'development' then update public.developments set views_count = views_count + 1 where id = p_id and status = 'published';
    when 'product' then update public.products set views_count = views_count + 1 where id = p_id and status = 'published';
    when 'organisation' then update public.organisations set views_count = views_count + 1 where id = p_id and status = 'published';
    else null;
  end case;
end
$$;

-- updated_at triggers
do $$
declare
  t text;
begin
  foreach t in array array[
    'locations', 'service_categories', 'product_categories', 'brands', 'profiles', 'organisations',
    'developments', 'portfolio_projects', 'properties', 'products', 'media', 'quote_requests',
    'enquiries', 'claims', 'verification_requests', 'reports', 'promotions', 'site_settings'
  ] loop
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end
$$;

create trigger set_published_fields before insert or update on public.properties
  for each row execute function public.set_published_fields();
create trigger set_published_fields before insert or update on public.developments
  for each row execute function public.set_published_fields();
create trigger set_published_fields before insert or update on public.organisations
  for each row execute function public.set_published_fields();
create trigger set_published_fields before insert or update on public.products
  for each row execute function public.set_published_fields();

-- Moderation-protected columns (spec 6.1). Only HagerLand (service role) may change these.
create trigger protect_privileged_columns before insert or update on public.properties
  for each row execute function public.protect_privileged_columns(
    '["is_featured","featured_until","is_hagerland","published_at","expires_at","expiry_reminder_sent_at","renewed_at","rejection_reason","views_count","enquiries_count","lister_user_id","short_id"]',
    '{"is_featured":false,"featured_until":null,"is_hagerland":false,"published_at":null,"expires_at":null,"expiry_reminder_sent_at":null,"renewed_at":null,"rejection_reason":null,"views_count":0,"enquiries_count":0,"pending_changes":null}',
    'status');
create trigger protect_privileged_columns before insert or update on public.developments
  for each row execute function public.protect_privileged_columns(
    '["is_featured","featured_until","is_hagerland","published_at","rejection_reason","views_count","enquiries_count","short_id"]',
    '{"is_featured":false,"featured_until":null,"is_hagerland":false,"published_at":null,"rejection_reason":null,"views_count":0,"enquiries_count":0,"pending_changes":null}',
    'status');
create trigger protect_privileged_columns before insert or update on public.organisations
  for each row execute function public.protect_privileged_columns(
    '["kind","verification_level","verified_at","is_hagerland","is_featured","featured_until","plan","published_at","rejection_reason","google_place_id","source","claimed_at","views_count","enquiries_count","created_by","short_id"]',
    '{"status":"pending_review","verification_level":"listed","verified_at":null,"is_hagerland":false,"is_featured":false,"featured_until":null,"plan":"free","published_at":null,"rejection_reason":null,"google_place_id":null,"source":"self_signup","claimed_at":null,"views_count":0,"enquiries_count":0,"pending_changes":null}',
    'status');
create trigger protect_privileged_columns before insert or update on public.products
  for each row execute function public.protect_privileged_columns(
    '["is_featured","featured_until","published_at","rejection_reason","views_count","price_updated_at","short_id","seller_org_id"]',
    '{"is_featured":false,"featured_until":null,"published_at":null,"rejection_reason":null,"views_count":0,"pending_changes":null}',
    'status');
create trigger protect_privileged_columns before insert or update on public.portfolio_projects
  for each row execute function public.protect_privileged_columns(
    '["rejection_reason","org_id"]',
    '{"rejection_reason":null}',
    'status');
create trigger protect_privileged_columns before insert or update on public.profiles
  for each row execute function public.protect_privileged_columns(
    '["id","is_suspended","phone_verified","account_type"]',
    '{"is_suspended":false,"phone_verified":false}',
    '');
create trigger protect_privileged_columns before insert or update on public.enquiries
  for each row execute function public.protect_privileged_columns(
    '["reference","target_type","target_id","recipient_org_id","recipient_user_id","sender_user_id","name","phone","email","message","preferred_contact","intent","details","source_url","utm","ip_hash","user_agent","created_at"]',
    '{}',
    '');
