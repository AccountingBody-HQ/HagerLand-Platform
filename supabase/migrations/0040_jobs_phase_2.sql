-- 0040 · Jobs Phase 2 (docs/HAGERLAND_JOBS_BLUEPRINT.md section 9): trades and daily labour, applying by phone without
-- an account, the worker register, the stricter candidate visibility rule (decision 2) and the 12-month deletion of
-- personal details (owner switch, starts on dry run).
--   - job_posts.trade (optional, fixed list) and the job type "daily_labour" (the job type check is dropped and
--     re-added with the extra value; no row changes). jobs_public shows the trade.
--   - job_applications: an application can come by phone, without an account or email. New columns for the channel,
--     how to contact the applicant, language, trade, area, the 18+ and consent times, and when personal details were
--     deleted. Existing rows get channel 'account' (the column default) and nothing else.
--   - worker_register: people who say they are available for work. Server and admin only (no grants).
--   - job_data_cleanup_runs: append-only log of each deletion run (counts and row ids, never personal details).
--   - candidates_for_employers: only verified businesses, or businesses with a job HagerLand approved at some time
--     that HagerLand has not removed.
--   - site_settings (added only if absent): "Apply by phone" off, worker register off, deletion mode dry run. None of
--     these keys is in site_settings_public, so they are never public.
-- Additive: no existing row is deleted or changed (apart from the new column default), no legacy table is touched
-- (the old site's "jobs" table is untouched; jobs live in job_posts). Safe to run again.
begin;

-- ---------------------------------------------------------------------------
-- Trades and daily labour
-- ---------------------------------------------------------------------------
alter table public.job_posts add column if not exists trade text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'job_posts_trade_check' and conrelid = 'public.job_posts'::regclass) then
    alter table public.job_posts add constraint job_posts_trade_check check (trade is null or trade in (
      'mason', 'carpenter', 'steel-fixer', 'electrician', 'plumber', 'painter', 'tiler', 'welder', 'plasterer',
      'aluminium-and-glass-fitter', 'gypsum-ceiling-installer', 'scaffolder', 'labourer', 'foreman', 'site-engineer',
      'quantity-surveyor', 'architect', 'surveyor', 'driver', 'machine-operator', 'security-guard', 'cleaner',
      'store-keeper', 'office-admin', 'sales', 'other'));
  end if;
end
$$;
create index if not exists job_posts_trade_idx on public.job_posts (trade) where trade is not null;

-- The job type check gains "daily_labour" (same name as the check 0019 created, so it is replaced, not duplicated).
alter table public.job_posts drop constraint if exists job_posts_employment_type_check;
alter table public.job_posts add constraint job_posts_employment_type_check
  check (employment_type in ('full_time', 'part_time', 'contract', 'temporary', 'internship', 'apprenticeship', 'daily_labour'));

-- Same view as 0019 with the trade added at the end.
create or replace view public.jobs_public with (security_barrier = true) as
select j.id, j.short_id, j.slug, j.employer_org_id, o.name as employer_name, o.slug as employer_slug, o.logo_path as employer_logo_path,
       o.verification_level as employer_verification, j.title, j.category, j.employment_type, j.location_id, l.display_name as location_display,
       j.country_code, j.currency, j.salary_min_minor, j.salary_max_minor, j.salary_period, j.description, j.requirements, j.closing_date,
       j.published_at, j.expires_at, j.updated_at, j.search_tsv, j.trade
from public.job_posts j
join public.organisations o on o.id = j.employer_org_id and o.status = 'published'
left join public.locations l on l.id = j.location_id
where j.status = 'published' and (j.expires_at is null or j.expires_at > now());

-- ---------------------------------------------------------------------------
-- Applications by phone
-- ---------------------------------------------------------------------------
alter table public.job_applications alter column applicant_user_id drop not null;
alter table public.job_applications alter column email drop not null;
alter table public.job_applications add column if not exists channel text not null default 'account';
alter table public.job_applications add column if not exists preferred_contact text;
alter table public.job_applications add column if not exists language text;
alter table public.job_applications add column if not exists trade text;
alter table public.job_applications add column if not exists area_text text;
alter table public.job_applications add column if not exists adult_confirmed_at timestamptz;
alter table public.job_applications add column if not exists consent_at timestamptz;
alter table public.job_applications add column if not exists personal_data_deleted_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'job_applications_phase2_values' and conrelid = 'public.job_applications'::regclass) then
    alter table public.job_applications add constraint job_applications_phase2_values check (
      channel in ('account', 'phone')
      and (preferred_contact is null or preferred_contact in ('call', 'whatsapp', 'telegram', 'sms'))
      and (language is null or language in ('am', 'om', 'ti', 'en'))
      and (trade is null or trade in (
        'mason', 'carpenter', 'steel-fixer', 'electrician', 'plumber', 'painter', 'tiler', 'welder', 'plasterer',
        'aluminium-and-glass-fitter', 'gypsum-ceiling-installer', 'scaffolder', 'labourer', 'foreman', 'site-engineer',
        'quantity-surveyor', 'architect', 'surveyor', 'driver', 'machine-operator', 'security-guard', 'cleaner',
        'store-keeper', 'office-admin', 'sales', 'other'))
      and (area_text is null or char_length(area_text) <= 200));
  end if;
  -- Until personal details are deleted: a phone application has a phone, the 18+ time and the consent time; an
  -- account application has its account and an email. Deleted rows stay valid.
  if not exists (select 1 from pg_constraint where conname = 'job_applications_phone_needs_details' and conrelid = 'public.job_applications'::regclass) then
    alter table public.job_applications add constraint job_applications_phone_needs_details check (
      channel <> 'phone' or personal_data_deleted_at is not null
      or (phone is not null and adult_confirmed_at is not null and consent_at is not null));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'job_applications_account_needs_details' and conrelid = 'public.job_applications'::regclass) then
    alter table public.job_applications add constraint job_applications_account_needs_details check (
      channel <> 'account' or personal_data_deleted_at is not null
      or (applicant_user_id is not null and email is not null and email <> ''));
  end if;
