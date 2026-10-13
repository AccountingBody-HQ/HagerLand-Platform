-- 0011 · Vertical registry, interest registrations, partner applications and a record of applied
-- migrations (spec 24.2, 24.12, 25.2n). Additive only: new tables, a new type, a new view.
-- Touches no existing table and no legacy data.

-- ---------------------------------------------------------------------------
-- Record of applied migrations (read by /api/health/full)
-- ---------------------------------------------------------------------------
create table public.schema_migrations (
  version text primary key check (version ~ '^[0-9]{4}$'),
  name text not null,
  applied_at timestamptz not null default now()
);
alter table public.schema_migrations enable row level security;
revoke all on table public.schema_migrations from public, anon, authenticated;

-- 0001–0010 were applied before this table existed: record each one only if its objects are present.
insert into public.schema_migrations (version, name)
select v, n from (values
  ('0001', 'extensions_enums', exists (select 1 from pg_type where typname = 'listing_status' and typnamespace = 'public'::regnamespace)),
  ('0002', 'core_tables', to_regclass('public.properties') is not null and to_regclass('public.errors') is not null),
  ('0003', 'rls_policies', exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'properties')),
  ('0004', 'public_views', to_regclass('public.properties_public') is not null),
  ('0005', 'search_functions', exists (select 1 from pg_proc where proname = 'search_all' and pronamespace = 'public'::regnamespace)),
  ('0006', 'storage_buckets_policies', exists (select 1 from storage.buckets where id = 'private-docs')),
  ('0007', 'seed_reference_data', exists (select 1 from public.locations where path = 'addis-ababa')),
  ('0008', 'account_helpers', exists (select 1 from pg_proc where proname = 'find_similar_organisations' and pronamespace = 'public'::regnamespace)),
  ('0009', 'counters', exists (select 1 from pg_proc where proname = 'increment_enquiries' and pronamespace = 'public'::regnamespace)),
  ('0010', 'public_settings', exists (select 1 from public.site_settings where key = 'legal_entity'))
) as m(v, n, present)
where present
on conflict (version) do nothing;

-- ---------------------------------------------------------------------------
-- Vertical registry (spec 24.2)
-- ---------------------------------------------------------------------------
create type public.vertical_status as enum ('live', 'coming_soon', 'hidden');

