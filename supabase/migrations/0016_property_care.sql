-- 0016 · HagerLand Property Care (spec 24.6): consultation pipeline and the records for managed properties
-- (inspections with photos and notes, rent statements, maintenance log). The owner-facing portal is Phase 2,
-- so every table here is for HagerLand staff only. Additive only.

create table public.property_care_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.next_reference('HLC'),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) <= 254),
  phone text not null check (char_length(phone) <= 32),
  country_code text not null check (country_code ~ '^[A-Z]{2}$'),
  city text check (char_length(city) <= 120),
  time_zone text check (char_length(time_zone) <= 60),
  contact_time text check (char_length(contact_time) <= 120),
  preferred_contact text check (preferred_contact in ('phone', 'whatsapp', 'telegram', 'email')),
  property_location_id uuid references public.locations (id),
  property_location_text text check (char_length(property_location_text) <= 200),
  property_type text not null check (property_type in ('house', 'apartment', 'villa', 'g_plus_building', 'land', 'commercial', 'other')),
  occupancy text not null check (occupancy in ('family', 'tenanted', 'vacant', 'under_construction', 'other')),
  services text[] not null default '{}' check (services <@ array['management', 'maintenance', 'security', 'inspections', 'tenants', 'rent_collection', 'maintenance_coordination', 'representation', 'managed_sale']::text[]),
  message text check (char_length(message) <= 2000),
  status text not null default 'new' check (status in ('new', 'contacted', 'consultation_booked', 'proposal_sent', 'won', 'lost')),
  admin_notes text check (char_length(admin_notes) <= 4000),
  marketing_consent boolean not null default false,
  consent_at timestamptz,
  user_id uuid references auth.users (id) on delete set null,
  source_url text check (char_length(source_url) <= 500),
  utm jsonb,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index property_care_requests_status_idx on public.property_care_requests (status, created_at desc);
create trigger set_updated_at before update on public.property_care_requests for each row execute function public.set_updated_at();

create table public.managed_properties (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.next_reference('HLM'),
  care_request_id uuid references public.property_care_requests (id) on delete set null,
  owner_user_id uuid references auth.users (id) on delete set null,
  owner_name text not null check (char_length(owner_name) between 2 and 120),
  owner_email text check (char_length(owner_email) <= 254),
  owner_phone text check (char_length(owner_phone) <= 32),
  owner_country_code text check (owner_country_code ~ '^[A-Z]{2}$'),
  title text not null check (char_length(title) between 2 and 160),
  location_id uuid references public.locations (id),
  address_line text check (char_length(address_line) <= 300),
  property_type text check (property_type in ('house', 'apartment', 'villa', 'g_plus_building', 'land', 'commercial', 'other')),
  status text not null default 'onboarding' check (status in ('onboarding', 'active', 'paused', 'ended')),
  services text[] not null default '{}',
  currency text not null default 'ETB' check (currency in ('ETB', 'GBP', 'USD', 'EUR', 'CAD', 'AED', 'SEK', 'NOK', 'SAR', 'ILS', 'ZAR', 'KES')),
  monthly_fee_minor bigint check (monthly_fee_minor >= 0),
  start_date date,
  notes text check (char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index managed_properties_status_idx on public.managed_properties (status);
create trigger set_updated_at before update on public.managed_properties for each row execute function public.set_updated_at();

create table public.property_inspections (
  id uuid primary key default gen_random_uuid(),
  managed_property_id uuid not null references public.managed_properties (id) on delete cascade,
  inspected_on date not null,
  inspector text check (char_length(inspector) <= 120),
  condition text not null check (condition in ('good', 'fair', 'needs_attention', 'urgent')),
  notes text check (char_length(notes) <= 4000),
  photo_paths text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index property_inspections_property_idx on public.property_inspections (managed_property_id, inspected_on desc);

create table public.rent_statements (
  id uuid primary key default gen_random_uuid(),
  managed_property_id uuid not null references public.managed_properties (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  currency text not null default 'ETB' check (currency in ('ETB', 'GBP', 'USD', 'EUR', 'CAD', 'AED', 'SEK', 'NOK', 'SAR', 'ILS', 'ZAR', 'KES')),
  rent_due_minor bigint not null default 0 check (rent_due_minor >= 0),
  rent_received_minor bigint not null default 0 check (rent_received_minor >= 0),
  expenses_minor bigint not null default 0 check (expenses_minor >= 0),
  fees_minor bigint not null default 0 check (fees_minor >= 0),
  notes text check (char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  constraint rent_statements_period check (period_end >= period_start)
);
create index rent_statements_property_idx on public.rent_statements (managed_property_id, period_start desc);

create table public.maintenance_log (
  id uuid primary key default gen_random_uuid(),
  managed_property_id uuid not null references public.managed_properties (id) on delete cascade,
  logged_on date not null,
  title text not null check (char_length(title) between 2 and 160),
  description text check (char_length(description) <= 2000),
  status text not null default 'done' check (status in ('planned', 'in_progress', 'done')),
  currency text not null default 'ETB' check (currency in ('ETB', 'GBP', 'USD', 'EUR', 'CAD', 'AED', 'SEK', 'NOK', 'SAR', 'ILS', 'ZAR', 'KES')),
  cost_minor bigint check (cost_minor >= 0),
  service_request_id uuid references public.service_requests (id) on delete set null,
  created_at timestamptz not null default now()
);
create index maintenance_log_property_idx on public.maintenance_log (managed_property_id, logged_on desc);

-- HagerLand staff only. The owner portal (Phase 2) will add owner read policies when it is switched on.
alter table public.property_care_requests enable row level security;
alter table public.managed_properties enable row level security;
alter table public.property_inspections enable row level security;
alter table public.rent_statements enable row level security;
alter table public.maintenance_log enable row level security;
revoke all on table public.property_care_requests, public.managed_properties, public.property_inspections, public.rent_statements, public.maintenance_log
  from public, anon, authenticated;

-- Property Care prices are shown only if AB sets them (spec 24.6).
insert into public.site_settings (key, value) values ('property_care_pricing', '""') on conflict (key) do nothing;

create or replace view public.site_settings_public with (security_barrier = true) as
select s.key, s.value
from public.site_settings s
where s.key in (
  'contact_details', 'social_links', 'announcement_bar', 'homepage_featured_ids',
  'listing_expiry_days', 'min_results_for_index', 'private_owner_max_active_listings',
  'verified_business_count_min', 'quote_response_target', 'legal_last_updated',
  'legal_entity', 'free_listing_confirmed', 'developments_claims', 'delivery_area',
  'property_care_pricing'
);
comment on view public.site_settings_public is
  'Bypasses RLS on purpose (owned by postgres): exposes only a whitelist of public settings.';
revoke all on public.site_settings_public from public, anon, authenticated;
grant select on public.site_settings_public to anon, authenticated;

insert into public.schema_migrations (version, name) values ('0016', 'property_care') on conflict (version) do nothing;
