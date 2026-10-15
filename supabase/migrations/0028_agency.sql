-- 0028 · HagerLand estate agency operations and the rent & let lifecycle (spec 26.5, 26.6).
-- Additive only: new tables, functions and settings, plus two wider check lists on the deals ledger (new source types).
-- Every new table is HagerLand staff only (service role); customers see their own records through server pages that
-- filter by the signed-in user. No legacy table or data is touched.

-- ---------------------------------------------------------------------------
-- Contacts register: vendors, landlords, buyers and tenants, with marketing consent records
-- ---------------------------------------------------------------------------
create table public.agency_contacts (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.next_reference('HLAC'),
  roles text[] not null default '{}' check (roles <@ array['vendor', 'landlord', 'buyer', 'tenant']::text[]),
  name text not null check (char_length(name) between 2 and 120),
  email text check (char_length(email) <= 254),
  phone text check (char_length(phone) <= 32),
  country_code text not null default 'ET' check (country_code ~ '^[A-Z]{2}$'),
  time_zone text check (char_length(time_zone) <= 60),
  user_id uuid references auth.users (id) on delete set null,
  marketing_consent boolean not null default false,
  consent_at timestamptz,
  consent_source text check (char_length(consent_source) <= 120),
  assigned_agent text check (char_length(assigned_agent) <= 120),
  notes text check (char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agency_contacts_reachable check (email is not null or phone is not null),
  constraint agency_contacts_consent_dated check (not marketing_consent or consent_at is not null)
);
create index agency_contacts_email_idx on public.agency_contacts (lower(email));
create index agency_contacts_user_idx on public.agency_contacts (user_id);
create index agency_contacts_roles_idx on public.agency_contacts using gin (roles);
create trigger set_updated_at before update on public.agency_contacts for each row execute function public.set_updated_at();

-- Applicant requirements (what a buyer or tenant is looking for), matched to live listings.
create table public.applicant_requirements (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.agency_contacts (id) on delete cascade,
  purpose public.listing_purpose not null,
  budget_min_etb bigint check (budget_min_etb >= 0),
  budget_max_etb bigint check (budget_max_etb >= 0),
  location_ids uuid[] not null default '{}',
  property_types public.property_type[] not null default '{}',
  beds_min smallint check (beds_min between 0 and 20),
  notes text check (char_length(notes) <= 2000),
  is_active boolean not null default true,
  last_emailed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint applicant_requirements_budget check (budget_min_etb is null or budget_max_etb is null or budget_max_etb >= budget_min_etb)
);
create index applicant_requirements_contact_idx on public.applicant_requirements (contact_id);
create index applicant_requirements_active_idx on public.applicant_requirements (purpose) where is_active;
create trigger set_updated_at before update on public.applicant_requirements for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Instructions pipeline (spec 26.5)
-- ---------------------------------------------------------------------------
create table public.agency_instructions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.next_reference('HLAI'),
  contact_id uuid references public.agency_contacts (id) on delete set null,
  purpose public.listing_purpose not null,
  title text not null check (char_length(title) between 3 and 160),
  location_id uuid references public.locations (id),
  address_line text check (char_length(address_line) <= 300),
  property_type public.property_type,
  stage text not null default 'lead' check (stage in ('lead', 'valuation_booked', 'valued', 'instructed', 'live', 'under_offer', 'let_agreed', 'completed', 'withdrawn', 'expired')),
  fee_type text check (fee_type in ('percent', 'fixed')),
  fee_percent numeric(5, 2) check (fee_percent between 0 and 100),
  fee_amount_etb bigint check (fee_amount_etb >= 0),
  agency_type text check (agency_type in ('sole', 'multi')),
  term_start date,
  term_end date,
  agreement_path text,
  asking_price_etb bigint check (asking_price_etb >= 0),
  property_id uuid references public.properties (id) on delete set null,
  assigned_agent text check (char_length(assigned_agent) <= 120),
  source text not null default 'manual' check (source in ('valuation_request', 'enquiry', 'manual')),
  live_at timestamptz,
  completed_at timestamptz,
  final_price_etb bigint check (final_price_etb >= 0),
  deal_id uuid references public.deals (id) on delete set null,
  notes text check (char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agency_instructions_term check (term_end is null or term_start is null or term_end >= term_start),
  constraint agency_instructions_fee check (fee_type is null or (fee_type = 'percent' and fee_percent is not null) or (fee_type = 'fixed' and fee_amount_etb is not null)),
  -- "Instructed" and later need the written terms (spec 26.5).
  constraint agency_instructions_terms_before_live check (
    stage in ('lead', 'valuation_booked', 'valued', 'withdrawn', 'expired') or (fee_type is not null and agency_type is not null and term_start is not null)
  )
);
create index agency_instructions_stage_idx on public.agency_instructions (stage, updated_at desc);
create index agency_instructions_property_idx on public.agency_instructions (property_id);
create index agency_instructions_contact_idx on public.agency_instructions (contact_id);
create trigger set_updated_at before update on public.agency_instructions for each row execute function public.set_updated_at();

-- A live instruction's listing is marketed by HagerLand (lister_type 'hagerland', spec 26.5).
create function public.agency_instruction_marks_listing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.property_id is not null and new.stage in ('live', 'under_offer', 'let_agreed')
     and (tg_op = 'INSERT' or new.property_id is distinct from old.property_id or new.stage is distinct from old.stage) then
    update public.properties set lister_type = 'hagerland' where id = new.property_id and lister_type is distinct from 'hagerland';
  end if;
  if new.stage = 'live' and new.live_at is null then
    new.live_at := now();
  end if;
  if new.stage = 'completed' and new.completed_at is null then
    new.completed_at := now();
  end if;
  return new;
end
$$;
create trigger agency_instruction_marks_listing before insert or update on public.agency_instructions
  for each row execute function public.agency_instruction_marks_listing();

-- ---------------------------------------------------------------------------
-- Valuations, viewings and offers
-- ---------------------------------------------------------------------------
create table public.agency_valuations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.next_reference('HLVA'),
  instruction_id uuid references public.agency_instructions (id) on delete set null,
  contact_id uuid references public.agency_contacts (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  purpose public.listing_purpose not null,
  property_type public.property_type,
  location_id uuid references public.locations (id),
  address_line text check (char_length(address_line) <= 300),
  details text check (char_length(details) <= 2000),
  preferred_times text check (char_length(preferred_times) <= 300),
  time_zone text check (char_length(time_zone) <= 60),
  status text not null default 'requested' check (status in ('requested', 'booked', 'completed', 'cancelled')),
  appointment_at timestamptz,
  assigned_agent text check (char_length(assigned_agent) <= 120),
  value_low_etb bigint check (value_low_etb >= 0),
  value_high_etb bigint check (value_high_etb >= 0),
  notes text check (char_length(notes) <= 4000),
  report_path text,
  outcome text not null default 'pending' check (outcome in ('pending', 'instructed', 'not_instructed', 'no_show', 'cancelled')),
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agency_valuations_range check (value_low_etb is null or value_high_etb is null or value_high_etb >= value_low_etb)
);
create index agency_valuations_status_idx on public.agency_valuations (status, created_at desc);
create index agency_valuations_user_idx on public.agency_valuations (user_id);
create index agency_valuations_instruction_idx on public.agency_valuations (instruction_id);
create trigger set_updated_at before update on public.agency_valuations for each row execute function public.set_updated_at();

create table public.agency_viewings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.next_reference('HLVW'),
  property_id uuid not null references public.properties (id) on delete cascade,
  instruction_id uuid references public.agency_instructions (id) on delete set null,
  contact_id uuid references public.agency_contacts (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  email text check (char_length(email) <= 254),
  phone text not null check (char_length(phone) <= 32),
  mode text not null check (mode in ('in_person', 'video')),
  preferred_times text check (char_length(preferred_times) <= 300),
  time_zone text check (char_length(time_zone) <= 60),
  message text check (char_length(message) <= 2000),
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'completed', 'cancelled', 'no_show')),
  scheduled_at timestamptz,
  assigned_agent text check (char_length(assigned_agent) <= 120),
  video_link text check (video_link ~* '^https://' and char_length(video_link) <= 500),
  feedback text check (char_length(feedback) <= 2000),
  confirmed_at timestamptz,
  reminder_sent_at timestamptz,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agency_viewings_confirmed check (status <> 'confirmed' or scheduled_at is not null)
);
create index agency_viewings_status_idx on public.agency_viewings (status, scheduled_at);
create index agency_viewings_property_idx on public.agency_viewings (property_id);
create index agency_viewings_user_idx on public.agency_viewings (user_id);
create index agency_viewings_reminder_idx on public.agency_viewings (scheduled_at) where status = 'confirmed' and reminder_sent_at is null;
create trigger set_updated_at before update on public.agency_viewings for each row execute function public.set_updated_at();

