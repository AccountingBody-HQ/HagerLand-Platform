-- 0041 · Jobs Phase 3 (docs/HAGERLAND_JOBS_BLUEPRINT.md section 9): HagerLand's recruitment desk.
--   - recruitment_assignments: one per staffing request assigned to HagerLand's own team (work in Ethiopia only).
--   - recruitment_candidates: the shortlist of each assignment. Consent to be introduced to that one employer is
--     recorded by staff (how, when, by whom, which contact details may be shared); a person is introduced only with
--     live consent and a confirmed 18+ (database checks). Consent, a refusal, a withdrawal and an introduction can
--     each be set once and never undone (renewed consent is a new row).
--   - recruitment_events: the desk timeline (references and steps only, never names or phone numbers). Append-only.
--   - recruitment_placements: who was hired, the start date and the replacement guarantee. No money.
--   - recruitment_fee_terms, recruitment_fee_entries: the owner's fee records (fixed amount or percentage; never on
--     a free replacement). Entries are append-only; a mistake is corrected with one reversal.
--   - recruitment-private storage bucket for signed fee agreements (private, no access rules, server only).
--   - site_settings (added only if absent): the recruitment desk switch off, the fee-record keeping period empty
--     (until the lawyer confirms it). Neither key is in site_settings_public.
-- HagerLand only: every new table has row level security on, no grants and no policies (the server reads and writes
-- with the service role). Additive: no existing table is altered and no existing row is changed; no legacy table
-- (including the old site's "jobs") is touched. Safe to run again.
begin;

-- ---------------------------------------------------------------------------
-- Assignments
-- ---------------------------------------------------------------------------
create table if not exists public.recruitment_assignments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.next_reference('HLR'),
  service_request_id uuid not null unique references public.service_requests (id),
  employer_org_id uuid references public.organisations (id),
  private_client boolean not null default false,
  employer_based_abroad boolean,
  employer_country text check (employer_country ~ '^[A-Z]{2}$'),
  roles text check (char_length(roles) <= 2000),
  headcount int check (headcount between 1 and 10000),
  pay_text text check (char_length(pay_text) <= 200),
  start_date date,
  status text not null default 'open' check (status in ('open', 'searching', 'introducing', 'filled', 'closed', 'cancelled')),
  closed_at timestamptz,
  close_reason text check (char_length(close_reason) <= 500),
  notes text check (char_length(notes) <= 2000),
  created_by text not null check (char_length(created_by) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recruitment_assignments_employer check (employer_org_id is not null or private_client),
  constraint recruitment_assignments_closed check ((status in ('filled', 'closed', 'cancelled')) = (closed_at is not null))
);
create index if not exists recruitment_assignments_status_idx on public.recruitment_assignments (status, created_at desc);
create or replace trigger set_updated_at before update on public.recruitment_assignments for each row execute function public.set_updated_at();

-- An assignment is only for a staffing request, and only for work in Ethiopia (overseas placement stays off,
-- Jobs decision 3).
create or replace function public.recruitment_assignment_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_slug text;
  v_country text;
begin
  if tg_op = 'UPDATE' and new.service_request_id is distinct from old.service_request_id then
    raise exception 'An assignment stays linked to its staffing request' using errcode = '23514';
  end if;
  select c.slug, r.country_code into v_slug, v_country
  from public.service_requests r left join public.service_categories c on c.id = r.service_category_id
  where r.id = new.service_request_id;
  if v_slug is distinct from 'staffing' then
    raise exception 'Recruitment assignments are only for staffing requests' using errcode = '23514';
  end if;
  if v_country is distinct from 'ET' then
    raise exception 'The recruitment desk only handles work in Ethiopia' using errcode = '23514';
  end if;
  return new;
end
$$;
create or replace trigger recruitment_assignment_guard before insert or update on public.recruitment_assignments
  for each row execute function public.recruitment_assignment_guard();

-- ---------------------------------------------------------------------------
-- Shortlist, consent and introductions
-- ---------------------------------------------------------------------------
create table if not exists public.recruitment_candidates (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.next_reference('HLRC'),
  assignment_id uuid not null references public.recruitment_assignments (id),
  source text not null check (source in ('application', 'profile', 'register', 'manual')),
  application_id uuid references public.job_applications (id) on delete set null,
  candidate_user_id uuid references public.candidate_profiles (user_id) on delete set null,
  register_id uuid references public.worker_register (id) on delete set null,
  -- An application to a different employer's job: only the reference and trade are kept until this person agrees
  -- to be introduced to this employer (Terms: details are used only for the job applied for).
  other_employer boolean not null default false,
  name text check (char_length(name) between 2 and 120),
  phone text check (char_length(phone) <= 32),
  email text check (char_length(email) <= 254),
  trade text check (trade is null or trade in (
    'mason', 'carpenter', 'steel-fixer', 'electrician', 'plumber', 'painter', 'tiler', 'welder', 'plasterer',
    'aluminium-and-glass-fitter', 'gypsum-ceiling-installer', 'scaffolder', 'labourer', 'foreman', 'site-engineer',
    'quantity-surveyor', 'architect', 'surveyor', 'driver', 'machine-operator', 'security-guard', 'cleaner',
    'store-keeper', 'office-admin', 'sales', 'other')),
  role_text text check (char_length(role_text) <= 120),
  area_text text check (char_length(area_text) <= 200),
  status text not null default 'shortlisted' check (status in ('shortlisted', 'asked', 'agreed', 'declined', 'introduced', 'interviewed', 'hired', 'not_hired', 'withdrawn')),
  asked_at timestamptz,
  -- 18+: carried from the source record's tick ('source_record'), or confirmed by staff on the call.
  adult_confirmed_at timestamptz,
  adult_confirmed_by text check (char_length(adult_confirmed_by) <= 120),
  adult_confirmed_method text check (adult_confirmed_method in ('source_record', 'phone_call', 'in_person', 'whatsapp_message', 'telegram_message', 'email', 'sms_message')),
  consent_at timestamptz,
  consent_method text check (consent_method in ('phone_call', 'in_person', 'whatsapp_message', 'telegram_message', 'email', 'sms_message')),
  consent_recorded_by text check (char_length(consent_recorded_by) <= 120),
  consent_note text check (char_length(consent_note) <= 500),
  share_phone boolean not null default false,
  share_whatsapp boolean not null default false,
  share_telegram boolean not null default false,
  share_sms boolean not null default false,
  share_email boolean not null default false,
  consent_withdrawn_at timestamptz,
  consent_withdrawn_by text check (char_length(consent_withdrawn_by) <= 120),
  declined_at timestamptz,
  introduced_at timestamptz,
  introduced_by text check (char_length(introduced_by) <= 120),
  outcome_at timestamptz,
  notes text check (char_length(notes) <= 1000),
  last_activity_at timestamptz not null default now(),
  personal_data_deleted_at timestamptz,
  created_by text not null check (char_length(created_by) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recruitment_candidates_source_link check (
    (source = 'application' and application_id is not null or source <> 'application' or personal_data_deleted_at is not null)
    and (source <> 'manual' or (application_id is null and candidate_user_id is null and register_id is null))),
  constraint recruitment_candidates_adult_complete check (
    (adult_confirmed_at is null) = (adult_confirmed_method is null) and (adult_confirmed_at is null or adult_confirmed_by is not null)),
  -- Consent names how it was given, who recorded it and at least one way the employer may contact the person.
  constraint recruitment_candidates_consent_complete check (
    consent_at is null
    or (consent_method is not null and consent_recorded_by is not null
        and (share_phone or share_whatsapp or share_telegram or share_sms or share_email))),
  constraint recruitment_candidates_consent_or_declined check (not (consent_at is not null and declined_at is not null)),
  constraint recruitment_candidates_withdrawal_needs_consent check (
    consent_withdrawn_at is null or (consent_at is not null and consent_withdrawn_by is not null)),
  -- Introduced only with consent and 18+ confirmed, never after a refusal, and never after consent was withdrawn.
  constraint recruitment_candidates_introduction_rules check (
    introduced_at is null
    or (consent_at is not null and consent_at <= introduced_at and adult_confirmed_at is not null
        and declined_at is null and introduced_by is not null
        and (consent_withdrawn_at is null or consent_withdrawn_at >= introduced_at)
        and (personal_data_deleted_at is not null or name is not null)))
);
create index if not exists recruitment_candidates_assignment_idx on public.recruitment_candidates (assignment_id, created_at);
create index if not exists recruitment_candidates_cleanup_idx on public.recruitment_candidates (last_activity_at) where personal_data_deleted_at is null;
-- The same person once per assignment while their row is live (after a refusal or withdrawal a new row may be added).
create unique index if not exists recruitment_candidates_application_once on public.recruitment_candidates (assignment_id, application_id)
  where application_id is not null and declined_at is null and consent_withdrawn_at is null;
create unique index if not exists recruitment_candidates_profile_once on public.recruitment_candidates (assignment_id, candidate_user_id)
  where candidate_user_id is not null and declined_at is null and consent_withdrawn_at is null;
create unique index if not exists recruitment_candidates_register_once on public.recruitment_candidates (assignment_id, register_id)
  where register_id is not null and declined_at is null and consent_withdrawn_at is null;
create or replace trigger set_updated_at before update on public.recruitment_candidates for each row execute function public.set_updated_at();

-- Consent, a refusal, a withdrawal and an introduction are set once and never undone or moved; the contact choices
-- are fixed once consent is recorded; nobody is introduced after consent was withdrawn.
create or replace function public.recruitment_candidate_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.consent_at is not null and new.consent_at is distinct from old.consent_at then
    raise exception 'Consent cannot be changed once recorded: record a new consent on a new row' using errcode = '23514';
  end if;
  if old.consent_withdrawn_at is not null and new.consent_withdrawn_at is distinct from old.consent_withdrawn_at then
    raise exception 'A withdrawal of consent cannot be undone' using errcode = '23514';
  end if;
  if old.declined_at is not null and new.declined_at is distinct from old.declined_at then
    raise exception 'A refusal cannot be undone' using errcode = '23514';
  end if;
  if old.introduced_at is not null and new.introduced_at is distinct from old.introduced_at then
    raise exception 'An introduction cannot be undone' using errcode = '23514';
  end if;
  if old.consent_at is not null and (new.share_phone, new.share_whatsapp, new.share_telegram, new.share_sms, new.share_email)
     is distinct from (old.share_phone, old.share_whatsapp, old.share_telegram, old.share_sms, old.share_email) then
    raise exception 'The contact details a person agreed to share cannot be changed: record a new consent on a new row' using errcode = '23514';
  end if;
  if old.introduced_at is null and new.introduced_at is not null and new.consent_withdrawn_at is not null then
    raise exception 'This person withdrew consent and cannot be introduced' using errcode = '23514';
  end if;
  if new.assignment_id is distinct from old.assignment_id then
    raise exception 'A shortlist row stays on its assignment' using errcode = '23514';
  end if;
  return new;
end
$$;
create or replace trigger recruitment_candidate_guard before update on public.recruitment_candidates
  for each row execute function public.recruitment_candidate_guard();

-- ---------------------------------------------------------------------------
-- Timeline (append-only; references and steps only)
-- ---------------------------------------------------------------------------
create table if not exists public.recruitment_events (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.recruitment_assignments (id),
  candidate_id uuid references public.recruitment_candidates (id),
  placement_id uuid,
  step text not null check (step ~ '^[a-z_]{2,60}$'),
  detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object'),
  actor text not null check (char_length(actor) <= 120),
  created_at timestamptz not null default now()
);
create index if not exists recruitment_events_assignment_idx on public.recruitment_events (assignment_id, created_at desc);
create or replace trigger recruitment_events_append_only before update or delete on public.recruitment_events
  for each row execute function public.supply_append_only();
create or replace trigger recruitment_events_no_truncate before truncate on public.recruitment_events
  for each statement execute function public.supply_append_only();

-- ---------------------------------------------------------------------------
-- Placements (no money)
-- ---------------------------------------------------------------------------
create table if not exists public.recruitment_placements (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.next_reference('HLP'),
  candidate_id uuid not null references public.recruitment_candidates (id),
  assignment_id uuid not null references public.recruitment_assignments (id),
  role_type text not null check (role_type in ('trade', 'professional')),
  trade text check (trade is null or trade in (
    'mason', 'carpenter', 'steel-fixer', 'electrician', 'plumber', 'painter', 'tiler', 'welder', 'plasterer',
    'aluminium-and-glass-fitter', 'gypsum-ceiling-installer', 'scaffolder', 'labourer', 'foreman', 'site-engineer',
    'quantity-surveyor', 'architect', 'surveyor', 'driver', 'machine-operator', 'security-guard', 'cleaner',
    'store-keeper', 'office-admin', 'sales', 'other')),
  role_text text check (char_length(role_text) <= 120),
  start_date date not null,
  guarantee_days int not null check (guarantee_days between 0 and 365),
  guarantee_ends_on date generated always as (start_date + guarantee_days) stored,
  replaces_placement_id uuid unique references public.recruitment_placements (id),
  is_free_replacement boolean not null default false,
  status text not null default 'hired' check (status in ('hired', 'guarantee_running', 'completed', 'replaced', 'left_after_guarantee', 'cancelled')),
  ended_on date,
  end_reason text check (end_reason in ('left_by_worker', 'dismissed', 'role_ended', 'did_not_start', 'other')),
  end_note text check (char_length(end_note) <= 500),
  retain_until date,
  created_by text not null check (char_length(created_by) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recruitment_placements_ended check (
    (status in ('replaced', 'left_after_guarantee', 'cancelled')) = (end_reason is not null)
    and (status not in ('replaced', 'left_after_guarantee') or ended_on is not null)),
  constraint recruitment_placements_free_needs_link check (not is_free_replacement or replaces_placement_id is not null)
);
create unique index if not exists recruitment_placements_candidate_once on public.recruitment_placements (candidate_id) where status <> 'cancelled';
create index if not exists recruitment_placements_status_idx on public.recruitment_placements (status, guarantee_ends_on);
create or replace trigger set_updated_at before update on public.recruitment_placements for each row execute function public.set_updated_at();

-- A placement is for an introduced person on the same assignment. "Free replacement" is worked out by the database:
-- it replaces a placement on the same assignment that ended inside its guarantee. The link and the free flag never
-- change afterwards.
create or replace function public.recruitment_placement_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_cand record;
  v_old record;
begin
  if tg_op = 'UPDATE' then
    if new.replaces_placement_id is distinct from old.replaces_placement_id or new.is_free_replacement is distinct from old.is_free_replacement
       or new.candidate_id is distinct from old.candidate_id or new.assignment_id is distinct from old.assignment_id then
      raise exception 'A placement keeps its person, assignment and replacement link' using errcode = '23514';
    end if;
    return new;
  end if;
  select assignment_id, introduced_at into v_cand from public.recruitment_candidates where id = new.candidate_id;
  if v_cand.assignment_id is distinct from new.assignment_id then
    raise exception 'The person must be on this assignment''s shortlist' using errcode = '23514';
  end if;
  if v_cand.introduced_at is null then
    raise exception 'Only a person who was introduced can be placed' using errcode = '23514';
  end if;
  new.is_free_replacement := false;
  if new.replaces_placement_id is not null then
    select assignment_id, status, ended_on, guarantee_ends_on into v_old from public.recruitment_placements where id = new.replaces_placement_id;
    if v_old.assignment_id is distinct from new.assignment_id then
      raise exception 'A replacement is for a placement on the same assignment' using errcode = '23514';
    end if;
    new.is_free_replacement := v_old.status = 'replaced' and v_old.ended_on is not null and v_old.ended_on <= v_old.guarantee_ends_on;
  end if;
  return new;
end
$$;
create or replace trigger recruitment_placement_guard before insert or update on public.recruitment_placements
  for each row execute function public.recruitment_placement_guard();

-- ---------------------------------------------------------------------------
-- Fees (owner only in admin)
-- ---------------------------------------------------------------------------
create table if not exists public.recruitment_fee_terms (
  id uuid primary key default gen_random_uuid(),
  placement_id uuid not null unique references public.recruitment_placements (id),
  fee_type text not null check (fee_type in ('fixed', 'percentage')),
  currency text not null default 'ETB' check (currency in ('ETB', 'GBP', 'USD', 'EUR', 'CAD', 'AED', 'SEK', 'NOK', 'SAR', 'ILS', 'ZAR', 'KES')),
  amount_minor bigint check (amount_minor > 0),
  percent_bps int check (percent_bps between 1 and 10000),
  basis text check (basis in ('first_year_salary', 'first_month_pay', 'other')),
  basis_note text check (char_length(basis_note) <= 300),
  basis_amount_minor bigint check (basis_amount_minor > 0),
  agreed_in_writing_on date,
  document_path text check (char_length(document_path) <= 300),
  status text not null default 'draft' check (status in ('draft', 'agreed', 'invoiced', 'paid', 'waived')),
  waived_reason text check (char_length(waived_reason) <= 500),
  notes text check (char_length(notes) <= 1000),
  created_by text not null check (char_length(created_by) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recruitment_fee_terms_type check (
    (fee_type = 'fixed' and amount_minor is not null and percent_bps is null and basis is null and basis_amount_minor is null)
    or (fee_type = 'percentage' and percent_bps is not null and basis is not null and amount_minor is null)),
  constraint recruitment_fee_terms_basis_note check (basis is distinct from 'other' or basis_note is not null),
  constraint recruitment_fee_terms_agreed check (status not in ('agreed', 'invoiced', 'paid') or agreed_in_writing_on is not null),
  constraint recruitment_fee_terms_waived check ((status = 'waived') = (waived_reason is not null))
);
create or replace trigger set_updated_at before update on public.recruitment_fee_terms for each row execute function public.set_updated_at();

create or replace function public.recruitment_fee_terms_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.recruitment_placements p where p.id = new.placement_id and p.is_free_replacement) then
    raise exception 'A free replacement has no fee' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and new.placement_id is distinct from old.placement_id then
    raise exception 'Fee terms stay on their placement' using errcode = '23514';
  end if;
  return new;
end
$$;
create or replace trigger recruitment_fee_terms_guard before insert or update on public.recruitment_fee_terms
  for each row execute function public.recruitment_fee_terms_guard();

create table if not exists public.recruitment_fee_entries (
  id uuid primary key default gen_random_uuid(),
  fee_terms_id uuid not null references public.recruitment_fee_terms (id),
  entry_type text not null check (entry_type in ('fee_due', 'fee_received', 'waived', 'reversal')),
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency in ('ETB', 'GBP', 'USD', 'EUR', 'CAD', 'AED', 'SEK', 'NOK', 'SAR', 'ILS', 'ZAR', 'KES')),
  occurred_on date not null,
  method text check (method in ('bank_transfer', 'telebirr', 'cbe_birr', 'cash', 'other')),
  reference text check (char_length(reference) <= 120),
  reverses_entry_id uuid unique references public.recruitment_fee_entries (id),
  reason text check (char_length(reason) <= 500),
  note text check (char_length(note) <= 1000),
  created_by text not null check (char_length(created_by) <= 120),
  created_at timestamptz not null default now(),
  constraint recruitment_fee_entries_method check ((entry_type = 'fee_received') = (method is not null)),
  constraint recruitment_fee_entries_reason check (entry_type not in ('waived', 'reversal') or reason is not null),
  constraint recruitment_fee_entries_reversal_link check ((entry_type = 'reversal') = (reverses_entry_id is not null))
);
create index if not exists recruitment_fee_entries_terms_idx on public.recruitment_fee_entries (fee_terms_id, created_at);
create or replace trigger recruitment_fee_entries_append_only before update or delete on public.recruitment_fee_entries
  for each row execute function public.supply_append_only();
create or replace trigger recruitment_fee_entries_no_truncate before truncate on public.recruitment_fee_entries
  for each statement execute function public.supply_append_only();

-- A reversal mirrors the entry it corrects (same fee, amount and currency) and cannot itself be reversed; no entries
-- on a free replacement.
create or replace function public.recruitment_fee_entries_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_orig record;
begin
  if new.entry_type = 'reversal' then
    select fee_terms_id, entry_type, amount_minor, currency into v_orig from public.recruitment_fee_entries where id = new.reverses_entry_id;
    if v_orig.fee_terms_id is distinct from new.fee_terms_id or v_orig.amount_minor is distinct from new.amount_minor or v_orig.currency is distinct from new.currency then
      raise exception 'A reversal must mirror the entry it corrects' using errcode = '23514';
    end if;
    if v_orig.entry_type = 'reversal' then
      raise exception 'A reversal cannot be reversed' using errcode = '23514';
    end if;
  end if;
  return new;
end
$$;
create or replace trigger recruitment_fee_entries_guard before insert on public.recruitment_fee_entries
  for each row execute function public.recruitment_fee_entries_guard();

-- ---------------------------------------------------------------------------
-- Service role only: no anon or signed-in access at all (as 0034–0040).
-- ---------------------------------------------------------------------------
alter table public.recruitment_assignments enable row level security;
alter table public.recruitment_candidates enable row level security;
alter table public.recruitment_events enable row level security;
alter table public.recruitment_placements enable row level security;
alter table public.recruitment_fee_terms enable row level security;
alter table public.recruitment_fee_entries enable row level security;
revoke all on table public.recruitment_assignments, public.recruitment_candidates, public.recruitment_events,
  public.recruitment_placements, public.recruitment_fee_terms, public.recruitment_fee_entries from public, anon, authenticated;
revoke all on function public.recruitment_assignment_guard(), public.recruitment_candidate_guard(), public.recruitment_placement_guard(),
  public.recruitment_fee_terms_guard(), public.recruitment_fee_entries_guard() from public, anon, authenticated;

-- Private files for signed fee agreements: not public, no access policies (service role only), 10 MB, photos (JPEG,
-- PNG, WebP, HEIC) and PDF only. Viewed through links made by the server that expire after 10 minutes.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recruitment-private', 'recruitment-private', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Switches (owner only in admin; never public)
-- ---------------------------------------------------------------------------
insert into public.site_settings (key, value) values
  ('jobs_recruitment_desk', 'false'::jsonb),
  ('jobs_fee_record_retention_months', 'null'::jsonb)
on conflict (key) do nothing;

insert into public.schema_migrations (version, name) values ('0041', 'jobs_phase_3') on conflict (version) do nothing;

commit;