end
$$;
-- One phone application per job per phone number (while the details are kept).
create unique index if not exists job_applications_phone_once_idx on public.job_applications (job_id, phone)
  where channel = 'phone' and personal_data_deleted_at is null;
create index if not exists job_applications_cleanup_idx on public.job_applications (created_at) where personal_data_deleted_at is null;

-- ---------------------------------------------------------------------------
-- Worker register (server and admin only)
-- ---------------------------------------------------------------------------
create table if not exists public.worker_register (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default public.next_reference('HLW'),
  name text check (char_length(name) between 2 and 120),
  phone text check (char_length(phone) <= 32),
  trades text[] not null default '{}' check (cardinality(trades) <= 26 and trades <@ array[
    'mason', 'carpenter', 'steel-fixer', 'electrician', 'plumber', 'painter', 'tiler', 'welder', 'plasterer',
    'aluminium-and-glass-fitter', 'gypsum-ceiling-installer', 'scaffolder', 'labourer', 'foreman', 'site-engineer',
    'quantity-surveyor', 'architect', 'surveyor', 'driver', 'machine-operator', 'security-guard', 'cleaner',
    'store-keeper', 'office-admin', 'sales', 'other']::text[]),
  area_text text check (char_length(area_text) <= 200),
  availability text check (availability in ('now', 'within_month')),
  preferred_contact text check (preferred_contact in ('call', 'whatsapp', 'telegram', 'sms')),
  language text check (language in ('am', 'om', 'ti', 'en')),
  adult_confirmed_at timestamptz,
  consent_at timestamptz,
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  admin_notes text check (char_length(admin_notes) <= 2000),
  -- When the worker last joined or updated their entry (the 12-month clock); admin changes do not move it.
  last_updated_at timestamptz not null default now(),
  personal_data_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint worker_register_needs_details check (
    personal_data_deleted_at is not null
    or (name is not null and phone is not null and cardinality(trades) >= 1 and area_text is not null
        and availability is not null and preferred_contact is not null and language is not null
        and adult_confirmed_at is not null and consent_at is not null))
);
create unique index if not exists worker_register_phone_idx on public.worker_register (phone) where personal_data_deleted_at is null;
create index if not exists worker_register_cleanup_idx on public.worker_register (last_updated_at) where personal_data_deleted_at is null;
create or replace trigger set_updated_at before update on public.worker_register for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Deletion run log (append-only; counts and row ids only)
-- ---------------------------------------------------------------------------
create table if not exists public.job_data_cleanup_runs (
  id uuid primary key default gen_random_uuid(),
  mode text not null check (mode in ('dry_run', 'live')),
  started_at timestamptz not null,
  finished_at timestamptz not null default now(),
  counts jsonb not null default '{}'::jsonb,
  failures jsonb not null default '[]'::jsonb,
  run_by text not null check (char_length(run_by) <= 120)
);
create index if not exists job_data_cleanup_runs_started_idx on public.job_data_cleanup_runs (started_at desc);
create or replace trigger job_data_cleanup_runs_append_only before update or delete on public.job_data_cleanup_runs
  for each row execute function public.supply_append_only();
create or replace trigger job_data_cleanup_runs_no_truncate before truncate on public.job_data_cleanup_runs
  for each statement execute function public.supply_append_only();

alter table public.worker_register enable row level security;
alter table public.job_data_cleanup_runs enable row level security;
revoke all on public.worker_register, public.job_data_cleanup_runs from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Candidate visibility (decision 2)
-- ---------------------------------------------------------------------------
create or replace view public.candidates_for_employers with (security_barrier = true) as
select c.user_id as candidate_id, split_part(c.full_name, ' ', 1) as first_name, c.headline, c.skills, c.qualifications, c.experience_years,
       c.experience, c.availability, c.country_code, l.display_name as location_display, c.placement_wanted, c.updated_at
from public.candidate_profiles c
left join public.locations l on l.id = c.location_id
where c.visibility = 'employers' and c.availability <> 'not_looking'
  and exists (
    select 1 from public.organisation_members m join public.organisations o on o.id = m.org_id
    where m.user_id = auth.uid() and o.status = 'published'
      and (o.verification_level = 'verified'
           or exists (select 1 from public.job_posts j where j.employer_org_id = o.id and j.published_at is not null and j.status <> 'removed'))
  );
comment on view public.candidates_for_employers is
  'Bypasses RLS on purpose (owned by postgres): only signed-in members of published organisations that are verified, or have a job HagerLand approved and has not removed, see candidates who chose to be visible, without contact details or CVs.';
revoke all on public.candidates_for_employers from public, anon, authenticated;
grant select on public.candidates_for_employers to authenticated;

-- ---------------------------------------------------------------------------
-- Switches (owner only in admin; never public)
-- ---------------------------------------------------------------------------
insert into public.site_settings (key, value) values
  ('jobs_phone_apply', 'false'::jsonb),
  ('jobs_worker_register', 'false'::jsonb),
  ('jobs_data_cleanup_mode', '"dry_run"'::jsonb)
on conflict (key) do nothing;

insert into public.schema_migrations (version, name) values ('0040', 'jobs_phase_2') on conflict (version) do nothing;

commit;
