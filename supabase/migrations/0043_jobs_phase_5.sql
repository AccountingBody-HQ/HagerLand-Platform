-- 0043 · Jobs Phase 5: call-back requests from people hiring, the wrong-number block list, and the switches for
-- Amharic on Jobs pages and for call-backs (both start off).
--   - callback_requests: name, phone, what they need, area, language, time of day, abroad, consent, outcome. Server only.
--     One open request per phone number (database rule).
--   - callback_blocked_phones: a coded (hashed) phone number for 30 days after "wrong number / did not ask". Server only.
--   - site_settings (only if absent): jobs_amharic off, jobs_callbacks off.
--   - site_settings_public: the same view (columns key, value) with ONE more key, jobs_amharic, so the middleware can
--     read it like amharic_enabled. jobs_callbacks is never public.
-- Additive: new tables, settings inserted only if absent and one key added to the public settings list. No existing
-- row is changed; no legacy table (including the old site's "jobs") is touched. Safe to run again.
begin;

create table if not exists public.callback_requests (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.next_reference('HLCB'),
  name text check (char_length(name) between 2 and 120),
  phone text check (char_length(phone) <= 32),
  need text check (char_length(need) <= 500),
  area_text text check (char_length(area_text) <= 200),
  language text check (language in ('am', 'om', 'ti', 'en')),
  time_of_day text check (time_of_day in ('morning', 'afternoon', 'evening', 'any')),
  based_abroad boolean not null default false,
  country_code text check (country_code ~ '^[A-Z]{2}$'),
  consent_at timestamptz,
  ip_hash text check (char_length(ip_hash) <= 128),
  status text not null default 'open' check (status in ('open', 'closed')),
  outcome text check (outcome in ('staffing_request', 'no_action', 'no_answer', 'wrong_number', 'spam')),
  tries int not null default 0 check (tries between 0 and 10),
  service_request_id uuid references public.service_requests (id),
  handled_by text check (char_length(handled_by) <= 120),
  handled_at timestamptz,
  staff_note text check (char_length(staff_note) <= 1000),
  personal_data_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  -- Until the personal details are deleted, a request has the name, phone, need, area, language, time and consent.
  constraint callback_requests_needs_details check (
    personal_data_deleted_at is not null
    or (name is not null and phone is not null and need is not null and area_text is not null and language is not null
        and time_of_day is not null and consent_at is not null)),
  constraint callback_requests_closed check ((status = 'closed') = (outcome is not null)),
  constraint callback_requests_abroad check (based_abroad or country_code is null)
);
-- One open request per phone number.
create unique index if not exists callback_requests_open_per_phone on public.callback_requests (phone) where status = 'open' and phone is not null;
create index if not exists callback_requests_status_idx on public.callback_requests (status, created_at);
create index if not exists callback_requests_phone_idx on public.callback_requests (phone, created_at) where phone is not null;
create index if not exists callback_requests_cleanup_idx on public.callback_requests (created_at) where personal_data_deleted_at is null;

create table if not exists public.callback_blocked_phones (
  phone_hash text primary key check (char_length(phone_hash) between 32 and 128),
  blocked_until timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists callback_blocked_phones_until_idx on public.callback_blocked_phones (blocked_until);

alter table public.callback_requests enable row level security;
alter table public.callback_blocked_phones enable row level security;
revoke all on table public.callback_requests, public.callback_blocked_phones from public, anon, authenticated;

insert into public.site_settings (key, value) values
  ('jobs_amharic', 'false'::jsonb),
  ('jobs_callbacks', 'false'::jsonb)
on conflict (key) do nothing;

-- Same view as 0028 (columns key, value), with jobs_amharic added to the list.
create or replace view public.site_settings_public with (security_barrier = true) as
select s.key, s.value
from public.site_settings s
where s.key in (
  'contact_details', 'social_links', 'announcement_bar', 'homepage_featured_ids',
  'listing_expiry_days', 'min_results_for_index', 'private_owner_max_active_listings',
  'verified_business_count_min', 'quote_response_target', 'legal_last_updated',
  'legal_entity', 'free_listing_confirmed', 'developments_claims', 'delivery_area',
  'property_care_pricing', 'amharic_enabled', 'licences', 'agency_fee_schedule', 'rent_ready_checklist',
  'jobs_amharic'
);

insert into public.schema_migrations (version, name) values ('0043', 'jobs_phase_5') on conflict (version) do nothing;

commit;