create table public.verticals (
  key text primary key check (key ~ '^[a-z]+(-[a-z]+)*$'),
  name text not null check (char_length(name) between 2 and 60),
  nav_label text not null check (char_length(nav_label) between 2 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  status public.vertical_status not null default 'coming_soon',
  sort int not null default 0,
  short_description text not null default '' check (char_length(short_description) <= 200),
  intro text not null default '' check (char_length(intro) <= 1200),
  icon text not null default 'circle',
  seo_title text check (char_length(seo_title) <= 70),
  seo_description text check (char_length(seo_description) <= 170),
  interest_enabled boolean not null default true,
  partner_signup_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.verticals enable row level security;
revoke all on table public.verticals from public, anon, authenticated;
create trigger set_updated_at before update on public.verticals for each row execute function public.set_updated_at();

insert into public.verticals (key, name, nav_label, slug, status, sort, icon, short_description, intro, interest_enabled, partner_signup_enabled) values
  ('property', 'Property', 'Property', 'property', 'live', 10, 'house',
   'Homes, land and commercial property for sale and to rent.',
   'Search homes, apartments, land and commercial property across Ethiopia, from owners, agents and developers. Every listing is reviewed before it goes live.', false, false),
  ('building-supplies', 'Building Supplies', 'Building Supplies', 'supplies', 'live', 20, 'truck',
   'Construction materials quoted fast and delivered to site.',
   'Cement, steel, roofing, plumbing, electrical, tiles and more. Send your list and get one clear quote.', false, false),
  ('professionals', 'Find Professionals', 'Professionals & Contractors', 'professionals', 'live', 30, 'ruler',
   'Architects, engineers, surveyors and property specialists.',
   'Find architects, engineers, quantity surveyors, valuers and other built-environment professionals, with portfolios and verification.', false, false),
  ('contractors', 'Construction & Contractors', 'Contractors', 'contractors', 'live', 40, 'hard-hat',
   'Builders, contractors and trades, with quotes on request.',
   'Describe your project and get quotes from contractors and tradespeople who do that work in your area.', false, false),
  ('repairs-maintenance', 'Repairs & Maintenance', 'Repairs & Maintenance', 'repairs-maintenance', 'live', 50, 'wrench',
   'Plumbing, electrical, roofing, cleaning and emergency repairs.',
   'Tell us what needs fixing and we will connect you with people who can do it, including emergency repairs.', false, false),
  ('finance', 'Finance', 'Finance', 'finance', 'coming_soon', 60, 'landmark',
   'Mortgages, construction finance and more, through licensed partners.',
   'We are preparing access to property and construction finance through approved, licensed partners.', true, true),
  ('insurance', 'Insurance', 'Insurance', 'insurance', 'coming_soon', 70, 'shield-check',
   'Home, building, landlord and construction insurance, through licensed partners.',
   'We are preparing access to property and construction insurance through approved, licensed partners.', true, true),
  ('diaspora', 'Diaspora Services', 'Diaspora Services', 'diaspora', 'live', 80, 'globe',
   'Buy, build and look after property in Ethiopia from wherever you live.',
   'Help for Ethiopians abroad: buying, building and managing property in Ethiopia, and finding trusted Ethiopian-run services where you live.', false, false),
  ('jobs', 'Jobs & Recruitment', 'Jobs & Recruitment', 'jobs', 'coming_soon', 90, 'briefcase',
   'Jobs in construction, engineering and property.',
   'A jobs board and recruitment service for construction, engineering, property and the trades.', true, false),
  ('our-developments', 'Our Developments', 'Our Developments', 'our-developments', 'coming_soon', 100, 'building-2',
   'Homes HagerLand intends to develop.',
   'HagerLand intends to develop carefully selected residential and, potentially, commercial projects.', true, false);

-- Public read: everything except hidden verticals, without internal columns.
create view public.verticals_public with (security_barrier = true) as
select v.key, v.name, v.nav_label, v.slug, v.status, v.sort, v.short_description, v.intro, v.icon,
       v.seo_title, v.seo_description, v.interest_enabled, v.partner_signup_enabled, v.updated_at
from public.verticals v
where v.status <> 'hidden';
comment on view public.verticals_public is
  'Bypasses RLS on purpose (owned by postgres): exposes only verticals that are not hidden, read-only.';
revoke all on public.verticals_public from public, anon, authenticated;
grant select on public.verticals_public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Interest registrations and partner applications (server inserts only)
-- ---------------------------------------------------------------------------
create table public.interest_registrations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.next_reference('HLI'),
  vertical_key text not null references public.verticals (key) on update cascade,
  category text check (char_length(category) <= 80),
  audience text check (char_length(audience) <= 40),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) <= 254),
  phone text check (char_length(phone) <= 32),
  country_code text not null default 'ET' check (country_code ~ '^[A-Z]{2}$'),
  city text check (char_length(city) <= 120),
  currency text not null default 'ETB' check (currency in ('ETB', 'GBP', 'USD', 'EUR', 'CAD', 'AED', 'SEK', 'NOK', 'SAR', 'ILS', 'ZAR', 'KES')),
  message text check (char_length(message) <= 2000),
  marketing_consent boolean not null default false,
  consent_at timestamptz,
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  admin_notes text check (char_length(admin_notes) <= 4000),
  user_id uuid references auth.users (id) on delete set null,
  source_url text check (char_length(source_url) <= 500),
  utm jsonb,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index interest_registrations_vertical_idx on public.interest_registrations (vertical_key, created_at desc);
create index interest_registrations_created_idx on public.interest_registrations (created_at);
create trigger set_updated_at before update on public.interest_registrations for each row execute function public.set_updated_at();

create table public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.next_reference('HLP'),
  vertical_key text not null references public.verticals (key) on update cascade,
  partner_type text not null check (partner_type in ('bank', 'lender', 'insurer', 'broker', 'microfinance', 'recruiter', 'other')),
  organisation_name text not null check (char_length(organisation_name) between 2 and 160),
  contact_name text not null check (char_length(contact_name) between 2 and 120),
  email text not null check (char_length(email) <= 254),
  phone text check (char_length(phone) <= 32),
  country_code text not null default 'ET' check (country_code ~ '^[A-Z]{2}$'),
  website text check (website ~* '^https?://' and char_length(website) <= 300),
  licence_details text check (char_length(licence_details) <= 500),
  message text check (char_length(message) <= 2000),
  status text not null default 'new' check (status in ('new', 'reviewing', 'approved', 'declined')),
  admin_notes text check (char_length(admin_notes) <= 4000),
  source_url text check (char_length(source_url) <= 500),
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index partner_applications_status_idx on public.partner_applications (status, created_at desc);
create trigger set_updated_at before update on public.partner_applications for each row execute function public.set_updated_at();

-- Service role only: no anon or signed-in access at all.
alter table public.interest_registrations enable row level security;
alter table public.partner_applications enable row level security;
revoke all on table public.interest_registrations, public.partner_applications from public, anon, authenticated;

insert into public.schema_migrations (version, name) values ('0011', 'vertical_registry') on conflict (version) do nothing;