create table public.agency_offers (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.next_reference('HLOF'),
  property_id uuid not null references public.properties (id) on delete cascade,
  instruction_id uuid references public.agency_instructions (id) on delete set null,
  contact_id uuid references public.agency_contacts (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  email text check (char_length(email) <= 254),
  phone text not null check (char_length(phone) <= 32),
  amount_etb bigint not null check (amount_etb > 0),
  conditions text check (char_length(conditions) <= 2000),
  funding_note text check (char_length(funding_note) <= 1000),
  status text not null default 'submitted' check (status in ('submitted', 'countered', 'accepted', 'rejected', 'withdrawn')),
  counter_amount_etb bigint check (counter_amount_etb > 0),
  vendor_decision text check (char_length(vendor_decision) <= 2000),
  decided_at timestamptz,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agency_offers_counter check (status <> 'countered' or counter_amount_etb is not null)
);
create index agency_offers_status_idx on public.agency_offers (status, created_at desc);
create index agency_offers_property_idx on public.agency_offers (property_id);
create index agency_offers_user_idx on public.agency_offers (user_id);
create trigger set_updated_at before update on public.agency_offers for each row execute function public.set_updated_at();

-- Sale progression after an accepted offer (default items editable in admin → Settings, no legal assertions).
create table public.sale_progress_items (
  id uuid primary key default gen_random_uuid(),
  instruction_id uuid not null references public.agency_instructions (id) on delete cascade,
  offer_id uuid references public.agency_offers (id) on delete set null,
  label text not null check (char_length(label) between 2 and 200),
  sort int not null default 0,
  done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index sale_progress_items_instruction_idx on public.sale_progress_items (instruction_id, sort);

-- ---------------------------------------------------------------------------
-- Lettings: rental applications and tenancies (spec 26.5, 26.6)
-- ---------------------------------------------------------------------------
create table public.rental_applications (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.next_reference('HLRA'),
  property_id uuid not null references public.properties (id) on delete cascade,
  instruction_id uuid references public.agency_instructions (id) on delete set null,
  contact_id uuid references public.agency_contacts (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  email text check (char_length(email) <= 254),
  phone text not null check (char_length(phone) <= 32),
  move_in_date date,
  occupants smallint check (occupants between 1 and 30),
  employment_note text check (char_length(employment_note) <= 1000),
  income_note text check (char_length(income_note) <= 1000),
  message text check (char_length(message) <= 2000),
  document_paths text[] not null default '{}',
  referencing_notes text check (char_length(referencing_notes) <= 4000),
  status text not null default 'submitted' check (status in ('submitted', 'referencing', 'approved', 'rejected', 'withdrawn')),
  decided_at timestamptz,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rental_applications_docs check (cardinality(document_paths) <= 5)
);
create index rental_applications_status_idx on public.rental_applications (status, created_at desc);
create index rental_applications_property_idx on public.rental_applications (property_id);
create index rental_applications_user_idx on public.rental_applications (user_id);
create trigger set_updated_at before update on public.rental_applications for each row execute function public.set_updated_at();

create table public.tenancies (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.next_reference('HLTN'),
  property_id uuid references public.properties (id) on delete set null,
  instruction_id uuid references public.agency_instructions (id) on delete set null,
  application_id uuid references public.rental_applications (id) on delete set null,
  managed_property_id uuid references public.managed_properties (id) on delete set null,
  landlord_contact_id uuid references public.agency_contacts (id) on delete set null,
  tenant_contact_id uuid references public.agency_contacts (id) on delete set null,
  tenant_user_id uuid references auth.users (id) on delete set null,
  title text not null check (char_length(title) between 2 and 160),
  tenant_names text not null check (char_length(tenant_names) between 2 and 300),
  start_date date not null,
  end_date date,
  currency text not null default 'ETB' check (currency in ('ETB', 'GBP', 'USD', 'EUR', 'CAD', 'AED', 'SEK', 'NOK', 'SAR', 'ILS', 'ZAR', 'KES')),
  rent_minor bigint not null check (rent_minor >= 0),
  rent_period text not null default 'month' check (rent_period in ('month', 'year')),
  advance_months smallint check (advance_months between 0 and 24),
  deposit_minor bigint check (deposit_minor >= 0),
  renewal_date date,
  notice_date date,
  status text not null default 'active' check (status in ('active', 'ending', 'ended', 'renewed')),
  renewal_reminded_at timestamptz,
  notice_reminded_at timestamptz,
  notes text check (char_length(notes) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tenancies_dates check (end_date is null or end_date >= start_date)
);
create index tenancies_status_idx on public.tenancies (status, start_date desc);
create index tenancies_tenant_idx on public.tenancies (tenant_user_id);
create index tenancies_managed_idx on public.tenancies (managed_property_id);
create index tenancies_renewal_idx on public.tenancies (renewal_date) where status = 'active' and renewal_reminded_at is null;
create index tenancies_notice_idx on public.tenancies (notice_date) where status = 'active' and notice_reminded_at is null;
create trigger set_updated_at before update on public.tenancies for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Tasks, activity timeline and private documents for any agency record
-- ---------------------------------------------------------------------------
create table public.agency_tasks (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('contact', 'instruction', 'valuation', 'viewing', 'offer', 'application', 'tenancy')),
  entity_id uuid not null,
  title text not null check (char_length(title) between 2 and 200),
  due_on date,
  assigned_to text check (char_length(assigned_to) <= 120),
  done boolean not null default false,
  done_at timestamptz,
  created_by text not null default 'admin' check (char_length(created_by) <= 80),
  created_at timestamptz not null default now()
);
create index agency_tasks_entity_idx on public.agency_tasks (entity_type, entity_id);
create index agency_tasks_due_idx on public.agency_tasks (due_on) where not done;

create table public.agency_activity (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('contact', 'instruction', 'valuation', 'viewing', 'offer', 'application', 'tenancy')),
  entity_id uuid not null,
  kind text not null check (kind in ('created', 'status', 'note', 'email', 'document', 'task', 'link')),
  text text not null check (char_length(text) between 1 and 2000),
  actor text not null default 'admin' check (char_length(actor) <= 80),
  created_at timestamptz not null default now()
);
create index agency_activity_entity_idx on public.agency_activity (entity_type, entity_id, created_at desc);

create table public.agency_documents (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('contact', 'instruction', 'valuation', 'viewing', 'offer', 'application', 'tenancy')),
  entity_id uuid not null,
  label text not null check (char_length(label) between 2 and 160),
  storage_path text not null,
  uploaded_by text not null default 'admin' check (char_length(uploaded_by) <= 80),
  created_at timestamptz not null default now()
);
create index agency_documents_entity_idx on public.agency_documents (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Matching: live listings that fit an applicant's requirements (staff only)
-- ---------------------------------------------------------------------------
create function public.agency_requirement_matches(p_requirement uuid, p_limit int default 10)
returns table (id uuid, slug text, title text, price_etb bigint, bedrooms smallint, published_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.slug, p.title, p.price_etb, p.bedrooms, p.published_at
  from public.applicant_requirements r
  join public.properties p on p.purpose = r.purpose
  where r.id = p_requirement
    and p.status = 'published' and (p.expires_at is null or p.expires_at > now())
    and (r.budget_min_etb is null or p.price_etb is null or p.price_etb >= r.budget_min_etb)
    and (r.budget_max_etb is null or p.price_etb is null or p.price_etb <= r.budget_max_etb)
    and (r.beds_min is null or coalesce(p.bedrooms, 0) >= r.beds_min)
    and (cardinality(r.property_types) = 0 or p.property_type = any (r.property_types))
    and (cardinality(r.location_ids) = 0 or exists (
      select 1 from unnest(r.location_ids) l where p.location_id in (select public.locations_descendants(l))
    ))
  order by p.published_at desc
  limit least(greatest(p_limit, 1), 50)
$$;
revoke all on function public.agency_requirement_matches(uuid, int) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Deals ledger: agency completions and letting fees (spec 26.5), with the pillar for revenue per pillar (26.14)
-- ---------------------------------------------------------------------------
alter table public.deals drop constraint deals_source_type_check;
alter table public.deals add constraint deals_source_type_check
  check (source_type in ('enquiry', 'service_request', 'quote_request', 'property_care', 'manual', 'agency_instruction', 'tenancy'));
alter table public.deals add column pillar_key text references public.pillars (key) on update cascade;
update public.deals d set pillar_key = case d.source_type
  when 'service_request' then (select public.vertical_pillar(r.vertical_key) from public.service_requests r where r.id = d.source_id)
  when 'quote_request' then 'supplies'
  when 'property_care' then 'manage'
  else null end
where d.pillar_key is null;
create index deals_pillar_idx on public.deals (pillar_key, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security: staff only (service role). Customers see their own records through server pages.
-- ---------------------------------------------------------------------------
alter table public.agency_contacts enable row level security;
alter table public.applicant_requirements enable row level security;
alter table public.agency_instructions enable row level security;
alter table public.agency_valuations enable row level security;
alter table public.agency_viewings enable row level security;
alter table public.agency_offers enable row level security;
alter table public.sale_progress_items enable row level security;
alter table public.rental_applications enable row level security;
alter table public.tenancies enable row level security;
alter table public.agency_tasks enable row level security;
alter table public.agency_activity enable row level security;
alter table public.agency_documents enable row level security;
revoke all on table public.agency_contacts, public.applicant_requirements, public.agency_instructions, public.agency_valuations,
  public.agency_viewings, public.agency_offers, public.sale_progress_items, public.rental_applications, public.tenancies,
  public.agency_tasks, public.agency_activity, public.agency_documents
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Settings (admin-editable): sale progression defaults and the rent-ready checklist. Plain steps, no legal assertions.
-- ---------------------------------------------------------------------------
insert into public.site_settings (key, value) values
  ('sale_progression_defaults', '["Offer accepted and confirmed in writing to both sides", "Buyer''s funding confirmed", "Seller''s ownership documents (title deed / carta and lease) shared with the buyer''s adviser", "Buyer''s checks of the documents completed", "Sale agreement drafted by the parties'' advisers", "Sale agreement signed", "Payment arrangements agreed", "Transfer registered", "Keys handed over"]'),
  ('rent_ready_checklist', '["Property cleaned throughout", "Repairs finished and tested (water, power, locks, windows)", "Smoke alarm and gas safety checked where fitted", "Inventory with photos prepared", "Keys for every lock ready", "Utility meters read and noted", "Rent, advance months and deposit agreed in writing"]')
on conflict (key) do nothing;

create or replace view public.site_settings_public with (security_barrier = true) as
select s.key, s.value
from public.site_settings s
where s.key in (
  'contact_details', 'social_links', 'announcement_bar', 'homepage_featured_ids',
  'listing_expiry_days', 'min_results_for_index', 'private_owner_max_active_listings',
  'verified_business_count_min', 'quote_response_target', 'legal_last_updated',
  'legal_entity', 'free_listing_confirmed', 'developments_claims', 'delivery_area',
  'property_care_pricing', 'amharic_enabled', 'licences', 'agency_fee_schedule', 'rent_ready_checklist'
);
comment on view public.site_settings_public is
  'Bypasses RLS on purpose (owned by postgres): exposes only a whitelist of public settings.';
revoke all on public.site_settings_public from public, anon, authenticated;
grant select on public.site_settings_public to anon, authenticated;

insert into public.schema_migrations (version, name) values ('0028', 'agency') on conflict (version) do nothing;
