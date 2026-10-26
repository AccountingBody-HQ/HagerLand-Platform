-- 0042 · Jobs Phase 4: trust (docs/HAGERLAND_JOBS_BLUEPRINT.md section 9; review reports/J4-0 with AB's fixes F1–F8).
--   - employer_verifications: the recorded check behind the "Verified" badge (licence, TIN, phone; who and when; valid
--     for 12 months or until the licence expires). The badge can only be GIVEN with an active record (F2): ordinary
--     edits to an already verified business are never refused, and businesses verified before this migration
--     ("legacy") are left exactly as they are.
--   - org_verification_notices: one row per badge-ending reminder or ending, so each is sent once.
--   - A change of name or trade licence number on a business with an active record marks the record "needs re-check".
--   - Nobody can be added as a member of HagerLand Services (applications to private-client jobs belong to it).
--   - job_reports: "Report this job" (server only).
--   - job_posts gains posted_for (employer or private_client), the desk assignment, who created and who approved a
--     private-client job, and the owner's reason when approving their own (F1). Only the server can set them.
--   - jobs_public: same columns in the same order, plus posted_for at the end. Private-client jobs show the label
--     instead of a business, no link, no logo and no badge, and are hidden while the private-client switch is off.
--   - site_settings (only if absent): private-client jobs off, job reports on, legacy badge clean-up off.
-- Additive: new tables, new columns with defaults, new checks and new triggers beside the existing ones (no existing
-- check, trigger or row is replaced, dropped or changed); the view keeps every column. No legacy table (including the
-- old site's "jobs") is touched. Safe to run again.
begin;

-- ---------------------------------------------------------------------------
-- The recorded verification check
-- ---------------------------------------------------------------------------
create table if not exists public.employer_verifications (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  licence_number text not null check (char_length(licence_number) between 2 and 80),
  licence_expires_on date,
  licence_checked_at timestamptz not null,
  licence_check_method text not null check (licence_check_method in ('document', 'online_register', 'in_person')),
  tin_checked_at timestamptz not null,
  phone_checked_at timestamptz not null,
  phone_check_note text check (char_length(phone_check_note) <= 500),
  site_visit_at timestamptz,
  verified_by text not null check (char_length(verified_by) <= 120),
  verified_at timestamptz not null default now(),
  valid_until date not null,
  status text not null default 'active' check (status in ('active', 'expired', 'revoked', 'needs_recheck')),
  needs_recheck_since timestamptz,
  revoked_at timestamptz,
  revoked_by text check (char_length(revoked_by) <= 120),
  revoked_reason text check (char_length(revoked_reason) <= 500),
  created_at timestamptz not null default now(),
  -- 12 months from the check (Addis Ababa date), or the licence expiry if that is sooner.
  constraint employer_verifications_valid_until check (
    valid_until <= ((verified_at at time zone 'Africa/Addis_Ababa')::date + interval '12 months')::date
    and (licence_expires_on is null or valid_until <= licence_expires_on)),
  constraint employer_verifications_revoked check (
    (status = 'revoked') = (revoked_at is not null)
    and (status <> 'revoked' or (revoked_by is not null and coalesce(btrim(revoked_reason), '') <> ''))),
  constraint employer_verifications_recheck check (status <> 'needs_recheck' or needs_recheck_since is not null)
);
create index if not exists employer_verifications_org_idx on public.employer_verifications (organisation_id, created_at desc);
create index if not exists employer_verifications_due_idx on public.employer_verifications (valid_until) where status in ('active', 'needs_recheck');
-- At most one live record per business.
create unique index if not exists employer_verifications_one_live on public.employer_verifications (organisation_id)
  where status in ('active', 'needs_recheck');

create table if not exists public.org_verification_notices (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations (id),
  kind text not null check (kind in ('ending_reminder', 'ended')),
  for_date date not null,
  verification_id uuid references public.employer_verifications (id),
  sent_at timestamptz not null default now(),
  unique (organisation_id, kind, for_date)
);

-- F2: the badge can only be GIVEN with an active record. Checked only when the level becomes 'verified' (a new
-- business saved as verified, or a change to verified); edits to a business that is already verified are never refused.
create or replace function public.organisations_verified_needs_evidence()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- Signed-in users and visitors can never set the level at all (the existing privileged-column trigger forces
  -- "listed" or refuses); this rule is for the server, which must hold a live record to give the badge.
  if public.is_end_user() then
    return new;
  end if;
  if new.verification_level = 'verified' and (tg_op = 'INSERT' or old.verification_level is distinct from 'verified') then
    if not exists (
      select 1 from public.employer_verifications v
      where v.organisation_id = new.id and v.status in ('active', 'needs_recheck')
        and v.valid_until >= (now() at time zone 'Africa/Addis_Ababa')::date
    ) then
      raise exception 'Record a verification check before giving the Verified badge' using errcode = '23514';
    end if;
  end if;
  return new;
end
$$;
create or replace trigger organisations_verified_needs_evidence before insert or update of verification_level on public.organisations
  for each row execute function public.organisations_verified_needs_evidence();

-- A new name or trade licence number on a business with an active record: the record needs a re-check.
create or replace function public.organisations_verification_recheck()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.name is distinct from old.name or new.trade_licence_number is distinct from old.trade_licence_number then
    update public.employer_verifications set status = 'needs_recheck', needs_recheck_since = now()
    where organisation_id = new.id and status = 'active';
  end if;
  return null;
end
$$;
create or replace trigger organisations_verification_recheck after update of name, trade_licence_number on public.organisations
  for each row execute function public.organisations_verification_recheck();

-- Applications to private-client jobs belong to HagerLand Services: nobody can become a member of it.
create or replace function public.organisation_members_hagerland_services_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.organisations o where o.id = new.org_id and o.slug = 'hagerland-services') then
    raise exception 'HagerLand Services has no members' using errcode = '42501';
  end if;
  return new;
end
$$;
create or replace trigger organisation_members_hagerland_services_guard before insert or update on public.organisation_members
  for each row execute function public.organisation_members_hagerland_services_guard();

-- ---------------------------------------------------------------------------
-- "Report this job"
-- ---------------------------------------------------------------------------
create table if not exists public.job_reports (
  id uuid primary key default gen_random_uuid(),
  job_post_id uuid not null references public.job_posts (id),
  reason text not null check (reason in ('asks_for_money', 'fake_or_scam', 'wrong_or_misleading', 'unfair_or_discriminatory', 'work_outside_ethiopia', 'filled_or_closed', 'something_else')),
  details text check (char_length(details) <= 1000),
  contact text check (char_length(contact) <= 254),
  reporter_user_id uuid references auth.users (id) on delete set null,
  ip_hash text check (char_length(ip_hash) <= 128),
  status text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  outcome text check (outcome in ('no_action', 'paused', 'removed', 'employer_contacted')),
  handled_by text check (char_length(handled_by) <= 120),
  handled_at timestamptz,
  staff_note text check (char_length(staff_note) <= 1000),
  personal_data_deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint job_reports_handled check ((status = 'open') = (handled_at is null))
);
create index if not exists job_reports_job_idx on public.job_reports (job_post_id, created_at desc);
create index if not exists job_reports_status_idx on public.job_reports (status, created_at desc);
create index if not exists job_reports_cleanup_idx on public.job_reports (created_at) where personal_data_deleted_at is null;
-- One open report per job per connection, and per account.
create unique index if not exists job_reports_open_per_ip on public.job_reports (job_post_id, ip_hash) where status = 'open' and ip_hash is not null;
create unique index if not exists job_reports_open_per_user on public.job_reports (job_post_id, reporter_user_id) where status = 'open' and reporter_user_id is not null;

-- ---------------------------------------------------------------------------
-- Private-client jobs
-- ---------------------------------------------------------------------------
alter table public.job_posts add column if not exists posted_for text not null default 'employer';
alter table public.job_posts add column if not exists recruitment_assignment_id uuid references public.recruitment_assignments (id);
alter table public.job_posts add column if not exists created_by_staff text;
alter table public.job_posts add column if not exists approved_by text;
alter table public.job_posts add column if not exists self_approval_reason text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'job_posts_posted_for_rules' and conrelid = 'public.job_posts'::regclass) then
    alter table public.job_posts add constraint job_posts_posted_for_rules check (
      (posted_for = 'employer' and recruitment_assignment_id is null)
      or (posted_for = 'private_client' and recruitment_assignment_id is not null and country_code = 'ET'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'job_posts_staff_fields' and conrelid = 'public.job_posts'::regclass) then
    alter table public.job_posts add constraint job_posts_staff_fields check (
      (created_by_staff is null or char_length(created_by_staff) <= 120)
      and (approved_by is null or char_length(approved_by) <= 120)
      and (self_approval_reason is null or char_length(self_approval_reason) <= 500));
  end if;
  -- F1 four-eyes: the person who created a job cannot approve it, unless a reason is recorded (owner only, on the server).
  if not exists (select 1 from pg_constraint where conname = 'job_posts_four_eyes' and conrelid = 'public.job_posts'::regclass) then
    alter table public.job_posts add constraint job_posts_four_eyes check (
      approved_by is null or approved_by <> created_by_staff or coalesce(btrim(self_approval_reason), '') <> '');
  end if;
end
$$;
create index if not exists job_posts_assignment_idx on public.job_posts (recruitment_assignment_id) where recruitment_assignment_id is not null;

-- Only the server sets the private-client fields; a private-client job belongs to HagerLand's own organisation, to a
-- private-client desk assignment, and shows its place only to city or sub-city level.
create or replace function public.job_posts_private_client_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.is_end_user() then
    if tg_op = 'INSERT' then
      if new.posted_for <> 'employer' or new.recruitment_assignment_id is not null or new.created_by_staff is not null
         or new.approved_by is not null or new.self_approval_reason is not null then
        raise exception 'Only HagerLand can post for a private client' using errcode = '42501';
      end if;
    elsif (new.posted_for, new.recruitment_assignment_id, new.created_by_staff, new.approved_by, new.self_approval_reason)
          is distinct from (old.posted_for, old.recruitment_assignment_id, old.created_by_staff, old.approved_by, old.self_approval_reason) then
      raise exception 'Only HagerLand can change these details' using errcode = '42501';
    end if;
  end if;
  if new.posted_for = 'private_client' then
    if not exists (select 1 from public.organisations o where o.id = new.employer_org_id and o.is_hagerland) then
      raise exception 'A private-client job belongs to HagerLand' using errcode = '23514';
    end if;
    if not exists (select 1 from public.recruitment_assignments a where a.id = new.recruitment_assignment_id and a.private_client) then
      raise exception 'A private-client job needs a private-client desk assignment' using errcode = '23514';
    end if;
    if new.location_id is null or exists (select 1 from public.locations l where l.id = new.location_id and l.level = 'area') then
      raise exception 'A private-client job shows its place to city or sub-city level only' using errcode = '23514';
    end if;
  end if;
  return new;
end
$$;
create or replace trigger job_posts_private_client_guard before insert or update on public.job_posts
  for each row execute function public.job_posts_private_client_guard();

-- Same view as 0040 (every column, name, type and order kept) with posted_for added at the end. Private-client jobs:
-- the label instead of the business, no link, no logo, no badge; hidden while the private-client switch is off.
create or replace view public.jobs_public with (security_barrier = true) as
select j.id, j.short_id, j.slug, j.employer_org_id,
       case when j.posted_for = 'private_client' then 'Posted by HagerLand for a private client' else o.name end as employer_name,
       case when j.posted_for = 'private_client' then null else o.slug end as employer_slug,
       case when j.posted_for = 'private_client' then null else o.logo_path end as employer_logo_path,
       case when j.posted_for = 'private_client' then null else o.verification_level end as employer_verification,
       j.title, j.category, j.employment_type, j.location_id, l.display_name as location_display,
       j.country_code, j.currency, j.salary_min_minor, j.salary_max_minor, j.salary_period, j.description, j.requirements, j.closing_date,
       j.published_at, j.expires_at, j.updated_at, j.search_tsv, j.trade, j.posted_for
from public.job_posts j
join public.organisations o on o.id = j.employer_org_id and o.status = 'published'
left join public.locations l on l.id = j.location_id
where j.status = 'published' and (j.expires_at is null or j.expires_at > now())
  and (j.posted_for = 'employer'
       or exists (select 1 from public.site_settings s where s.key = 'jobs_private_client_posts' and s.value = 'true'::jsonb));

-- ---------------------------------------------------------------------------
-- Server only: no anon or signed-in access at all.
-- ---------------------------------------------------------------------------
alter table public.employer_verifications enable row level security;
alter table public.org_verification_notices enable row level security;
alter table public.job_reports enable row level security;
revoke all on table public.employer_verifications, public.org_verification_notices, public.job_reports from public, anon, authenticated;
revoke all on function public.organisations_verified_needs_evidence(), public.organisations_verification_recheck(),
  public.organisation_members_hagerland_services_guard(), public.job_posts_private_client_guard() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Switches (owner only in admin; never public)
-- ---------------------------------------------------------------------------
insert into public.site_settings (key, value) values
  ('jobs_private_client_posts', 'false'::jsonb),
  ('jobs_reports_enabled', 'true'::jsonb),
  ('org_verification_expiry', 'false'::jsonb)
on conflict (key) do nothing;

insert into public.schema_migrations (version, name) values ('0042', 'jobs_phase_4_trust') on conflict (version) do nothing;

commit;
